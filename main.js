const { app, globalShortcut, BrowserWindow, ipcMain, shell, dialog} = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const ini = require('ini');
const util = require('util');
const net = require('net');
const StreamZip = require('node-stream-zip');
const axios = require('axios');
const https = require('https');
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
const logDirPath = path.join(global.packagedPaths.rootPath, 'log');
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
  try {
    const port = await checkPort(EXPRESS_PORT);
    await expressServer(port);
    createWindow(port);
    exec(`certutil -store Root`, async (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stdout.includes('3942b86a38669d255d41f62498ecb782181339b8')) {
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
  } catch (err) {
    console.error(err);
  }
});

const checkPort = (port) => {
  return new Promise((resolve, reject) => {
      const tester = net.createServer()
          .once('error', async (err) => {
              if (err.code === 'EADDRINUSE') {
                  win.webContents.send('showMessageBox', "warning", `端口已被占用`, `${port}端口已被占用！请检查是否启动了多个APP！`);
                  ipcMain.once('showMessageBox-callback', () => {
                    app.quit();
                  })
                  reject(new Error(`Port ${port} is in use`));
              } else {
                  reject(err);
              }
          })
          .once('listening', () => {
              tester.once('close', () => resolve(port)).close();
          })
          .listen(port);
  });
};

const expressServer = (port) => {
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
        <h2>尝试访问<a href="http://localhost:${port}">根目录</a>以重新路由</2>
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

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  console.log('App is quitting...\nSaving config...');
  exec('tasklist', (error, stdout, stderr) => {
    if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
    if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) }
    if (!stdout.includes('java.exe')) {
      exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
    }
    if (!stdout.includes('mongod.exe')) {
      exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
    }
    if (!stdout.includes('mitmdump.exe')) {
      exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`);
    }
  });
  exec(`taskkill /f /im curl.exe`);
  exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_3dmigoto.bat`);
});



// IPCMAIN PROCESS



ipcMain.on('render-ready', async (event) => {
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
  if (await checkGateServer()) {
    await createMitmCA();
    await rwAppConfig();
    await rwMods();
    await rwPlugs();
  }
});

ipcMain.on('devtools-opened', () => {
  if (app.isPackaged) {
    win.webContents.closeDevTools();
  }
})

ipcMain.on('update_latest', (event, gc_org_url) => {
  console.log(`fetched from github api: ${gc_org_url}`);
  update(gc_org_url);
});

ipcMain.on('handelClose', async (event, gcInputRender, proxyInputRender) => {
  if (gateServerStatus) {
    await rwAppConfig("simple-save", gcInputRender, proxyInputRender);
  }
  app.quit();
})

ipcMain.on('handelMinimize', () => {
  win.minimize();
})

ipcMain.on('handelMaximize', () => {
  win.maximize();
});

ipcMain.on('handelWindow', () => {
  win.restore();
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('resGetWayButton_0-set', () => {
  resSetProxy();
});

ipcMain.on('resGetWayButton_1-set', () => {
  resSetDirect();
});

ipcMain.on('officialKeystoreBox-set', () => {
  officialKeystore("render");
});

ipcMain.on('selfSignedKeystoreBox-set', () => {
  selfSignedKeystore("render");
});

ipcMain.on('noKeystoreBoxBox-set', () => {
  noKeystore("render");
})

ipcMain.on('proxyUsingSSLCheckbox_ClickHandler-set-on', () => {
  SSLStatus = true;
  rwAppConfig("ssl-set");
});

ipcMain.on('proxyUsingSSLCheckbox_ClickHandler-set-off', () => {
  SSLStatus = false;
  rwAppConfig("ssl-set");
});

ipcMain.on('restoreOfficialButton_delete-path', (event) => {
  if (gamePath) {
    console.log(`${gamePathDir}\\version.dll`)
    if (fs.existsSync(`${gamePathDir}\\version.dll`)) {
      exec(`rm "${gamePathDir}\\version.dll"`, { encoding: 'binary' }, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行出错: ${error}`);
          return;
        }
        console.log(stdout);
        console.error(stderr);
      });
      patchExists = false;
      event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, "delete_patch_succ");
    } else {
      patchExists = false;
      event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, "patch_not_exst");
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
  let token;
  const host = (SSLStatus ? "https://" : "http://") + gcInputRender[0] + ":" + gcInputRender[2] + "/opencommand/api";
  try {
    await fs.promises.access(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "plugins", "opencommand-plugin", "config.json"));
    const OCConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const OCConfig = JSON.parse(OCConfigData);
    token = OCConfig.consoleToken ? OCConfig.consoleToken : "52837291";
  } catch(err) {
    console.log(err);
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
  if (SSLStatus !== false) {
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
  } catch (error) {
    win.webContents.send('showMessageBox', "error", `<i class="fa-solid fa-link"></i>&nbsp;连接失败！`,
    `err.code: ${error.code} <br> 请检查服务是否已启动、端口是否已开放、IP是否可连接`);
    console.error(error.code, "\nerr details has been written to log file");
    fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `${error.message}\n${error.stack}\n\n`);
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
        exec(`copy "${path.join(global.packagedPaths.entryPath, "app.config.json")}" "${path.join(exportPath, `app.config_${moment().tz("Asia/Shanghai").format('YYYY-MM-DD_HH-mm-ss')}.json`)}"`, {encoding: "binary"}, (error, stdout, stderr) => {
          if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
          if (stdout) {
            console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
            console.log("Copied app.config.json to", exportPath);
            win.webContents.send('exportAppConfigBtn-export-success', exportPath);
          };
          if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };    
        })
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
        exec(`copy "${configPath}" "${path.join(global.packagedPaths.entryPath, "app.config.json")}"`, {encoding: "binary"}, async (error, stdout, stderr) => {
          if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
          if (stdout) {
            console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
            console.log("Imported", configPath);
            win.webContents.send('showMessageBox', "info", `导入应用配置`, `导入成功！将重启应用以应用更改`);
            ipcMain.once('showMessageBox-callback', () => {
              app.relaunch();
              app.exit(0);
            })
          };
          if (stderr) {
            console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'))
            win.webContents.send('showMessageBox', "warning", `导入应用配置`, `导入失败！`);
          };    
        })
      } catch(err) {
        console.error(err);
      }
    }
 } catch(err) {
   console.error(err);
 }
})

ipcMain.on('openGcToolsBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"))) {
    console.log("run gctools");
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"));
  } else {
    console.error("GcTools not found, try download");
    win.webContents.send("openGcToolsBtn_starting-download");
    (async () => {
      try {
        await downloadFile(`${resURL[0]}/jie65535/GrasscutterCommandGenerator/releases/download/v1.12.2/GcTools-v1.12.2.exe`, path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"), "GcTools v1.12.2");
        win.webContents.send("openGcToolsBtn_download-complete");
        try {
          shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"));
          console.log("run gctools");
        } catch(err) {
          console.error(err);
        }
      } catch (error) {
        console.error(error);
      }
    })();
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
    title: '请定位到jdk文件夹，即bin的上一级',
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      exec(`"${path.join(result.filePaths[0], "bin", "java")}" --version`, {encoding: 'binary'}, async (error, stdout, stderr) => {
        if (error) {
          console.log(error);
          return;
        }
        if (stdout && stdout.includes('Java(TM) SE Runtime Environment')) {
          javaPath = path.join(result.filePaths[0], "bin", "java.exe");
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
          exec(`"${path.join(result.filePaths[0], "bin", "java")}" -version`, {encoding: 'binary'}, async (error, stdout, stderr) => {
            if (error) { 
              console.log(error);
              win.webContents.send('chooseJavaPathButton_not-valid');
              return; 
            }
            if (stdout && stdout.includes('Java(TM) SE Runtime Environment')) {
              win.webContents.send('chooseJavaPathButton_was-jre', javaPath, "init");
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
    try {
      _3DMigotoPath = result.filePaths[0];
      _3DMigotoPathDir = path.dirname(_3DMigotoPath);
      const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
      const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
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
    } catch (err) {
      console.error(err);
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

ipcMain.on('operationBoxBtn_0-run-main-service', async (event, gcInputRender, proxyInputRender) => {
  await checkJava();
  await packageNec();
  run_main_service(gcInputRender, proxyInputRender);
});

ipcMain.on('operationBoxBtn_proxy-run-proxy-service', async (event, gcInputRender, proxyInputRender) => {
  await packageNec("proxy-only");
  run_proxy_service(gcInputRender, proxyInputRender);
});

ipcMain.on('operationBoxBtn_1-stop-service', async (event) => {
  const processes = ['java.exe', 'mongod.exe', 'mitmdump.exe'];
  const addition = [
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f',
    'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f'
  ];
  await killProcesses(processes, addition);
  exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_3dmigoto.bat`);
  win.webContents.send('operationBoxBtn_1-success');
});

ipcMain.on('operationBoxBtn_2-run-game', (event) => {
  run_game();
});

ipcMain.on('operationBoxBtn_3-run-3dmigoto', (event) => {
  run_3dmigoto();
});

ipcMain.on('clear_data', async (event) => {
  win.webContents.send('showMessageBox', "warning", `恢复出厂`,
    `确定要恢复出厂吗？这将会删除所有的使用痕迹，包括你的游戏数据！！！被删除的数据将无法找回！！！`, ["confirm", "cancel"]);

  ipcMain.once('showMessageBox-callback', (event, callback) => {
    if (callback === "confirm") {
      win.webContents.send('clearing_data');
      exec(`for /r ${global.packagedPaths.gateServerPath}\\MongoDB\\data %G in (*.*) do del /s /q %G & for /d %G in (${global.packagedPaths.gateServerPath}\\MongoDB\\data\\*) do rmdir /s /q %G`, { encoding: 'binary' }, (error, stdout, stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`del ${global.packagedPaths.entryPath}\\app.config.json`,{ encoding: 'binary' },(error,stdout,stderr) => {        
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`rmdir /s /q "${global.packagedPaths.gateServerPath}\\Grasscutter\\GM Handbook"`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\logs`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`del /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\cache`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\data\\gacha`,{ encoding: 'binary' },(error,stdout,stderr) => {
        if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      });
      win.webContents.send('showMessageBox', "info", `恢复出厂`, `将重启应用以应用更改`);
      ipcMain.once('showMessageBox-callback', () => {
        app.relaunch();
        app.exit(0);
      })
    }
  })
});



// FUNCTION



function writeToLog(message, type = "log") {
  fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `[${type} ${currentMomentLog}] ${message}\n`);
}

async function createWindow(port) {
  win = new BrowserWindow({
    width: 1030,
    height: 635,
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
echo 将使用此命令来调用Java： %1\r
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
%1 -jar grasscutter.jar\r
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
echo 清除系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f\r
echo.\r
echo 设置系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "127.0.0.1:${proxyPort}" /f\r
echo.\r
echo 正在启动Mitm代理...\r
cd "${global.packagedPaths.gateServerPath}\\Proxy"\r
mitmdump -s proxy.py --ssl-insecure --set block_global=false --listen-port ${proxyPort}\r
echo 清除系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f\r
exit.\r`;

/*
  const mitm_proxy_batch_already_in_use = `@echo off\r
chcp 65001>nul\r
echo ${proxyPort} 已被占用！请kill占用此端口的进程并重新启动服务！
echo 按任意键退出...
pause>nul\r
exit\r`
*/

  const add_root_crt_batch =`@echo off\r
chcp 65001>nul\r
%1 start "" mshta vbscript:createobject("shell.application").shellexecute("""%~0""","::",,"runas",1)(window.close)&exit\r
echo 导入根证书...\r
certutil -addstore -f "Root" "${global.packagedPaths.dataPath}\\root.crt"\r
certutil -addstore -f "Root" "%USERPROFILE%\\.mitmproxy\\mitmproxy-ca-cert.cer"\r
exit\r`;

  let files = [
    {name: 'add_root_crt.bat', content: add_root_crt_batch}
  ];

  if (action !== "proxy-only" && action !== "init-crt") {
    files.push(
      {name: 'run_gc.bat', content: gc_batch},
      {name: 'run_mongo.bat', content: mongo_batch},
      {name: 'run_mitm_proxy.bat', content: mitm_proxy_batch}
    );
  } else if (action === "proxy-only") {
    files.push(
      {name: 'run_mitm_proxy.bat', content: mitm_proxy_batch}
    )
  }

  try {
    for (let file of files) {
      await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, file.name), file.content);
      console.log(`Created ${file.name}`);
    }
  } catch (err) {
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
          resolve();
        }
      });
    });
  });
}

async function checkGateServer() {
  try {
    await fs.promises.access(global.packagedPaths.gateServerPath);
    gateServerStatus = true;
    return true;
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
  let appConfig;
  try {
    await fs.promises.access(`${gamePathDir}\\version.dll`);
    appConfig = JSON.parse(appConfigData);
    if (gamePath !== "") {
        patchExists = true;
        win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
        if (appConfig.game) {
          appConfig.game.path = gamePath;
        } else {
          appConfig.game = { path: gamePath };
        }
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated Successfully');
  } catch (error) {
    if (gamePath !== "") {
        const result = execSync(`copy "${global.packagedPaths.dataPath}\\RSAPatch.dll" "${gamePathDir}\\version.dll"`, { encoding: 'binary' });
        console.log(iconv.decode(Buffer.from(result, 'binary'), 'GBK'));
        console.log("RSA Patched");
        patchExists = true;
        win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
    }
    appConfig = JSON.parse(appConfigData);
    if (appConfig.game && appConfig.game.path) {
        patchExists = true;
    }
  }
}


async function selfSignedKeystore(action) {
  try {
    exec(`copy "${global.packagedPaths.dataPath}\\keystore_selfsigned.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.log(error);
        return;
      }
      if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      console.log("selfSignedKeystore");
      if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    });
    try {    
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
    } catch (err) {
      console.error(err)
    }
  } catch(err) {
    console.log(err);
  }
};


async function officialKeystore(action) {
  try {
    exec(`copy "${global.packagedPaths.dataPath}\\keystore_official.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.log(error);
        return;
      }
      if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      console.log("officialKeystore");
      if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    });
    try {
      await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
      const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
      const appConfig = JSON.parse(appConfigData);
      if (appConfig.grasscutter.dispatch) {
        appConfig.grasscutter.dispatch.ssl = "official"
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
    } catch (err) {
      console.error(err)
    }
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
  console.log("proxy");
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.getRes) {
      appConfig.getRes = "proxy";
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
}


async function killProcesses(processes, addition = []) {
  return new Promise((resolve, reject) => {
    exec('tasklist', { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject(error);
        return;
      }
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
        if (stdout) {
          console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
        }
        if (stderr) {
          console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
        }
        resolve();
      });
    });
  });
}


async function resSetDirect () {
  resURL = ["https://github.com", "https://gitlab.com", "https://api.github.com"];
  console.log("direct");
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.getRes) {
      appConfig.getRes = "direct";
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
}


async function rwAppConfig(action, gcInputRender, proxyInputRender) {
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    
    if (appConfig.getRes === "proxy") {
      resSetProxy();
      win.webContents.send('res_getway', "proxy");
    } else if (appConfig.getRes === "direct") {
      resSetDirect();
      win.webContents.send('res_getway', "direct");
    }

    if (action === "main-service-save" || action === "simple-save" || action === "proxy-service-save") {
      if (appConfig.grasscutter) {
        appConfig.grasscutter.host = gcInputRender[0];
        appConfig.grasscutter.port = gcInputRender[1];
        if (appConfig.grasscutter.dispatch) {
          if (appConfig.grasscutter.host!=="127.0.0.1" && appConfig.grasscutter.host!=="localhost" && appConfig.grasscutter.host!=="0.0.0.0"){
            appConfig.grasscutter.dispatch.host = "dispatchcnglobal.yuanshen.com";
          } else {
            appConfig.grasscutter.dispatch.host = "127.0.0.1";
          }
        }
      }
      if (appConfig.grasscutter.dispatch) {
        appConfig.grasscutter.dispatch.port = gcInputRender[2];
      }
      if (appConfig.proxy) {
        appConfig.proxy.host = proxyInputRender[0];
        appConfig.proxy.port = proxyInputRender[1];
      }
      await writeAcConfig("main-service-save", gcInputRender, proxyInputRender);
    }

    else if (action === "ssl-set") {
      appConfig.proxy.ssl = SSLStatus;
      await writeAcConfig("ssl-set");
    }
    
    else {
      if (appConfig.game) {
        try {
          await fs.promises.access(appConfig.game.path);
          gamePath = appConfig.game.path;
          gamePathDir = path.dirname(gamePath);
        } catch(err) {
          if (err.code = "ENOENT") {
            gamePath = "";
            gamePathDir = "";
          } else {
            console.error(err);
          }
        }

        if (gamePath) { await sendPatchGamePath(gamePath) }

        if (appConfig.game) {
          if (appConfig.game._3dmigoto !== "") {
            try {
              await fs.promises.access(appConfig.game._3dmigoto);
              _3DMigotoPath = appConfig.game._3dmigoto;
              _3DMigotoPathDir = path.dirname(_3DMigotoPath)
            } catch(err) {
              if (err.code = "ENOENT") {
                _3DMigotoPath = path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe");
                _3DMigotoPathDir = path.dirname(_3DMigotoPath);
              } else {
                console.error(err);
              }
            }
            const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
            const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
            if (_3DMigotoConfig.Include.include_recursive) {
              _3DMigotoModsPath = _3DMigotoConfig.Include.include_recursive;
              console.log(path.join(_3DMigotoPathDir, _3DMigotoModsPath));
            }
            if (_3DMigotoPath) {
              console.log(_3DMigotoPath);
              win.webContents.send('choose3DMigotoPathButton_was', _3DMigotoPath);
            }
          }
        }
      }

      if (appConfig.java !== "") {
        javaPath = appConfig.java.exec;
        console.log(javaPath, "\n")
        win.webContents.send('chooseJavaPathButton_was-jdk', javaPath);
      }

      if (appConfig.grasscutter) {
        if (appConfig.grasscutter.dispatch) {
          if (appConfig.grasscutter.dispatch.ssl == "selfsigned") {
            selfSignedKeystore();
            win.webContents.send('ssl_ver', "selfSignedKeystore");
          }
          else if (appConfig.grasscutter.dispatch.ssl == "official") {
            officialKeystore();
            win.webContents.send('ssl_ver', "officialKeystore");
          }
          else if (appConfig.grasscutter.dispatch.ssl == "no") {
            noKeystore();
            win.webContents.send('ssl_ver', "noKeystore");
          }
          if (appConfig.grasscutter.host!=="127.0.0.1" && appConfig.grasscutter.host!=="localhost" && appConfig.grasscutter.host!=="0.0.0.0"){
            appConfig.grasscutter.dispatch.host = "dispatchcnglobal.yuanshen.com";
          } else {
            appConfig.grasscutter.dispatch.host = "127.0.0.1";
          }
        }
        gcInput = [appConfig.grasscutter.host, appConfig.grasscutter.port, appConfig.grasscutter.dispatch.port, appConfig.grasscutter.dispatch.host];
        win.webContents.send('gc_text', gcInput);
      }

      if (appConfig.proxy) {
        proxyInput = [appConfig.proxy.host, appConfig.proxy.port];
        SSLStatus = appConfig.proxy.ssl;
        win.webContents.send('proxy_text', proxyInput);
        win.webContents.send('ssl_status', SSLStatus);
      }
      await writeAcConfig();
    }
    
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8', async (err) => {
      if (err) {
        console.error('Err when writing config to file:', err);
        return;
      }
      console.log('app.config.json Updated successfully');
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      gcInput = ["127.0.0.1", "22102", "443", "127.0.0.1"]
      proxyInput = ["127.0.0.1", "443"];
      SSLStatus = true;
      gamePath = "";
      gamePathDir = path.dirname(gamePath);
      javaPath = "java";
      _3DMigotoPath = path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe");
      _3DMigotoPathDir = path.dirname(_3DMigotoPath);
      const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
      const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
      if (_3DMigotoConfig.Include.include_recursive) {
        _3DMigotoModsPath = _3DMigotoConfig.Include.include_recursive;
        console.log(path.join(_3DMigotoPathDir, _3DMigotoModsPath));
      }
      console.log(javaPath, "\n");
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(defaultAppConfig, null, 2), 'utf8');
      await resSetProxy();
      await selfSignedKeystore();
      win.webContents.send('chooseJavaPathButton_was-jdk', javaPath);
      win.webContents.send('choose3DMigotoPathButton_was', _3DMigotoPath)
      console.log('app.config.json Created successfully');
      /*
      win.webContents.send('vc_redist_init', path.join(global.packagedPaths.gateServerPath, "MongoDB", "vc_redist.x64.exe"));
      exec(`start "" "${path.join(global.packagedPaths.gateServerPath, "MongoDB", "vc_redist.x64.exe")}"`, { encoding: "binary" }, (error, stdout, stderr) => {
        if (error) {
          console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
          return;
        }
        if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
        if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
      })
      */
    } else {
      console.error(err)
    }
  }
}


async function writeAcConfig (action, gcInputRender, proxyInputRender) {
  try {
    await fs.promises.access(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`);
    const gcConfigData = await fs.promises.readFile(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`, 'utf-8');
    const gcConfig = JSON.parse(gcConfigData);

    await fs.promises.access(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`);
    const mitmConfigData = await fs.promises.readFile(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`);
    let mitmConfig = mitmConfigData.toString('utf-8');

    if (action === "main-service-save" || action === "simple-save" || action === "proxy-service-save") {
      if (gcConfig.server.http) {
        gcConfig.server.http.accessAddress = gcInputRender[3];
        console.log("\nhttp.accessAddress " + gcConfig.server.http.accessAddress);
        gcConfig.server.http.bindPort = gcInputRender[2];
        console.log("http.bindPort " + gcConfig.server.http.bindPort);
      }
      if (gcConfig.server.game) {
        gcConfig.server.game.accessAddress = gcInputRender[0];
        console.log("\ngame.accessAddress " + gcConfig.server.game.accessAddress);
        gcConfig.server.game.bindPort = gcInputRender[1];
        console.log("game.bindPort " + gcConfig.server.game.bindPort);
      }
      mitmConfig = mitmConfig.replace(/(REMOTE_HOST\s*=\s*)"([^"]+)"/g, (_, p2) => {
        console.log(`\n${p2}"${proxyInputRender[0]}"`);
        return `${p2}"${proxyInputRender[0]}"`;
      });
      mitmConfig = mitmConfig.replace(/(REMOTE_PORT\s*=\s*)([^"]+)/g, (_, p2) => {
        console.log(`${p2}${proxyInputRender[1]}\n`);
        return `${p2}${proxyInputRender[1]}`;
      });
    }
    
    else if (action === "ssl-set") {
      mitmConfig = mitmConfig.replace(/(USE_SSL\s*=\s*)(True|False)/g, (_, p1) => {
        console.log(`\n${p1}${SSLStatus ? 'True' : 'False'}`);
        return `${p1}${SSLStatus ? 'True' : 'False'}`;
      });
    }
    
    else {
      if (gcConfig.server.http) {
        gcConfig.server.http.accessAddress = gcInput[3];
        console.log("\nhttp.accessAddress " + gcConfig.server.http.accessAddress);
        gcConfig.server.http.bindPort = gcInput[2];
        console.log("http.bindPort " + gcConfig.server.http.bindPort);
      }
      if (gcConfig.server.game) {
        gcConfig.server.game.accessAddress = gcInput[0];
        console.log("\ngame.accessAddress " + gcConfig.server.game.accessAddress);
        gcConfig.server.game.bindPort = gcInput[1];
        console.log("game.bindPort " + gcConfig.server.game.bindPort);
      }
      mitmConfig = mitmConfig.replace(/(REMOTE_HOST\s*=\s*)"([^"]+)"/g, (_, p2) => {
        console.log(`\n${p2}"${proxyInput[0]}"`);
        return `${p2}"${proxyInput[0]}"`;
      });
      mitmConfig = mitmConfig.replace(/(REMOTE_PORT\s*=\s*)([^"]+)/g, (_, p2) => {
        console.log(`${p2}${proxyInput[1]}\n`);
        return `${p2}${proxyInput[1]}`;
      });
    }

    if (JSON.stringify(gcConfig, null, 2) !== gcConfigData) {
      await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`, JSON.stringify(gcConfig, null, 2), 'utf8');
      console.log('moded gc config');
    } if (mitmConfig !== mitmConfigData) {
      await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`, mitmConfig, 'utf8');
      console.log('moded mitm config');
    }
  } catch (err) {
    console.error(err)
  }
}


async function checkJava() {
  try {
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.java && appConfig.java.exec !== "") {
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
    try {
      const { stdout } = await exec('java -version', { encoding: 'binary' });
      if (stdout.includes('Runtime Environment')) {
        win.webContents.send('jre-already-installed');
        await downloadJDK();
        return;
      }
    } catch (err) {}
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
      if (err) {
        reject(err);
        return;
      }

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
    const modsPath = path.join(_3DMigotoPathDir, _3DMigotoModsPath);
    const allMods = await fs.promises.readdir(modsPath);
    for (const file of allMods) {
      if (fs.statSync(path.join(modsPath, file)).isDirectory()) {
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
    await downloadFile(`${resURL[0]}${orgUrl.pathname}`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download`, "Grasscutter服务端");
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      if (stderr) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stdout) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    })
    await downloadFile(`${resURL[1]}/YuukiPS/GC-Resources/-/archive/4.0/GC-Resources-4.0.zip`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download`, "Resources");
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      if (stderr) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stdout) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    })
    console.log("Update Completed");
    win.webContents.send('update_complete');
  } catch (error) {
    console.log(error);
  }
}


async function downloadFile(url, outputPath, action) {
  const proxyServer = await getSystemProxy();
  const curlArgs = ['-Lo', outputPath, url];
  if (proxyServer) { //ignore mitm proxy
    const [host, port] = proxyServer.split(':');
    if (port !== "54321") {
      curlArgs.unshift('--proxy', `http://${proxyServer}`);
      win.webContents.send('using_proxy', proxyServer);
    }
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


async function run_main_service (gcInputRender, proxyInputRender) {
  await rwAppConfig("main-service-save", gcInputRender, proxyInputRender)
  const processes = ['java.exe', 'mongod.exe', 'mitmdump.exe'];
  await killProcesses(processes);
  if (!await checkGateServer()) {
    console.log("Prevent runnning service\ngateserver_not-exists");
    win.webContents.send('gateserver_not-exists');
    return;
  }
  win.webContents.send('operationBoxBtn_0-success');
  const mongo_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mongo.bat`], {
    stdio: 'ignore'
  });
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`], {
    stdio: 'ignore'
  });
  console.log(javaPath)
  const gc_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_gc.bat ${javaPath}`], {
    stdio: 'ignore'
  });
}

async function run_proxy_service (gcInputRender, proxyInputRender) {
  await rwAppConfig("proxy-service-save", gcInputRender, proxyInputRender)
  const processes = ['mitmdump.exe'];
  await killProcesses(processes);
  if (!await checkGateServer()) {
    console.log("Prevent runnning service\ngateserver_not-exists");
    win.webContents.send('gateserver_not-exists');
    return;
  }
  win.webContents.send('operationBoxBtn_proxy-success');
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`], {
    stdio: 'ignore'
  });
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
      await fs.promises.access(`${_3DMigotoPathDir}`);
      await fs.promises.access(`${_3DMigotoPath}`);
      const _3DMigotoConfigData = await fs.promises.readFile(path.join(_3DMigotoPathDir, "d3dx.ini"), 'utf-8');
      const _3DMigotoConfig = ini.parse(_3DMigotoConfigData);
      console.log(_3DMigotoConfig.Loader.target)
      if (_3DMigotoConfig.Loader.target !== "") {
        try {
          _3DMigotoConfig.Loader.target = gamePath;
        } catch(err) {
          win.webContents.send('showMessageBox', "info", `启动游戏`, `游戏路径不存在！请点击“选择路径”选择游戏路径！`);
        }
      }
      await fs.promises.writeFile(path.join(_3DMigotoPathDir, "d3dx.ini"), ini.stringify(_3DMigotoConfig), 'utf-8');
      const run_3dmigoto_batch = `@echo off\r
chcp 65001>nul\r
cd ${_3DMigotoPathDir}\r
"3DMigoto Loader.exe"\r
exit`;
      try {
        await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, 'run_3dmigoto.bat'), run_3dmigoto_batch);
        console.log('Created run_3dmigoto.bat');
        const run_3dmigoto_process = spawn('cmd.exe', ['/c', `${global.packagedPaths.dataPath}\\run_3dmigoto.bat`]);
        run_game();
      } catch (err) {
        console.error(err);
      }
    } catch(err) {
      if (err.code === "ENOENT") {
        win.webContents.send('showMessageBox', "info", `注入3DMigoto`, `3DMigoto路径不存在！请在设置中点击“选择3DMigoto路径”选择路径！`);
      }
    }
}