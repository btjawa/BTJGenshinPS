const { app, BrowserWindow, ipcMain, shell, dialog, Menu, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const https = require('https');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Winreg = require('winreg');

const zlog = require('electron-log');
let filepath = path.join(__dirname, "..\\logs");
let nowdate = new Date();
let nowdate_str = nowdate.getFullYear() + "_" + (nowdate.getMonth() + 1) + "_" + nowdate.getDate() + "_" + nowdate.getHours();
let filename = "app.console_" + nowdate_str + ".log";
zlog.transports.file.resolvePath = () => path.join(filepath, filename);
zlog.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
zlog.transports.file.level = true;
zlog.transports.console.level = false;
global.zlog = zlog;

global.packagedPaths = {
  dataPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, 'data'),
  gateServerPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, 'GateServer')
};

function packageNec() {
  const gc_batch = `@echo off\r
title Grasscutter\r
chcp 65001>nul\r
echo.\r
echo 不要关闭这个窗口！！！\r
echo.\r
echo 将使用此命令来调用Java： %1\r
echo.\r
\r
cd ${global.packagedPaths.gateServerPath}\\Grasscutter\r
echo 由 github/btjawa 改包\r
echo 正在启动Grasscutter服务端...\r
%1 -jar grasscutter.jar\r
exit`;
  const mongo_batch = `@echo off\r
title MongoDB\r
chcp 65001>nul\r
echo.\r
echo 不要关闭这个窗口！！！\r
echo.\r
\r
echo 由 github/btjawa 改包\r
echo 正在启动MongoDB数据库...\r
cd ${global.packagedPaths.gateServerPath}\\MongoDB\r
.\\mongod --dbpath data --port 27017\r
exit`;
  const mitm_proxy_batch = `@echo off\r
title Mitmdump\r
chcp 65001>nul\r
echo.\r
echo 不要关闭这个窗口！！！\r
echo.\r
\r
echo 由 github/btjawa 改包\r
echo.\r
echo 清除系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f\r
echo.\r
echo 设置系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 1 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "127.0.0.1:54321" /f\r
echo.\r
echo 正在启动Mitm代理...\r
cd ${global.packagedPaths.gateServerPath}\\Proxy\r
.\\mitmdump -s proxy.py --ssl-insecure --set block_global=false --listen-port 54321\r
exit`;

  fs.writeFile(path.join(global.packagedPaths.dataPath, 'run_gc.bat'), gc_batch, (err) => {
    if (err) {
      console.error('Err:', err);
    } else {
      console.log('Created run_gc.bat');
    }
  });

  fs.writeFile(path.join(global.packagedPaths.dataPath, 'run_mongo.bat'), mongo_batch, (err) => {
    if (err) {
      console.error('Err:', err);
    } else {
      console.log('Created run_mongo.bat');
    }
  });

  fs.writeFile(path.join(global.packagedPaths.dataPath, 'run_mitm_proxy.bat'), mitm_proxy_batch, (err) => {
    if (err) {
      console.error('Err:', err);
    } else {
      console.log('Created run_mitm_proxy.bat');
    }
  });
};


let win;
let gamePath;
let gamePathDir;
let patchExists = false;
let action;
let javaPath;
let resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top"];

function createWindow() {
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
    },
  });

  win.loadFile('./dist/index.html');
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '复制',
      role: 'copy',
    },
    {
      label: '粘贴',
      role: 'paste',
    }
  ]);

  win.webContents.on('context-menu', (e, params) => {
    contextMenu.popup(win, params.x, params.y);
  });

  win.on('maximize', function () {
    win.webContents.send('main-window-max');
  })
  win.on('unmaximize', function () {
    win.webContents.send('main-window-unmax');
  })

  if (!app.isPackaged) { win.webContents.openDevTools(); }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  exec(`taskkill /f /im curl.exe`);
  exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`)
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

packageNec();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function checkJava() {
  try {
    const { stdout, stderr } = await exec('java -version');
    if (stderr.includes('Java(TM) SE Runtime Environment') && !stderr.includes('HotSpot')) {
      console.log('JRE is installed. Downloading JDK...');
      await downloadJDK();
    } else if (stderr.includes('Java(TM) SE Runtime Environment') && stderr.includes('HotSpot')) {
      console.log('JDK is already installed.');
      javaPath = 'java';
    } else {
      console.log('Unknown Java installation. Downloading JDK to be safe...');
      await downloadJDK();
    }
  } catch (error) {
    console.log('Java is not installed. Downloading JDK...');
    await downloadJDK();
  }
};

async function downloadJDK() {
  const jdkURL = 'https://repo.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_windows-x64_bin.zip';
  const jdkZipPath = path.join(__dirname, '../jdk-17.0.2.zip');
  const file = fs.createWriteStream(jdkZipPath);
  https.get(jdkURL, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log('JDK downloaded successfully.');
        const jdkExtractPath = path.join(__dirname, '../');
        const jdk_zip = new AdmZip(jdkZipPath);
        const jdkPath = path.join(__dirname, '../jdk-17.0.2');
        jdk_zip.extractAllTo(jdkExtractPath, overwrite = true);
        fs.unlink(jdkZipPath, (err) => {
          if (err) {
            console.error('Error deleting JDK ZIP file:', err);
          } else {
            console.log('JDK ZIP file deleted successfully.');
            process.env.PATH = `${process.env.PATH};${jdkPath}`;
            javaPath = jdkPath;
            console.log(jdkPath)
            // 添加环境
          };
        });
      });
    });
  }).on('error', (error) => {
    fs.unlinkSync(jdkPath);
    console.error('Error downloading JDK:', error);
  });
}

ipcMain.on('update_latest', (event, gc_org_url) => {
  console.log(`fetched from github api: ${gc_org_url}`);
  update(gc_org_url);
});

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

async function downloadFile(url, outputPath, action) {
  const proxyServer = await getSystemProxy();
  const curlArgs = ['-Lo', outputPath, url];
  if (proxyServer) {
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

async function update(gc_org_url) {
  const orgUrl = new URL(gc_org_url);
  try {
    await downloadFile(`${resURL[0]}${orgUrl.pathname}`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar`, "Grasscutter服务端");
    await downloadFile(`${resURL[1]}/YuukiPS/GC-Resources/-/archive/4.0/GC-Resources-4.0.zip`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip`, "Resources");
    win.webContents.send('update_complete');
    console.log("Update Completed");
  } catch (error) {
    console.log(error);
  }
}


function patchGamePathParaTransfer() {
  if (fs.existsSync(`${gamePathDir}\\version.dll`)) {
    fs.readFile('../app.config.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Err when reading config file:', err);
        return;
      }
      const config = JSON.parse(data);
      if (gamePath != "") {
        patchExists = true;
        win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
        if (config.game) {
          config.game.path = `${gamePath}`;
        } else {
          config.game = { path: `${gamePath}` };
        }
      };
      fs.writeFile('../app.config.json', JSON.stringify(config, JSON.stringify(config, null, 2), 2), 'utf8', err => {
        if (err) {
          console.error('Err when writing config file:', err);
          return;
        }
        console.log('../app.config.json Updated Successfully');
      });
    });
  } else {
    patchExists = false;
    win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
    if (gamePath != "") {
      exec(`copy "${global.packagedPaths.dataPath}\\RSAPatch.dll" "${gamePathDir}\\version.dll"`, (error, stdout, stderr) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(stdout);
        console.log("RSA Patched");
        console.log(stderr);
      });
    };
    fs.readFile('../app.config.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Err when reading config file:', err);
        return;
      }
      const config = JSON.parse(data);
      if (config.game.path == "") { } else {
        patchExists = true;
      };
    });

  }
}


function executeSelfSignedKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_selfsigned.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\stores\\keystore.p12"`, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(stdout);
    console.log("selfSignedKeystore");
    console.log(stderr);
  });
};


function executofficialKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_official.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\stores\\keystore.p12"`, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(stdout);
    console.log("officialKeystore");
    console.log(stderr);
  });
};


// ../app.config.json
if (fs.existsSync(`../app.config.json`)) {
  fs.readFile('../app.config.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Err when reading config file:', err);
      return;
    }
    const config = JSON.parse(data);
    if (config.game) {
      gamePath = config.game.path;
      gamePathDir = path.dirname(gamePath);
      patchGamePathParaTransfer();
    };
    if (config.grasscutter.dispatch) {
      if (config.grasscutter.dispatch.ssl == "selfsigned") {
        executeSelfSignedKeystore();
      }
      else if (config.grasscutter.dispatch.ssl == "official") {
        executofficialKeystore();
      }
    }
  });
} else {
  // create config
  const app_config = {
    game: { path: "" },
    grasscutter: { port: 22102, host: "127.0.0.1", dispatch: { port: 443, ssl: "selfsigned" } },
    mongodb: { port: 27017 }
  };
  fs.writeFile(path.join(__dirname, '../app.config.json'), JSON.stringify(app_config, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Err when writing config to file:', err);
      return;
    }
    console.log('../app.config.json Created successfully');
  });
};


ipcMain.on('handelClose', () => {
  app.quit();
})

ipcMain.on('handelMinimize', () => {
  win.minimize();
})

ipcMain.on('handelMaximize', () => {
  // win.maximize();
  dialog.showMessageBox(win, {
    type: 'info',
    title: '全屏化',
    message: '因为排版问题暂时ban掉全屏化 我写出来只是为了告诉你我会做这个功能（（被打死',
    buttons: ['确定']
  });
});

// ipcMain.on('handelWindow', () => {
//   win.restore();
// });

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('resGetWayButton_0-set', () => {
  resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top"];
  dialog.showMessageBox(win, {
    type: 'info',
    title: '代理',
    message: '获取资源方式已更改为 代理!',
    buttons: ['确定']
  });
});

ipcMain.on('resGetWayButton_1-set', () => {
  resURL = ["https://github.com", "https://gitlab.com"];
  dialog.showMessageBox(win, {
    type: 'info',
    title: '直连',
    message: '获取资源方式已更改为 直连!',
    buttons: ['确定']
  }).then(result => {
    if (result.response === 0) {
    }
  });
});

ipcMain.on('officialKeystoreButton-set', () => {
  executofficialKeystore();
});

ipcMain.on('selfSignedKeystoreButton-set', () => {
  executeSelfSignedKeystore();
});

ipcMain.on('chooseGamePathButton_open-file-dialog', (event) => {
  dialog.showOpenDialog({
    filters: [
      { name: '应用程序', extensions: ['exe'] }
    ],
    properties: ['openFile',]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      gamePath = result.filePaths[0];
      gamePathDir = path.dirname(gamePath);
      console.log(gamePath);
      const gamePathFileName = path.basename(gamePath);
      if (gamePathFileName === 'GenshinImpact.exe' || gamePathFileName === 'YuanShen.exe') {
        patchGamePathParaTransfer();
      } else {
        event.sender.send('chooseGamePathButton_file-not-valid', gamePath, patchExists, action);
      }
    }
  }).catch(err => {
    console.log(err);
  });
});

ipcMain.on('restoreOfficialButton_delete-path', (event) => {
  if (gamePath) {
    console.log(`${gamePathDir}\\version.dll`)
    if (fs.existsSync(`${gamePathDir}\\version.dll`)) {
      exec(`rm "${gamePathDir}\\version.dll"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行出错: ${error}`);
          return;
        }
        console.log(`${stdout}`);
        console.error(`${stderr}`);
      });
      patchExists = false;
      action = "delete_patch_succ";
      event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, action);
    } else {
      patchExists = false;
      action = "patch_not_exst";
      event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, action);
    }
  } else {
    patchExists = false;
    action = "game_patch_undf"
    event.sender.send('chooseGamePathButton_selected-file', gamePath, patchExists, action);
  }
});

ipcMain.on('operationBoxBtn_0-run-main-service', async (event) => {
  await checkJava();
  run_main_service();
});

async function run_main_service() {
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe`, (error, stdout, stderr) => {
    if (error) {
      console.error(`${error}`);
      return;
    }
    console.log(`stdout: ${stdout}\nsuccess`);
    console.log(`stderr: ${stderr}\nerror`);
  });
  const addstore_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\stores\\addstore.exe`], {
    stdio: 'ignore'
  });
  const mongo_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mongo.bat`], {
    stdio: 'ignore'
  });
  const gc_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_gc.bat ${javaPath}`], {
    stdio: 'ignore'
  });
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`], {
    stdio: 'ignore'
  });
};

ipcMain.on('operationBoxBtn_1-stop-service', async (event) => {
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe & taskkill /f /im mitmdump.exe`, (error, stdout, stderr) => {
    if (error) {
      console.error(`${error}`);
      return;
    }
    console.log(`stdout: ${stdout}\nsuccess`);
    console.log(`stderr: ${stderr}\nerror`);
    event.sender.send('operationBoxBtn_1-success');
  });
});

ipcMain.on('operationBoxBtn_2-run-game', (event) => {
  if (gamePath != "") {
    exec(`start "" "${gamePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`${error}`);
        return;
      }
      console.log(`stdout: ${stdout}\nsuccess`);
      event.sender.send('operationBoxBtn_2-success');
      console.log(`stderr: ${stderr}\nerror`);
    });
  } else {
    dialog.showMessageBox(win, {
      type: 'info',
      title: '启动游戏',
      message: '游戏路径不存在！请点击“选择路径”选择游戏路径！',
      buttons: ['确定']
    });
  }
});