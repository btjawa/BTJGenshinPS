const { app, globalShortcut, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ini = require('ini');
const util = require('util');
const net = require('net');
const os = require('os');
const StreamZip = require('node-stream-zip');
const axios = require('axios');
const https = require('https');
const http = require('http');
const exec = util.promisify(require('child_process').exec);
const Winreg = require('winreg');
const iconv = require('iconv-lite');
const express = require('express');
const express_app = express();
const packageJson = require('./package.json');
const currentVersion = packageJson.version;
const moment = require('moment-timezone');
const currentMoment = moment().tz("Asia/Shanghai").format('YYYY-MM-DD_HH-mm-ss');
const currentMomentLog = moment().tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm:ss');

global.packagedPaths = {
  dataPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, 'data'),
  gateServerPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, 'GateServer'),
  entryPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, '.'),
  rootPath: app.isPackaged ? path.dirname(path.dirname(app.getAppPath())) : __dirname,
};

const config_version = 1;
const logDirPath = path.join(global.packagedPaths.rootPath, 'logs');
const EXPRESS_PORT = 52805;
const defaultAppConfig = { 
  version: config_version,
  getRes: "proxy",
  game: { path: "", "_3dmigoto": path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe") },
  grasscutter: { port: "22102", host: "127.0.0.1", dispatch: { port: "443", host: "127.0.0.1", ssl: "selfsigned" } },
  proxy: { port: "443", host: "127.0.0.1", ssl: "true" },
  mongodb: { port: "27017" },
  java: { exec: "java" }
}

let win;
let gamePath;
let gamePathDir;
let _3DMigotoPath;
let _3DMigotoPathDir;
let _3DMigotoModsPath;
let patchExists = false;
let action;
let javaPath;
let resURL = new Array(3);
let gcInput = new Array(3);
let proxyInput = new Array(2);
let SSLStatus = true;
let modsList = [];
let proxyPort = 54321;
let gateServerStatus = true;



// LOG MODULE



if (!fs.existsSync(logDirPath)) {
  fs.mkdirSync(logDirPath);
}
fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `[init ${currentMomentLog}] Log initialized\n当遇到错误时，请在 https://github.com/btjawa/BTJGenshinPS/issues 提供本日志并提交。\n\n`);
process.stdout.write = (function(write) {
  return function(string, encoding, fd) {
      write.apply(process.stdout, arguments);
      writeToLog(string, "log");
  };
})(process.stdout.write);
process.stderr.write = (function(write) {
  return function(string, encoding, fd) {
      write.apply(process.stderr, arguments);
      writeToLog(string, "error");
  };
})(process.stderr.write);



// MAIN PROCESS



console.log("Start Logging...")

app.whenReady().then(async () => {
  await init(EXPRESS_PORT);
});

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  console.log('App is quitting...\nSaving config...');
  try {
    const stdout = await exec('tasklist');
    if (!stdout.includes('java.exe')) {
      await fs.promises.unlink(path.join(global.packagedPaths.dataPath, 'run_gc.bat'));
    }
    if (!stdout.includes('mongod.exe')) {
      await fs.promises.unlink(path.join(global.packagedPaths.dataPath, 'run_mongo.bat'));
    }
    if (!stdout.includes('mitmdump.exe')) {
      await fs.promises.unlink(path.join(global.packagedPaths.dataPath, 'run_mitm_proxy.bat'));
    }
    exec(`taskkill /f /im curl.exe`);
    await fs.promises.unlink(path.join(global.packagedPaths.dataPath, 'add_root_crt.bat'));
    await fs.promises.unlink(path.join(global.packagedPaths.dataPath, 'run_3dmigoto.bat'));
  } catch (error) {
    console.error(error);
  }
});



// IPCMAIN PROCESS



ipcMain.on('render-ready', async (event) => {
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
  if (await checkGateServer()) {
    await createMitmCA();
    await rwAppConfig();
    if (!await checkVCRedist()) {
      win.webContents.send('showMessageBox', `info`, `初始化`, `初次使用，请在弹出的窗口中安装必要依赖<br>或手动安装：<br>${path.join(global.packagedPaths.gateServerPath, "MongoDB", "vc_redist.x64.exe")}<br>若显示"修改安装程序"，请点击"修复"`)
      exec(`start "" "${path.join(global.packagedPaths.gateServerPath, "MongoDB", "vc_redist.x64.exe")}"`, { encoding: "binary" }, (error, stdout, stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      })
    }
    exec('tasklist', (error, stdout, stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) }
      if (stdout.includes('java.exe')) {
        packageNec("gc");
      }
      if (stdout.includes('mongod.exe')) {
        packageNec("mongo");
      }
      if (stdout.includes('mitmdump.exe')) {
        packageNec("mitm");
      }
    });
    await rwMods();
    await rwPlugs();
  }
});

ipcMain.on('devtools-opened', () => {
  if (app.isPackaged) {
    win.webContents.closeDevTools();
  }
})
.on('update_latest', (event, gc_org_url) => {
  console.log(`fetched from github api: ${gc_org_url}`);
  update(gc_org_url);
})
.on('handelClose', async (event, gcInputRender, proxyInputRender) => {
  if (gateServerStatus) {
    await rwAppConfig("simple-save", gcInputRender, proxyInputRender);
  }
  app.quit();
})
.on('handelMinimize', () => {
  win.minimize();
})
.on('handelMaximize', () => {
  win.maximize();
})
.on('handelWindow', () => {
  win.restore();
})
.on('open-url', (event, url) => {
  shell.openExternal(url);
})
.on('resGetWayButton_0-set', () => {
  resSetProxy();
})
.on('resGetWayButton_1-set', () => {
  resSetDirect();
})
.on('selfSignedKeystoreBox-set', () => {
  selfSignedKeystore("render");
})
.on('noKeystoreBoxBox-set', () => {
  noKeystore("render");
})
.on('proxyUsingSSLCheckbox_ClickHandler-set-on', () => {
  SSLStatus = true;
  rwAppConfig("ssl-set");
})
.on('proxyUsingSSLCheckbox_ClickHandler-set-off', () => {
  SSLStatus = false;
  rwAppConfig("ssl-set");
});

ipcMain.on('restoreOfficialButton_delete-path', async (event) => {
  if (gamePath) { 
    console.log(path.join(gamePathDir, "version.dll"))
    try {
      await fs.promises.access(path.join(gamePathDir, "version.dll"))
      await fs.promises.unlink(path.join(gamePathDir, "version.dll"));
      patchExists = false;
      event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, "delete_patch_succ");
    } catch(err) {
      if (err.code === "ENOENT") {
        patchExists = false;
        event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, "patch_not_exst");
      } else {
        console.error(err);
      }
    }
  } else {
    patchExists = false;
    event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, "game_patch_undf");
  }
});

ipcMain.on('openLogDirBtn_open-log-dir', () => {
  shell.openPath(logDirPath);
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "logs"))) {
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "logs"))
  } else {
    console.error("Grasscutter logs not found")
  }
})

ipcMain.on('openLogLatestBtn_open-log-latest', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "logs", "latest.log"))) {
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "logs", "latest.log"))
  } else {
    console.error("Grasscutter logs not found")
  }
  const files = fs.readdirSync(logDirPath);
  if (files.length) {
    const sortedFiles = files.map(fileName => {
    const filePath = path.join(logDirPath, fileName);
    return {
        name: fileName,
        time: fs.statSync(filePath).birthtime.getTime()
      };
    })
    .sort((a, b) => b.time - a.time)
    .map(v => v.name);

    const latestLogFile = sortedFiles[0];
    if (latestLogFile) {
      shell.openPath(path.join(logDirPath, latestLogFile));
    } else {
      console.log("Can't find a log file match.");
    }
  } else {
    console.log("No files in directory.");
  }
})

ipcMain.on('modsListOpenSelectBtn-open-select', async (event, mod) => {
  try {
    await fs.promises.access(path.join(_3DMigotoPathDir, _3DMigotoModsPath, mod));
    if (process.platform !== 'darwin') {
      exec(`explorer /select,"${path.join(_3DMigotoPathDir, _3DMigotoModsPath, mod)}"`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) {
          if (!error.message.includes("explorer")) {
            console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
          }
        }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      })
      
    }
  } catch(err) {
    console.error(err);
  }
})

ipcMain.on('modsListDeleteBtn-delete', async (event, mod) => {
  try {
    await fs.promises.access(path.join(_3DMigotoPathDir, _3DMigotoModsPath, mod));
    const moveToTrash = shell.trashItem(path.join(_3DMigotoPathDir, _3DMigotoModsPath, mod));
    if (moveToTrash) {
      console.log(`Moved ${mod} to trash`);
      (async function() {
        while (true) {
          try {
            await fs.promises.access(path.join(_3DMigotoPathDir, _3DMigotoModsPath, mod));
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch(err) {
            await rwMods();
            break;
          }
        }
      })();
    } else {
      throw new Error(`Failed to move ${mod} to trash`);
    }
  } catch(err) {
    console.error(err);
  }
});

ipcMain.on('plugsListDeleteBtn-delete', async (event, plug) => {
  try {
    await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins"));
    const moveToTrash = shell.trashItem(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", plug));
    if (moveToTrash) {
      console.log(`Moved ${plug} to trash`);
      (async function() {
        while (true) {
          try {
            await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", plug));
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch(err) {
            await rwPlugs();
            break;
          }
        }
      })();
    } else {
      throw new Error(`Failed to move ${plug} to trash`);
    }
  } catch(err) {
    console.error(err);
  }
});

ipcMain.on('plugsListOpenSelectBtn-open-select', async (event, plug) => {
  try {
    await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins"));
    if (process.platform !== 'darwin') {
      exec(`explorer /select,"${path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", plug)}"`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) {
          if (!error.message.includes("explorer")) {
            console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
          }
        }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      })
    }
  } catch(err) {
    console.error(err);
  }
})

ipcMain.on('modsDragArea-add-file', async (event, filePaths) => {
  try {
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      if (!fs.statSync(filePath).isDirectory()) {
        console.error(`${filePath} is not a dir`);
        win.webContents.send('modsDragArea-not-folder', fileName);
        continue;
      }
      await fs.promises.access(filePath);
      const destinationPath = path.join(_3DMigotoPathDir, _3DMigotoModsPath, fileName);
      exec(`xcopy "${filePath}" "${destinationPath}" /E /Y /I`, {encoding: "binary"}, async (error, stdout, stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) {
          console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
          console.log(`Copied ${fileName} to Mods`);
          win.webContents.send('modsDragArea-success', fileName);
          await rwMods();
        };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
    }
  } catch(err) {
    console.error(err);
  }
});

ipcMain.on('plugsDragArea-add-file', async (event, filePaths) => {
  try {
    for (const filePath of filePaths) {
      const extension = path.extname(filePath);
      const fileName = path.basename(filePath);
      if (extension !== '.jar') {
        console.error(`${filePath} is not a jar`);
        win.webContents.send('plugsDragArea-not-jar', fileName);
        continue;
      }
      await fs.promises.access(filePath);
      const destinationPath = path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", fileName);
      await fs.promises.copyFile(filePath, destinationPath);
      console.log(`Copied ${fileName} to Plugs`);
      await rwPlugs();
      win.webContents.send('plugsDragArea-success', fileName)
    }
  } catch(err) {
    console.error(err);
  }
});

ipcMain.on('connTestBtn_test-conn', async (event, gcInputRender, proxyInputRender) => {
  console.log("test conn", gcInputRender, proxyInputRender);
  await rwAppConfig("simple-save", gcInputRender, proxyInputRender);
  let token;
  const host = (SSLStatus ? "https://" : "http://") + gcInputRender[0] + ":" + gcInputRender[2] + "/opencommand/api";
  try {
    await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", "opencommand-plugin", "config.json"));
    const OCConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const OCConfig = JSON.parse(OCConfigData);
    token = OCConfig.consoleToken ? OCConfig.consoleToken : "52837291";
  } catch(err) {
    console.error(err);
    token = "52837291";
  }
  console.log(host)
  let data = {
    token: token,
    action: "",
    server: "",
    data: {}
  }
  let reqConfig = {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000
  };
  if (SSLStatus) {
    reqConfig.httpsAgent = new https.Agent({ rejectUnauthorized: false });
  }
  try {
    data.action = "ping";
    const response0 = await axios.post(host, data, reqConfig);
    console.log(response0.data, "\nfinished ping");
    data.action = "online";
    const response1 = await axios.post(host, data, reqConfig);
    console.log(response1.data, "\nfinished get online players");
    if (response1.data.message == "Success") {
      win.webContents.send('showMessageBox', "info", `<i class="fa-solid fa-link"></i>&nbsp;连接成功！`,
      `retcode: ${response1.data.retcode},
      message: '${response1.data.message}'<br>当前在线人数：${response1.data.data.count}<br>
      当前服务端版本：${response0.data.data}`);
    } else {
      win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接成功，但获取失败！`,
      `retcode: ${response1.data.retcode},
      message: '${response1.data.message}'<br>请检查是否更改了opencommand配置！<br><a style="font-size: 16px;">
      ${path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", "opencommand-plugin")}</a>`);
    }
  } catch (err) {
    if (err.code === "ERR_BAD_REQUEST") {
      win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接失败！`,
      `err.code: ${err.code} <br> 请尝试在SSL证书中，选择不使用SSL，并取消勾选代理的使用SSL`);
    } else if (err.code === "ECONNREFUSED") {
      win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接失败！`,
      `err.code: ${err.code} <br> 看起来服务还未启动，或是ip等配置有误！<br> 请检查服务是否已启动、端口是否已开放、IP是否可连接`);
    } else if (err.code === "ECONNABORTED") {
      win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接失败！`,
      `err.code: ${err.code} <br> 连接中断，请检查IP/域名/端口是否合法<br> 或是服务还未启动`);
    } else {
      win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接失败！`,
      `err.code: ${err.code} <br> 未知错误码`);
    }
    console.error(err.code, "\nerr details has been written to log file");
    fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `${err.message}\n${err.stack}\n\n`);
  }
});

ipcMain.on('editAppConfigBtn-edit', async (event) => {
  try {
     await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
     console.log("edit app.config.json");
     shell.openPath(path.join(global.packagedPaths.entryPath, "app.config.json"));
  } catch(err) {
    console.error(err);
  }
})

ipcMain.on('exportAppConfigBtn-export', async (event, gcInputRender, proxyInputRender) => {
  try {
    await rwAppConfig("simple-save", gcInputRender, proxyInputRender);
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const result = await dialog.showOpenDialog({
      title: '请选择配置文件将要导出至的文件夹',
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const exportPath = result.filePaths[0];
        await fs.promises.copyFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 
        path.join(exportPath, `app.config_${moment().tz("Asia/Shanghai").format('YYYY-MM-DD_HH-mm-ss')}.json`));
        console.log("Copied app.config.json to", exportPath);
        win.webContents.send('exportAppConfigBtn-export-success', exportPath);
      } catch(err) {
        console.error(err);
      }
    }
 } catch(err) {
   console.error(err);
 }
})

ipcMain.on('importAppConfigBtn-import', async (event) => {
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const result = await dialog.showOpenDialog({
      title: '请选择后缀为JSON的配置文件',
      filters: [
        { name: 'JSON 源文件', extensions: ['json'] }
      ],
      properties: ['openFile',]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const configPath = result.filePaths[0];
        await fs.promises.copyFile(configPath, path.join(global.packagedPaths.entryPath, "app.config.json"));
        console.log("Imported", configPath);
        win.webContents.send('showMessageBox', "info", `导入应用配置`, `导入成功！将重启应用以应用更改`);
        ipcMain.once('showMessageBox-callback', () => {
          app.relaunch();
          app.exit(0);
        })
      } catch(err) {
        console.error(err);
      }
    }
 } catch(err) {
   console.error(err);
   win.webContents.send('showMessageBox', "warning", `导入应用配置`, `导入失败！`);
 }
})

ipcMain.on('openGcToolsBtn_try-open', async () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"))) {
    console.log("run gctools");
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"));
  } else {
    console.error("GcTools not found, try download");
    win.webContents.send("openGcToolsBtn_starting-download");
    try {
      await downloadFile(`${resURL[0]}/jie65535/GrasscutterCommandGenerator/releases/download/v1.12.2/GcTools-v1.12.2.exe`, path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"), "GcTools v1.12.2");
      win.webContents.send("openGcToolsBtn_download-complete");
      shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"));
      console.log("run gctools");
    } catch (error) {
      console.error(error);
    }
  }
})

ipcMain.on('openCompassBtn_try-open', async () => {
  if (fs.existsSync(path.join(global.packagedPaths.dataPath, "MongoDB Compass"))) {
    console.log("run mongodb compass");
    shell.openPath(path.join(global.packagedPaths.dataPath, "MongoDB Compass", "MongoDBCompass.exe"));
  } else {
    console.error("compass not found, try download");
    win.webContents.send("openCompassBtn_starting-download");
    await fs.promises.mkdir(path.join(global.packagedPaths.dataPath, "MongoDB Compass"));
    try {
      await downloadFile(`https://downloads.mongodb.com/compass/mongodb-compass-1.40.4-win32-x64.zip`, path.join(global.packagedPaths.dataPath, "MongoDB Compass", "MongoDBCompass.zip"), "MongoDB Compass 1.40.4");
      win.webContents.send("openCompassBtn_download-complete");
      await unzipFile(path.join(global.packagedPaths.dataPath, "MongoDB Compass", "MongoDBCompass.zip"), path.join(global.packagedPaths.dataPath, "MongoDB Compass"));
      shell.openPath(path.join(global.packagedPaths.dataPath, "MongoDB Compass", "MongoDBCompass.exe"));
      await fs.promises.unlink(path.join(global.packagedPaths.dataPath, "MongoDB Compass", "MongoDBCompass.zip"))
      console.log("run mongodb compass");
    } catch (error) {
      console.error(error);
    }
  }
})

ipcMain.on('openHandbookTXTBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GM Handbook"))) {
    console.log("open handbook txt");
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GM Handbook", "GM Handbook - CHS.txt"));
  } else {
    console.error("Handbook txt not found");
    win.webContents.send("openHandbookTXTBtn_not-found");
  }
})

ipcMain.on('openHandbookHTMLBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "data", "documentation"))) {
    console.log("open handbook html");
    shell.openExternal(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "data", "documentation", "handbook.html"));
  } else {
    console.error("Handbook html not found");
    win.webContents.send("openHandbookHTMLBtn_not-found");
  }
})

ipcMain.on('chooseJavaPathButton_open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog({
    title: '请定位到jdk文件夹中的bin文件夹',
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      exec(`"${path.join(result.filePaths[0], "java.exe")}" --version`, {encoding: 'binary'}, async (error, stdout, stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        console.log(stdout)
        if (stdout && stdout.includes('Runtime Environment')) {
          javaPath = path.join(result.filePaths[0], "java.exe");
          console.log(javaPath, "\n");
          win.webContents.send('chooseJavaPathButton_was-jdk', javaPath, "init");
          try {
            await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"))
            const AppConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8')
            const AppConfig = JSON.parse(AppConfigData);
            if (javaPath != "") {
              if (AppConfig.java) {
                AppConfig.java.exec = `${javaPath}`;
              } else {
                AppConfig.java = { exec: `${javaPath}` };
              }
            }
            await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(AppConfig, null, 2), 'utf8')
            console.log('app.config.json Updated Successfully');
          } catch(err) {
            console.error(err);
          }
        } else {
          exec(`"${path.join(result.filePaths[0], "java.exe")}" -version`, {encoding: 'binary'}, async (error, stdout, stderr) => {
            if (error) { 
              console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
              win.webContents.send('chooseJavaPathButton_not-valid');
              return; 
            }
            if (stdout && stdout.includes('Runtime Environment')) {
              win.webContents.send('chooseJavaPathButton_was-jre', javaPath, "init");
            } else {
              console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
              win.webContents.send('chooseJavaPathButton_not-valid');
            }
          });
        }
      });
    } catch (err) {
      console.error(err);
      win.webContents.send('chooseJavaPathButton_not-valid');
    }
  }
});


ipcMain.on('choose3DMigotoPathButton_open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog({
    title: '请定位到3DMigoto文件夹并选择exe文件',
    filters: [
      { name: '应用程序', extensions: ['exe'] }
    ],
    properties: ['openFile',]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    _3DMigotoPath = result.filePaths[0];
    _3DMigotoPathDir = path.dirname(_3DMigotoPath);
    try {
      const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
      const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
    } catch (err) {
      if (err.code === "ENOENT") {
        win.webContents.send('showMessageBox', "info", `3DMigoto`, `3DMigoto路径不存在或d3dx.ini不存在！<br>
        请检查是否为 "3DMigoto Loader.exe"！请检查d3dx.ini是否正确配置及存在！`);
        console.error(err);
      }
    }
    if (_3DMigotoConfig.Include.include_recursive) {
      _3DMigotoModsPath = _3DMigotoConfig.Include.include_recursive;
      console.log(path.join(_3DMigotoPathDir, _3DMigotoModsPath));
    }
    console.log(_3DMigotoPath);
    const gamePathFileName = path.basename(_3DMigotoPath);
    if (gamePathFileName === '3DMigoto Loader.exe') {
      try {
        win.webContents.send('choose3DMigotoPathButton_was', _3DMigotoPath, "init");
        fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
        const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
        const appConfig = JSON.parse(appConfigData);
        if (appConfig.game._3dmigoto) {
          appConfig.game._3dmigoto = _3DMigotoPath
        }
        await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
        console.log('app.config.json Updated successfully');
      } catch(err) {
        console.error(err);
      }
    } else {
      win.webContents.send('choose3DMigotoPathButton_file-not-valid');
    }
  }
});

ipcMain.on('chooseGamePathButton_open-file-dialog', async (event) => {
  const result = await dialog.showOpenDialog({
    title: '请定位到游戏文件夹并选择exe文件',
    filters: [
      { name: '应用程序', extensions: ['exe'] }
    ],
    properties: ['openFile',]
  });
  try {
    if (!result.canceled && result.filePaths.length > 0) {
      gamePath = result.filePaths[0];
      gamePathDir = path.dirname(gamePath);
      console.log(gamePath);
      const gamePathFileName = path.basename(gamePath);
      if (gamePathFileName === 'GenshinImpact.exe' || gamePathFileName === 'YuanShen.exe') {
        (async () => {
          await sendPatchGamePath(gamePath, "init");
        })();
      } else {
        event.sender.send('chooseGamePathButton_file-not-valid', gamePath, patchExists, action);
      }
    }
  } catch(err) {
    console.error(err);
  }
});

ipcMain.on('operationBoxBtn_0-run-main-service', async (event, gcInputRender, proxyInputRender, gcSSLStatus) => {
  await checkJava();
  await packageNec();
  run_main_service(gcInputRender, proxyInputRender, gcSSLStatus);
});

ipcMain.on('operationBoxBtn_proxy-run-proxy-service', async (event, gcInputRender, proxyInputRender, gcSSLStatus) => {
  await packageNec("mitm");
  run_proxy_service(gcInputRender, proxyInputRender, gcSSLStatus);
});

ipcMain.on('operationBoxBtn_1-stop-service', async (event) => {
  const processes = ['java.exe', 'mongod.exe', 'mitmdump.exe'];
  const addition = [
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f',
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f',
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "" /f'
  ];
  await killProcesses(processes, addition);
  await packageNec("clear");
  win.webContents.send('operationBoxBtn_1-success');
});

ipcMain.on('operationBoxBtn_2-run-game', (event) => {
  run_game();
});

ipcMain.on('operationBoxBtn_3-run-3dmigoto', (event) => {
  run_3dmigoto();
});

ipcMain.on('clear_data', (event) => {
  win.webContents.send('showMessageBox', "warning", `恢复出厂`, `确定要恢复出厂吗？这将会删除所有的使用痕迹，包括你的游戏数据！！！被删除的数据将无法找回！！！`, ["confirm", "cancel"]);
  ipcMain.once('showMessageBox-callback', async (event, callback) => {
    if (callback === "confirm") {
      win.webContents.send('clearing_data');
      const paths = [
        `${global.packagedPaths.gateServerPath}\\MongoDB\\data\\*`,
        `${global.packagedPaths.entryPath}\\app.config.json`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\plugins\\opencommand-plugin\\data.json`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\GcTools-v1.12.2.exe`
      ];
      const dirs = [
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\GM Handbook`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\cache`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\data\\gacha`,
        `${global.packagedPaths.gateServerPath}\\Grasscutter\\logs`,
        `${global.packagedPaths.dataPath}\\MongoDB Compass`
      ]
      for (const path of paths) {
        exec(`del /s /q "${path}"`, { encoding: 'binary' }, (error, stdout, stderr) => {
          if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
          if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')); }
          if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')); }
        });
      }
      for (const dir of dirs) {
        exec(`rmdir /s /q "${dir}"`, { encoding: 'binary' }, (error, stdout, stderr) => {
          if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
          if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')); }
          if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')); }
        });
      }
      await packageNec("clear");
      win.webContents.send('showMessageBox', "info", `恢复出厂`, `将重启应用以应用更改`);
      ipcMain.once('showMessageBox-callback', () => {
        app.relaunch();
        app.exit(0);
      });
    }
  });  
});



// FUNCTION



function writeToLog(message, type = "log") {
  fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `[${type} ${currentMomentLog}] ${message}\n`);
}

async function init(port) {
  return new Promise(async (resolve, reject) => {
    try {
      const tester = net.createServer()
        .once('error', async (err) => {
          if (err.code === 'EADDRINUSE') {
            const response0 = await dialog.showMessageBox(win, {
              type: "warning",
              title: "端口已被占用",
              message: `${port}端口已被占用！请检查是否启动了多个APP！`
            });
            reject(new Error(`Port ${port} is in use`));
            app.quit();
          } else {
            reject(err);
          }
        })
        .once('listening', () => {
          tester.once('close', async () => {
            await expressServer(port);
            createWindow(port);
            await packageNec("clear");
            exec(`certutil -store Root`, async (error, stdout, stderr) => {
              if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
              if (stdout.includes('6fc55dd6c7a9f76ed1d980dd657fcfe6941228ec')) {
                console.log("Found self-signed root crt");
              } else {
                console.log("Self-signed root crt not found, add root crt");
                await packageNec("init-crt");
                exec(`start ${global.packagedPaths.dataPath}\\add_root_crt.bat`, async (error, stdout, stderr) => {
                  if (error) {
                    console.log(error);
                    return;
                  }
                  if (stdout) {
                    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
                    win.webContents.send("add_crt");
                  };
                  if (stderr) { console.log(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
                });
              }
            });
          }).close();
        })
        .listen(port);
    } catch (err) {
      console.error(err);
    }
  });
}

async function expressServer(port) {
  return new Promise((resolve, reject) => {
    express_app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      const BLACKLIST = [
        /^\/app-main\//,
        /^\/BGP-docs\//
      ]
      const isBlacklisted = BLACKLIST.some(pattern => pattern.test(req.path));
      if (isBlacklisted) {
        if (!req.headers['user-agent'].includes(`${packageJson.name}/${currentVersion}`)) {
          return res.status(403).send(`<body>
          <center><h1>403 Forbidden</h1></center>
          <hr><center>btjawa</center>
          </body>`);
        }
      }
      express_app.get('*', (req, res) => {
        return res.status(404).send(`<body>
        <center><h1>404 Not Found</h1>
        </center>
        <hr><center>btjawa</center>
        </body>`);
      });
      next();
    });
    express_app.use('/BGP-docs', express.static(path.join(__dirname, './dist/docs')));
    express_app.use('/app-main', express.static(path.join(__dirname, './dist')));
    express_app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
        resolve(port);
    });
    express_app.on('error', (error) => {
      reject(error);
    });
  });
};

async function createWindow(port) {
  win = new BrowserWindow({
    width: 1030,
    height: 630,
    title: "BTJGenshinPS",
    icon: "./dist/favicon.ico",
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: !app.isPackaged
    },
  });

  win.loadURL(`http://localhost:${port}/app-main`);

  win.on('maximize', function () {
    win.webContents.send('main-window-max');
  })
  win.on('unmaximize', function () {
    win.webContents.send('main-window-unmax');
  })

  win.on('focus', () => {
    globalShortcut.register('CommandOrControl+Shift+=', () => {});
    globalShortcut.register('CommandOrControl+Shift+-', () => {});
    globalShortcut.register('CommandOrControl+0', () => {});
    globalShortcut.register('F5', () => {});
    globalShortcut.register('F11', () => {});
    globalShortcut.register('CommandOrControl+R', () => {});
    globalShortcut.register('CommandOrControl+W', () => {});
    globalShortcut.register('CommandOrControl+M', () => {});
  });
  win.on('blur', () => {
    globalShortcut.unregisterAll();
  });
}

async function packageNec(action) {
  const gc_batch = `@echo off\r
chcp 65001>nul\r
title Grasscutter - 不要关闭这个窗口\r
echo 不要关闭这个窗口！！！\r
echo.\r
echo 将使用此命令来调用Java： "${javaPath}"\r
echo.\r
\r
cd ${global.packagedPaths.gateServerPath}\\Grasscutter\r
echo 由 github/btjawa 改包\r
echo.\r
echo 在 GM Handbook 目录内查看物品ID及命令。\r
ping>nul\r
echo 初次使用请输入 "account create Name" 来创建账户，其中 Name 可换成你想要的名称。\r
ping>nul\r
echo 游戏内登录时请在 用户名 一栏输入你上一步的账户名称，密码 一栏可以随便输。\r
ping>nul\r
echo 遇到卡草问题时，等半到一分钟/重启游戏大概率可以解决。由于Res仍在Dev，角色死亡无法复活时请重新进入游戏。\r
echo.\r
echo 正在启动Grasscutter服务端...\r
"${javaPath}" -jar grasscutter.jar\r
exit`;

  const mongo_batch = `@echo off\r
chcp 65001>nul\r
title MongoDB - 不要关闭这个窗口\r
echo 不要关闭这个窗口！！！\r
echo.\r
echo 由 github/btjawa 改包\r
echo.\r
echo 正在启动MongoDB数据库...\r
cd "${global.packagedPaths.gateServerPath}\\MongoDB"\r
.\\mongod --dbpath data --port 27017\r
exit`;

  const mitm_proxy_batch = `@echo off\r
chcp 65001>nul\r
title Mitmdump - 不要关闭这个窗口\r
echo 不要关闭这个窗口！！！\r
echo.\r
echo 由 github/btjawa 改包\r
echo.\r
echo 目标服务器：%2:%3\r
echo.\r
echo 使用SSL：${SSLStatus}
echo.\r
IF NOT "%1"=="127.0.0.1" (\r
  IF NOT "%1"=="localhost" (\r
      echo 请在远程服务器上查看Mitm日志！\r
      echo.\r
  )\r
)\r
echo 设置系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "%1:${proxyPort}" /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyOverride /t REG_SZ /d "" /f\r
echo.\r
echo 正在启动Mitm代理...\r
cd "${global.packagedPaths.gateServerPath}\\Proxy"\r
mitmdump -s proxy.py --ssl-insecure --set block_global=false --listen-port ${proxyPort}\r
exit.\r`;

  const add_root_crt_batch =`@echo off\r
chcp 65001>nul\r
%1 start "" mshta vbscript:createobject("shell.application").shellexecute("""%~0""","::",,"runas",1)(window.close)&exit\r
echo 导入根证书...\r
certutil -addstore -f "Root" "${global.packagedPaths.dataPath}\\root.crt"\r
certutil -addstore -f "Root" "%USERPROFILE%\\.mitmproxy\\mitmproxy-ca-cert.cer"\r
exit\r`;

const run_3dmigoto_batch = `@echo off\r
chcp 65001>nul\r
cd ${_3DMigotoPathDir}\r
"3DMigoto Loader.exe"\r
exit`;

  try {
    let files = [];
    switch (action) {
      case "mitm":
        files.push({name: 'run_mitm_proxy.bat', content: mitm_proxy_batch});
        break;
      case "mongo":
        files.push({name: 'run_mongo.bat', content: mongo_batch});
        break;
      case "gc":
        files.push({name: 'run_gc.bat', content: gc_batch});
        break;
      case "init-crt":
        files.push({name: 'add_root_crt.bat', content: add_root_crt_batch});
        break;
      case "3dmigoto":
        files.push({name: 'run_3dmigoto.bat', content: run_3dmigoto_batch});
        break;
      case "clear":
      default:
        files.push(
          {name: 'add_root_crt.bat', content: add_root_crt_batch},
          {name: 'run_gc.bat', content: gc_batch},
          {name: 'run_mongo.bat', content: mongo_batch},
          {name: 'run_mitm_proxy.bat', content: mitm_proxy_batch},
          {name: 'run_3dmigoto.bat', content: run_3dmigoto_batch},
        );
        break;
    }
    for (let file of files) {
      const filePath = path.join(global.packagedPaths.dataPath, file.name);
      if (action === "clear") {
        try {
          await fs.promises.unlink(filePath);
          console.log(`Deleted ${file.name}`);
        } catch (err) {
          err.code === 'ENOENT' ? 
          console.log(`File ${file.name} does not exist, skipping delete`) 
          : console.log(err);
        }
      } else {
        await fs.promises.writeFile(filePath, file.content);
        console.log(`Created ${file.name}`);
      }
    }
  } catch(err) {
    console.error(err);
  }
};

async function createMitmCA () {
  if (fs.existsSync(path.join(process.env.USERPROFILE, '.mitmproxy'))) {
    console.log(path.join(process.env.USERPROFILE, '.mitmproxy'), "exist.")
  } else {
    exec(`start /B ${global.packagedPaths.gateServerPath}\\Proxy\\mitmdump.exe`, { encoding: 'binary' }, (stdout, error,stderr) => {
      if (error) {
        console.log(error);
        return;
      }
      if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stderr) { console.log(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    });
    const checkMitm = setInterval(() => {
      if (fs.existsSync(path.join(process.env.USERPROFILE, '.mitmproxy'))) {
        clearInterval(checkMitm);
        exec('taskkill /f /im mitmdump.exe', { encoding: 'binary' }, (error, stdout, stderr) => {
          if (error) {
            console.log(error);
          } else {
            console.log('Successfully killed mitmdump:', stdout);
          }
        });
      }
    }, 100);
  }
}

async function unzipFile(inputZip, outputDir) {
  return new Promise((resolve, reject) => {
    process.noAsar = true
    const zip = new StreamZip({
      file: inputZip,
      storeEntries: true
    });
    zip.on('error', reject);
    zip.on('ready', () => {
      zip.extract(null, outputDir, (err, count) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Extracted ${count} entries to ${outputDir}`);
          zip.close();
          process.noAsar = false
          resolve();
        }
      });
    });
  });
}

async function checkVCRedist() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64'
    });
    regKey.get('Installed', (err, item) => {
      if (err) {
        resolve(false);
      } else {
        const isInstalled = (item && item.value == "0x1");
        resolve(isInstalled);
      }
    });
  });
}

async function checkGateServer() {
  try {
    await fs.promises.access(global.packagedPaths.gateServerPath);
    let losts = [];
    const paths = [
      path.join(global.packagedPaths.gateServerPath, 'Grasscutter'),
      path.join(global.packagedPaths.gateServerPath, 'MongoDB'),
      path.join(global.packagedPaths.gateServerPath, 'Proxy'),
      path.join(global.packagedPaths.gateServerPath, '3DMigoto')
    ]
    for (let path of paths) {
      try {
        await fs.promises.access(path);
      } catch (err) {
        if (err.code === "ENOENT") {
          losts.push(path);
        } else {
          console.error(err);
        }
      }
    }
    if (losts.length > 0) {
      console.log("missing", losts);
      let message = losts.map(p => {
        let parts = p.split('\\');
        let index = parts.indexOf('resources');
        return parts.slice(index).join('\\');
      }).join('\n');
      if (app.isPackaged) {
        win.webContents.send('showMessageBox', "warning", `GateServer`, `缺少以下组件<br>${message}<br>请从Github下载最新GateServer\n并解压至 resources\\GateServer ！\n应用已进入沙盒模式...`);
      } else {
        win.webContents.send('showMessageBox', "warning", `GateServer`, `缺少以下组件<br>${message}<br>请补全以便能正常package！`);
      }
      win.webContents.send('gateserver_not-exists');
      gateServerStatus = false;
      return false;
    } else {
      gateServerStatus = true;
    return true;
    }

  } catch(err) {
    if (err.code === "ENOENT") {
      console.log("GateServer not found");
      if (app.isPackaged) {
        win.webContents.send('showMessageBox', "warning", `GateServer`, `GateServer不存在！请从Github下载最新GateServer\n并解压至 resources\\GateServer ！\n应用已进入沙盒模式...`);
      } else {
        win.webContents.send('showMessageBox', "warning", `GateServer`, `GateServer不存在！请补全以便能正常package！`);
      }
      win.webContents.send('gateserver_not-exists');
      gateServerStatus = false;
      return false;
    } else {
      gateServerStatus = null;
      console.error(err);
    }
  }
}


async function sendPatchGamePath(gamePath) {
  console.log(gamePath);
  const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8');
  let appConfig = JSON.parse(appConfigData);
  try {
    if (gamePath) {
      fs.copyFileSync(path.join(global.packagedPaths.dataPath, "RSAPatch.dll"), path.join(gamePathDir, "version.dll"));
      console.log("RSA Patched");
      patchExists = true;
      win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
      if (appConfig.game) {
          appConfig.game.path = gamePath;
      } else {
          appConfig.game = { path: gamePath };
      }
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
      console.log('app.config.json Updated Successfully');
    } else if (appConfig.game && appConfig.game.path) {
      patchExists = true;
    }
  } catch(err) {
    console.error(err);
  }
}

async function selfSignedKeystore(action) {
  try { 
    fs.promises.copyFile(path.join(global.packagedPaths.dataPath, "keystore.p12"), path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "keystore.p12"));
    console.log("selfSignedKeystore");
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.grasscutter.dispatch) {
      appConfig.grasscutter.dispatch.ssl = "selfsigned"
    }
    if (action === "render") {
      if (appConfig.proxy) {
        SSLStatus = true;
        appConfig.proxy.ssl = SSLStatus;
        win.webContents.send('ssl_status', SSLStatus);
        await writeAcConfig('ssl-set');
      }
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch(err) {
    console.log(err);
  }
};

async function noKeystore(action) {
  try {
    try {
      await fs.promises.unlink(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "keystore.p12"));
    } catch(err) {
      if(err.code !== 'ENOENT') {
        console.error(err);
      }
    }
    console.log("noKeystore");
    try {
      await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
      const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
      const appConfig = JSON.parse(appConfigData);
      if (appConfig.grasscutter.dispatch) {
        appConfig.grasscutter.dispatch.ssl = "no"
      }
      if (action === "render") {
        if (appConfig.proxy) {
          SSLStatus = false;
          appConfig.proxy.ssl = SSLStatus;
          win.webContents.send('ssl_status', SSLStatus);
          await writeAcConfig('ssl-set');
        }
      }
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
      console.log('app.config.json Updated successfully');
    } catch (err) {
      console.error(err)
    }
  } catch(err) {
    console.log(err);
  }
};

async function resSetProxy () {
  resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top", "https://api-gh-proxy.btl-cdn.top"];
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.getRes) {
      appConfig.getRes = "proxy";
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
    console.log("proxy");
  } catch (err) {
    console.error(err)
  }
}

async function resSetDirect () {
  resURL = ["https://github.com", "https://gitlab.com", "https://api.github.com"];
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.getRes) {
      appConfig.getRes = "direct";
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
    console.log("direct");
  } catch (err) {
    console.error(err)
  }
}

async function killProcesses(processes, addition = []) {
  return new Promise(async (resolve, reject) => {
    try {
      const { stderr, stdout } = await exec('tasklist', { encoding: 'binary' })
      const tasks = iconv.decode(Buffer.from(stdout, 'binary'), 'GBK');
      const tasksToExecute = processes.filter(process => tasks.includes(process)).map(process => `taskkill /f /im ${process}`);
      tasksToExecute.push(...addition);
      if (tasksToExecute.length === 0) {
        resolve();
        return;
      }
      exec(tasksToExecute.join(' & '), { encoding: 'binary' }, (error, stdout, stderr) => {
        if (error) {
          console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
          reject(error);
          return;
        }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')); }
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')); }
        resolve();
      });
    } catch(err) {
      console.error(err);
      reject(err);
    }
  });
}

async function rwAppConfig(action, gcInputRender, proxyInputRender) {
  const actionHandlers = {
    "default": {
      "getRes": async (res) => {
        if (res === "proxy") {
          resSetProxy();
          win.webContents.send('res_getway', "proxy");
        } else if (res === "direct") {
          resSetDirect();
          win.webContents.send('res_getway', "direct");
        }
      },
      "game": async (game) => {
        try {
          await fs.promises.access(game.path);
          gamePath = game.path;
          gamePathDir = path.dirname(gamePath);
          await sendPatchGamePath(gamePath)
        } catch (err) {
          if (err.code === "ENOENT") {
            gamePath = "";
            gamePathDir = "";
          } else { console.error(err); }
        }
        try {
          await fs.promises.access(game._3dmigoto);
          _3DMigotoPath = game._3dmigoto;
          _3DMigotoPathDir = path.dirname(_3DMigotoPath);
          win.webContents.send('choose3DMigotoPathButton_was', _3DMigotoPath);
        } catch (err) {
          if (err.code === "ENOENT") {
            _3DMigotoPath = path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe");
            _3DMigotoPathDir = path.dirname(_3DMigotoPath);
            win.webContents.send('showMessageBox', "info", `3DMigoto`, `3DMigoto路径不存在或d3dx.ini不存在！<br>
            请在设置中点击“选择3DMigoto路径”选择路径！请检查d3dx.ini是否正确配置及存在！`);
          } else { console.error(err); }
        }
      },
      "grasscutter": async (gc) => {
        if (gc.dispatch.ssl == "selfsigned") {
          selfSignedKeystore();
          win.webContents.send('ssl_ver', "selfSignedKeystore");
        }
        else if (gc.dispatch.ssl == "no") {
          noKeystore();
          win.webContents.send('ssl_ver', "noKeystore");
        }
        gc.dispatch.host = "dispatchcnglobal.yuanshen.com";
        gcInput = [gc.host, gc.port, gc.dispatch.port, gc.dispatch.host];
        win.webContents.send('gc_text', gcInput);
      },
      "proxy": async (proxy) => {
        proxyInput = [proxy.host, proxy.port];
        SSLStatus = proxy.ssl;
        win.webContents.send('proxy_text', proxyInput);
        win.webContents.send('ssl_status', SSLStatus);
      }
    },
    "ENOENT": async () => {
      gcInput = ["127.0.0.1", "22102", "443", "127.0.0.1"]
      proxyInput = ["127.0.0.1", "443"];
      SSLStatus = true;
      gamePath = "";
      gamePathDir = "";
      javaPath = "java";
      _3DMigotoPath = path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe");
      _3DMigotoPathDir = path.dirname(_3DMigotoPath);
      win.webContents.send('chooseJavaPathButton_was-jdk', javaPath);
      win.webContents.send('choose3DMigotoPathButton_was', _3DMigotoPath)
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(defaultAppConfig, null, 2), 'utf8');
      console.log('app.config.json Created successfully');
      await resSetProxy();
      await selfSignedKeystore();
    }
  }
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (await checkGateServer()) {
      if (["main-service-save", "simple-save", "proxy-service-save"].includes(action)) { //from user
        appConfig.grasscutter.host = gcInputRender[0];
        appConfig.grasscutter.port = gcInputRender[1];
        appConfig.grasscutter.dispatch.port = gcInputRender[2];
        appConfig.grasscutter.dispatch.host = gcInputRender[3];
        appConfig.proxy.host = proxyInputRender[0];
        appConfig.proxy.port = proxyInputRender[1];
        await writeAcConfig("main-service-save", gcInputRender, proxyInputRender);
      }
      else if (action === "ssl-set") { //set keystore
        appConfig.proxy.ssl = SSLStatus;
        await writeAcConfig("ssl-set");
      }
      else { //read config
        javaPath = appConfig.java.exec;
        win.webContents.send('chooseJavaPathButton_was-jdk', javaPath);
        const keys = ["getRes", "game", "grasscutter", "proxy"];
        for (let key of keys) {
          if (appConfig[key]) {
            await actionHandlers["default"][key](appConfig[key]);
          }
        }
        await writeAcConfig();
      }
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8', async (err) => {
        if (err) { console.error(err); return; }
        console.log('app.config.json Updated successfully');
      });
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      await actionHandlers["ENOENT"]();
    } else {
      console.error(err)
    }
  }
  const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
  const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
  if (_3DMigotoConfig.Include.include_recursive) {
    _3DMigotoModsPath = _3DMigotoConfig.Include.include_recursive;
  }
  console.log(javaPath);
  console.log(path.join(_3DMigotoPathDir, _3DMigotoModsPath));
  console.log(_3DMigotoPath);
}


async function writeAcConfig(action, gcInputRender, proxyInputRender) {
  const proxyText = ["main-service-save", "simple-save", "proxy-service-save"].includes(action) ? proxyInputRender : proxyInput;
  const gcText = ["main-service-save", "simple-save", "proxy-service-save"].includes(action) ? gcInputRender : gcInput;
  try {
    await fs.promises.access(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`);
    const gcConfigData = await fs.promises.readFile(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`, 'utf-8');
    const gcConfig = JSON.parse(gcConfigData);
    await fs.promises.access(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`);
    const mitmConfigData = await fs.promises.readFile(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`);
    let mitmConfig = mitmConfigData.toString('utf-8');
    if (action === "ssl-set") {
      mitmConfig = mitmConfig.replace(/(USE_SSL\s*=\s*)(True|False)/g, (_, p1) => {
        console.log(`\n${p1}${SSLStatus ? 'True' : 'False'}`);
        return `${p1}${SSLStatus ? 'True' : 'False'}`;
      });
    } else {
      if (gcConfig.server.http) {
        gcConfig.server.http.accessAddress = gcText[3];
        console.log("\nhttp.accessAddress " + gcConfig.server.http.accessAddress);
        gcConfig.server.http.bindPort = gcText[2];
        console.log("http.bindPort " + gcConfig.server.http.bindPort);
      }
      if (gcConfig.server.game) {
        gcConfig.server.game.accessAddress = gcText[0];
        console.log("\ngame.accessAddress " + gcConfig.server.game.accessAddress);
        gcConfig.server.game.bindPort = gcText[1];
        console.log("game.bindPort " + gcConfig.server.game.bindPort);
      }
      mitmConfig = mitmConfig.replace(/(REMOTE_HOST\s*=\s*)"([^"]+)"/g, (_, p2) => {
        console.log(`\n${p2}"${proxyText[0]}"`);
        return `${p2}"${proxyText[0]}"`;
      });
      mitmConfig = mitmConfig.replace(/(REMOTE_PORT\s*=\s*)([^"]+)/g, (_, p2) => {
        console.log(`${p2}${proxyText[1]}\n`);
        return `${p2}${proxyText[1]}`;
      });
    }
    if (JSON.stringify(gcConfig, null, 2) !== gcConfigData) {
      await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`, JSON.stringify(gcConfig, null, 2), 'utf8');
      console.log('moded gc config');
    }
    if (mitmConfig !== mitmConfigData) {
      await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`, mitmConfig, 'utf8');
      console.log('moded mitm config');
    }
  } catch (err) {
    console.error(err);
  }
}


async function checkJava() {
  try {
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.java) {
      console.log(appConfig.java.exec)
      javaPath = appConfig.java.exec;
      try {
        const { stdout } = await exec(`"${javaPath}" --version`, { encoding: 'binary' });
        if (stdout.includes('Runtime Environment')) {
          win.webContents.send('jdk-already-installed');
          console.log('JDK from config is valid.');
          return;
        }
      } catch (err) {
        console.log('appConfigured Java path is not valid JDK.');
      }
    }
    const { stdout, stderr } = await exec('java --version', { encoding: 'binary' });
    if (stdout.includes('Runtime Environment')) {
      win.webContents.send('jdk-already-installed');
      console.log('Global JDK is valid.');
      javaPath = 'java';
      appConfig.java = { exec: javaPath };
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    } else {
      throw new Error('Java is not JDK');
    }
  } catch (error) {
    const { stdout } = await exec('java -version', { encoding: 'binary' });
    if (stdout.includes('Runtime Environment')) {
      win.webContents.send('jre-already-installed');
      await downloadJDK();
      return;
    }
    win.webContents.send('download-jdk', 'jdk-false');
    console.log('Java is not installed. Downloading JDK...');
    await downloadJDK();
  }
}

async function downloadJDK() {
  const jdkURL = 'https://repo.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_windows-x64_bin.zip';
  const jdkZipPath = path.join(global.packagedPaths.entryPath, 'jdk-17.0.2.zip');
  try {
    await downloadFile(jdkURL, jdkZipPath, 'Java Development Kit');
    win.webContents.send('download-jdk', 'jdk-true');
    console.log('JDK downloaded successfully.');
    const jdkExtractPath = global.packagedPaths.entryPath;
    const jdkPath = path.join(global.packagedPaths.entryPath, 'jdk-17.0.2');
    await unzipFile(jdkZipPath, jdkExtractPath);
    javaPath = path.join(jdkPath, "bin", "java.exe");
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, 'app.config.json'), 'utf8');
    const appConfig = JSON.parse(appConfigData);
    if (javaPath != "") {
      if (appConfig.java) {
        appConfig.java.exec = `${javaPath}`;
      }
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, 'app.config.json'), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated Successfully');
    await fs.promises.unlink(jdkZipPath, (err) => {
      if (err) {
        console.error(err);
        reject(err);
        return;
      }
      console.log('JDK ZIP file deleted successfully.');
      console.log(jdkZipPath);
    });
  } catch (error) {
    console.error(error);
  }
}


async function getSystemProxy() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    });
    regKey.values((err, items) => {
      if (err) { reject(err); return; }
      let proxyEnable = false;
      let proxyServer = '';
      for (const item of items) {
        if (item.name === 'ProxyEnable') {
          if (item.value == "0x1") {
            proxyEnable = true;
          }
        }
        if (item.name === 'ProxyServer') {
          proxyServer = item.value;
        }
      }
      console.log(proxyEnable);
      console.log(proxyServer);
      resolve(proxyEnable ? proxyServer : null);
    });
  });
};


async function rwMods() {
  try {
    await fs.promises.access(path.join(_3DMigotoPathDir, _3DMigotoModsPath));
    modsList = [];
    for (const file of await fs.promises.readdir(path.join(_3DMigotoPathDir, _3DMigotoModsPath))) {
      if (fs.statSync(path.join(path.join(_3DMigotoPathDir, _3DMigotoModsPath), file)).isDirectory()) {
        modsList.push(file);
      }
    }
    if (modsList.length == 0) {
      win.webContents.send('mods-list', "empty");
    } else {
      win.webContents.send('mods-list', modsList);
    }
  } catch(err) {
    console.error(err);
  }
}

async function rwPlugs() {
  try {
    await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins"));
    const plugsPath = path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins");
    const allPlugs = await fs.promises.readdir(plugsPath);
    const jarFiles = allPlugs.filter(file => file.endsWith('.jar'));
    if (jarFiles.length == 0) {
      win.webContents.send('plugs-list', "empty");
    } else {
      win.webContents.send('plugs-list', jarFiles);
    }
  } catch(err) {
    console.error(err);
  }
}

async function update(gc_org_url) {
  const orgUrl = new URL(gc_org_url);
  try {
    await downloadFile(`${resURL[0]}${orgUrl.pathname}`, path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'grasscutter.jar.download'), "Grasscutter服务端");
    await fs.promises.rename(
        path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'grasscutter.jar.download'),
        path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'grasscutter.jar')
    );
    await downloadFile(`${resURL[1]}/YuukiPS/GC-Resources/-/archive/4.0/GC-Resources-4.0.zip`, path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'workdir', 'resources.zip.download'), "Resources");
    await fs.promises.rename(
        path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'workdir', 'resources.zip.download'),
        path.join(global.packagedPaths.gateServerPath, 'Grasscutter', 'workdir', 'resources.zip')
    );
    console.log("Update Completed");
    win.webContents.send('update_complete');
  } catch (error) {
      console.error(error);
  }
}

async function proxySettingWizard(targetServer, targetPort, SSLStatus, gcSSLStatus) {
  return new Promise(async (resolve, reject) => {
    try {
      if (["localhost", "127.0.0.1"].includes(targetServer)) {
        return (gcSSLStatus === SSLStatus) ? resolve(targetServer)
        : (win.webContents.send('showMessageBox', "info", "代理设置向导", `本地服务器${gcSSLStatus?"已":"未"}使用SSL，请将代理SSL${SSLStatus?"关闭":"开启"}后再试<br>Code: EPROTO`), undefined);
      }
      const interfaces = os.networkInterfaces();
      for (let ifaceName in interfaces) {
        const iface = interfaces[ifaceName];
        for (let alias of iface) {
          if (alias.address === targetServer) {
            console.log(`Matched IP: ${alias.address}`);
            win.webContents.send('showMessageBox', "info", "代理设置向导", `检测到目标服务器为本机IP(${targetServer})<br> “确定” 使用该IP连接代理 “拒绝” 使用本地地址连接代理`, ["confirm", "deny"]);
            ipcMain.once('showMessageBox-callback', (event, callback) => {
              return resolve(callback === "confirm" ? targetServer : "127.0.0.1");
            });
            return;
          }
        }
      }
      const options = {
        host: targetServer,
        port: targetPort,
        path: '/',
        method: 'GET',
        rejectUnauthorized: true,
        timeout: 5000
      };
      const proto = SSLStatus ? https : http;
      const req = proto.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          console.log(`Received status code ${res.statusCode}`);
          return resolve("127.0.0.1");
        });
      });
      req.setTimeout(options.timeout, () => {
        req.abort();
        console.error('Request timed out 5000ms');
        win.webContents.send('operationBoxBtn_proxy-msg', '', 'Request timed out 5000ms');
      });
      req.on('error', (err) => {
        console.error(err);
        req.abort();
        if (err.code.includes('CERT') && SSLStatus) {
          win.webContents.send('showMessageBox', "info", "代理设置向导", `检测到目标服务器SSL无法被本地验证<br>“确定” 使用远程服务器内部代理(推荐) “拒绝” 使用本地代理(不推荐)<br>${err}<br>Code: ${err.code}`, ["confirm", "deny"]);
          ipcMain.once('showMessageBox-callback', (event, callback) => {
            if (callback === "confirm") {
              win.webContents.send('operationBoxBtn_proxy-msg', `请在目标服务器内部署mitm代理！<button name="remote_mitm_guide">部署教程&nbsp;<i class="fa-solid fa-link"></i></button>`);
            } else {
              win.webContents.send('operationBoxBtn_proxy-msg', `警告：该情况下使用本地代理可能会导致502与400错误！`);
            }
            return resolve(callback === "confirm" ? targetServer : "127.0.0.1");
          });
        } else if (err.code === "EPROTO") {
          win.webContents.send('showMessageBox', "info", "代理设置向导", `目标服务器返回协议错误，当前SSL状态：${SSLStatus}，请尝试${SSLStatus?"关闭":"开启"}SSL后再试<br>${err}<br>Code: ${err.code}`);
        } else {
          win.webContents.send('operationBoxBtn_proxy-msg', '', `${err}, Code: ${err.code}`);
        }
      });
      req.end();
    } catch(err) {
      console.error(err);
      reject(err);
    }
  });
}

async function downloadFile(url, outputPath, action) {
  const proxyServer = await getSystemProxy();
  const curlArgs = ['-Lo', outputPath, url];
  if (proxyServer && !proxyServer.includes(':', proxyPort)) { //ignore mitm proxy
    curlArgs.unshift('--proxy', `http://${proxyServer}`);
    win.webContents.send('using_proxy', proxyServer);
  };
  return new Promise((resolve, reject) => {
    const curl = spawn('curl.exe', curlArgs);
    curl.stderr.on('data', (data) => {
      console.log(data.toString());
      win.webContents.send('update_progress', data.toString(), action);
    });
    curl.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`curl process exited with code ${code}`));
      }
    });
  });
}


async function run_main_service (gcInputRender, proxyInputRender, gcSSLStatus) {
  await rwAppConfig("main-service-save", gcInputRender, proxyInputRender)
  const processes = ['java.exe', 'mongod.exe', 'mitmdump.exe'];
  await killProcesses(processes);
  if (!await checkGateServer()) {
    console.log("Prevent runnning service\ngateserver_not-exists");
    win.webContents.send('gateserver_not-exists');
    return;
  }
  const proxyIP = await proxySettingWizard(proxyInputRender[0], proxyInputRender[1], SSLStatus, gcSSLStatus);
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat ${proxyIP} ${proxyInputRender[0]} ${proxyInputRender[1]}`], {
    stdio: 'ignore'
  });
  const mongo_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mongo.bat`], {
    stdio: 'ignore'
  });
  console.log(javaPath)
  const gc_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_gc.bat`], {
    stdio: 'ignore'
  });
  win.webContents.send('operationBoxBtn_0-success');
}

async function run_proxy_service (gcInputRender, proxyInputRender, gcSSLStatus) {
  await rwAppConfig("proxy-service-save", gcInputRender, proxyInputRender)
  const processes = ['mitmdump.exe'];
  await killProcesses(processes);
  if (!await checkGateServer()) {
    console.log("Prevent runnning service\ngateserver_not-exists");
    win.webContents.send('gateserver_not-exists');
    return;
  }
  const proxyIP = await proxySettingWizard(proxyInputRender[0], proxyInputRender[1], SSLStatus, gcSSLStatus);
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat ${proxyIP} ${proxyInputRender[0]} ${proxyInputRender[1]}`], {
    stdio: 'ignore'
  });
  win.webContents.send('operationBoxBtn_proxy-success');
}

async function run_game() {
  if (fs.existsSync(`${gamePath}`)) {
    exec(`start "" "${gamePath}"`, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`${error}`);
        return;
      }
      console.log(stdout);
      win.webContents.send('operationBoxBtn_2-success');
      console.log(stderr);
    });
  } else {
    win.webContents.send('showMessageBox', "info", `启动游戏`, `游戏路径不存在！请点击“选择路径”选择游戏路径！`);
  }
}

async function run_3dmigoto() {
    try {
      await fs.promises.access(_3DMigotoPathDir);
      await fs.promises.access(_3DMigotoPath);
      await fs.promises.access(path.join(_3DMigotoPathDir, "d3dx.ini"));
      await packageNec("3dmigoto");
      const run_3dmigoto_process = spawn('cmd.exe', ['/c', `${global.packagedPaths.dataPath}\\run_3dmigoto.bat`]);
      run_game();
    } catch(err) {
      if (err.code === "ENOENT") {
        console.error(err);
        win.webContents.send('showMessageBox', "info", `注入3DMigoto`, `3DMigoto路径不存在或d3dx.ini不存在！<br>
        请在设置中点击“选择3DMigoto路径”选择路径！请检查d3dx.ini是否正确配置及存在！`);
      }
    }
}