const { app, BrowserWindow, ipcMain, shell, dialog} = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const util = require('util');
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
  docsPath: app.isPackaged ? path.join(path.dirname(app.getAppPath()), 'docs') : path.join(__dirname, 'dist', 'docs'),
};

const logDirPath = path.join(global.packagedPaths.rootPath, 'log');

if (!fs.existsSync(logDirPath)) {
  fs.mkdirSync(logDirPath);
}

function writeToLog(message, type = "log") {
  fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `[${type} ${currentMomentLog}] ${message}\n`);
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

console.log("Start Logging...")

const EXPRESS_PORT = 52805;

express_app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (!req.headers['user-agent'] || !req.headers['user-agent'].includes('Electron')) {
      return res.status(403).send(`<body>
      <center><h1>403 Forbidden</h1></center>
      <hr><center>btjawa</center>
      </body>`);
  }

  next();
});

express_app.use('/BGP-docs', express.static(global.packagedPaths.docsPath));

express_app.use('/main', express.static(path.join(__dirname, './dist')));

express_app.listen(EXPRESS_PORT, () => {
  console.log(`Doc server is running on http://localhost:${EXPRESS_PORT}`);
});

let win;
let config_version = 1;
let gamePath;
let gamePathDir;
let patchExists = false;
let action;
let javaPath;
let finalJavaPath;
let resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top", "https://api-gh-proxy.btl-cdn.top"];
let gcInput = new Array(3);
let proxyInput = new Array(2);

async function packageNec() {
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
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "127.0.0.1:54321" /f\r
echo.\r
echo 正在启动Mitm代理...\r
cd "${global.packagedPaths.gateServerPath}\\Proxy"\r
mitmdump -s proxy.py --ssl-insecure --set block_global=false --listen-port 54321\r
echo 清除系统代理...\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f\r
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f\r
exit.\r`;

  const add_root_crt_batch =`@echo off\r
chcp 65001>nul\r
%1 start "" mshta vbscript:createobject("shell.application").shellexecute("""%~0""","::",,"runas",1)(window.close)&exit\r
echo 导入根证书...\r
certutil -addstore -f "Root" "${global.packagedPaths.dataPath}\\root.crt"\r
certutil -addstore -f "Root" "%USERPROFILE%\\.mitmproxy\\mitmproxy-ca-cert.cer"\r
exit\r`;

try {
  await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, 'run_gc.bat'), gc_batch);
  console.log('Created run_gc.bat');

  await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, 'run_mongo.bat'), mongo_batch);
  console.log('Created run_mongo.bat');

  await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, 'run_mitm_proxy.bat'), mitm_proxy_batch);
  console.log('Created run_mitm_proxy.bat');

  await fs.promises.writeFile(path.join(global.packagedPaths.dataPath, 'add_root_crt.bat'), add_root_crt_batch);
  console.log('Created add_root_crt.bat');

} catch (err) {
  console.error(err);
}

};

function compareVersions(v1, v1suffix, v2, v2suffix) {
  let s1 = v1.split('.').map(Number);
  let s2 = v2.split('.').map(Number);

  for(let i = 0; i < Math.max(s1.length, s2.length); i++) {
      let n1 = s1[i] || 0;
      let n2 = s2[i] || 0;

      if (n1 > n2) return 1;
      if (n2 > n1) return -1;
  }

  const versionSuffixPriority = {
    'alpha': 1,
    'beta': 2,
    '': 3
  };
  
  if (versionSuffixPriority[v1suffix] > versionSuffixPriority[v2suffix]) return 1;
  if (versionSuffixPriority[v1suffix] < versionSuffixPriority[v2suffix]) return -1;
  
  return 0;
}

async function updateAPP() {
  try {
    console.log("Current Version:", currentVersion);
    
    const response = await fetch(`${resURL[2]}/repos/btjawa/BTJGenshinPS/tags`);
    const tags = await response.json();
    const latestTag = tags[0].name.replace('v', '');
    const latestMatches = latestTag.match(/^([\d\.]+)-?(\w+)?/);
    const latestTagVersion = latestMatches[1];
    const latestTagType = latestMatches[2];

    const currentMatches = currentVersion.match(/^([\d\.]+)-?(\w+)?/);
    let currentVersionNum;
    let currentVersionType;
    if (currentMatches) {
        currentVersionNum = currentMatches[1];
        currentVersionType = currentMatches[2];
    } else {
      console.log("Format err:",currentVersion);
      return;
    }
    if (compareVersions(latestTagVersion, latestTagType, currentVersionNum, currentVersionType) === 1) {
      if (app.isPackaged) {
        console.log("Update available:", latestTag);
        const resp0 = await dialog.showMessageBox(win, {
          type: 'info',
          title: '更新',
          message: 'Github发布了新版本！是否更新APP？（不影响游戏数据）',
          buttons: ['确定', '取消'],
          defaultId: 1,
          cancelId: 1
        });
        if (resp0.response === 0) {
          win.webContents.send('app_update');
          const downloadAppURL = `${resURL[0]}/btjawa/BTJGenshinPS/releases/download/v${latestTagVersion}-${latestTagType}/BTJGenshinPS-${latestTagVersion}-win32-ia32-app-${latestTagType}.zip`;
          console.log("APP URL:", downloadAppURL);
          await downloadFile(downloadAppURL, path.join(global.packagedPaths.entryPath, `BTJGenshinPS-win32-ia32-app.zip`), "App本体");
          win.webContents.send('app_update_download_complete');
          console.log("Download APP Update Completed");

          const appExtractPath = path.join(global.packagedPaths.entryPath, "temp_update");
          const app_zip = new AdmZip(path.join(global.packagedPaths.entryPath, "BTJGenshinPS-win32-ia32-app.zip"));
          const appZipPath = path.join(global.packagedPaths.entryPath, "BTJGenshinPS-win32-ia32-app.zip");
          app_zip.extractAllTo(appExtractPath, true);

          fs.unlink(appZipPath, (err) => {
            if (err) {
              console.error('Error deleting APP ZIP file:', err);
              reject(err);
              return;
            }
            console.log('APP ZIP file deleted successfully.');
            console.log(appZipPath);
          });

          const update_app_batch = `@echo off\r
  chcp 65001>nul\r
  title Update\r
  for /D %%D in (*) do (\r
    if /I not "%%D"=="resources" (\r
        rmdir /s /q "%%D"\r
    )\r
  )\r
  for %%F in (*) do (\r
    del "%%F"\r
  )\r
  rmdir /s /q ${global.packagedPaths.entryPath}\\data\r
  rmdir /s /q ${global.packagedPaths.entryPath}\\docs\r
  del ${global.packagedPaths.entryPath}\\app.asar\r
  xcopy "${global.packagedPaths.entryPath}\\temp_update" . /E /Y\r
  rmdir /s /q "${global.packagedPaths.entryPath}\\temp_update"\r
  start "" BTJGenshinPS.exe\r
  del ${global.packagedPaths.entryPath}\\update_app.bat\r`;

          await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, 'update_app.bat'), update_app_batch, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('Created update_app.bat');
            }
          });
          console.log("Restart APP to Complete Update");

          spawn('cmd.exe', ['/c', `${path.join(global.packagedPaths.entryPath, 'update_app.bat')}`], {
            detached: true,
            stdio: 'ignore'
          }).unref();

          app.quit();
        }
      } else {
        const resp1 = await dialog.showMessageBox(win, {
          type: 'info',
          title: '更新',
          message: '有新Release！请前往Github查看以更新该开发版本！',
        });
      }
    } else {
      console.log("You are up to date! Github Latest Version:", latestTag);
  }
  } catch (error) {
      console.error(error);
  }
}

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

  win.loadURL(`http://localhost:${EXPRESS_PORT}/main`);

  win.on('maximize', function () {
    win.webContents.send('main-window-max');
  })
  win.on('unmaximize', function () {
    win.webContents.send('main-window-unmax');
  })

  if (!app.isPackaged) {
    setTimeout(() => {
      win.webContents.openDevTools();
    }, 500);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('App is quitting...');
  exec(`taskkill /f /im curl.exe`);
  exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`)
  exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`)
});

(async () => {
  await exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  await exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  await exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`)
  await exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`)
  await packageNec();
  await updateAPP();
})();

//create mitm ca crt
if (fs.existsSync(path.join(process.env.USERPROFILE, '.mitmproxy'))) {
  console.log(path.join(process.env.USERPROFILE, '.mitmproxy') + " exist.")
} else {
  exec(`start /B ${global.packagedPaths.gateServerPath}\\Proxy\\mitmdump.exe`, { encoding: 'binary' }, (stdout, error,stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log(stderr);
  });
  const checkMitm = setInterval(() => {
    if (fs.existsSync(path.join(process.env.USERPROFILE, '.mitmproxy'))) {
      clearInterval(checkMitm);
      exec('taskkill /f /im mitmdump.exe', { encoding: 'binary' }, (error, stdout, stderr) => {
        if (error) {
          console.log('Error killing mitmdump:', error);
        } else {
          console.log('Successfully killed mitmdump:', stdout);
        }
      });
    }
  }, 100);
}

async function fixAppConfig() {
  try {
    await fs.promises.access(`${global.packagedPaths.entryPath}\\app.config.json`);
    let data = await fs.promises.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf-8');
    while (data.length) {
      try {
        JSON.parse(data);
        console.log("fixed app.config.json")
        break;
      } catch (err) {
        data = data.slice(0, -1);
      }
    }
    if (data.length) {
      await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, data, 'utf-8');
    } else {
      console.error("connot fix app.config.json")
    }
  } catch(err) {}
}

function sendPatchGamePath(gamePath) {
  console.log(gamePath)
  if (fs.existsSync(`${gamePathDir}\\version.dll`)) {
    fs.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf8', (err, data) => {
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
      fs.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(config, JSON.stringify(config, null, 2), 2), 'utf8', err => {
        if (err) {
          console.error('Err when writing config file:', err);
          return;
        }
        console.log('app.config.json Updated Successfully');
      });
    });
  } else {
    patchExists = false;
    win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists);
    if (gamePath != "") {
      exec(`copy "${global.packagedPaths.dataPath}\\RSAPatch.dll" "${gamePathDir}\\version.dll"`, { encoding: 'binary' }, (error, stdout, stderr) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
        console.log("RSA Patched");
        console.log(stderr);
      });
    };
    fs.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf8', (err, data) => {
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


async function executeSelfSignedKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_selfsigned.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log("selfSignedKeystore");
    console.log(stderr);
  });
  try {
    await fs.promises.access(`${global.packagedPaths.entryPath}\\app.config.json`);
    const appConfigData = await fs.promises.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.grasscutter.dispatch) {
      appConfig.grasscutter.dispatch.ssl = "selfsigned"
    }
    await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(appConfig, null, 2), 'utf8');
    fixAppConfig();
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
};


async function executofficialKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_official.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log("officialKeystore");
    console.log(stderr);
  });
  try {
    await fs.promises.access(`${global.packagedPaths.entryPath}\\app.config.json`);
    const appConfigData = await fs.promises.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.grasscutter.dispatch) {
      appConfig.grasscutter.dispatch.ssl = "official"
    }
    await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(appConfig, null, 2), 'utf8');
    fixAppConfig();
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
};


// app.config.json
async function rwAppConfig(action, gcInputRender, proxyInputRender) {
  try {
    await fs.promises.access(`${global.packagedPaths.entryPath}\\app.config.json`);
    const appConfigData = await fs.promises.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    
    if (action === "main-service-save") {
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
      await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(appConfig, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Err when writing config to file:', err);
          return;
        }
        fixAppConfig();
        console.log('app.config.json Created successfully');
      }); 
      await writeAcConfig("main-service-save", gcInputRender, proxyInputRender);

    } else {
      if (appConfig.game) {
        gamePath = appConfig.game.path;
        gamePathDir = path.dirname(gamePath);
        sendPatchGamePath(gamePath);
      }
      if (appConfig.java) {
        javaPath = appConfig.java.exec;
        console.log(javaPath)
      }
      if (appConfig.grasscutter) {
        if (appConfig.grasscutter.dispatch) {
          if (appConfig.grasscutter.dispatch.ssl == "selfsigned") {
            executeSelfSignedKeystore();
          }
          else if (appConfig.grasscutter.dispatch.ssl == "official") {
            executofficialKeystore();
          }
          if (appConfig.grasscutter.host!=="127.0.0.1" && appConfig.grasscutter.host!=="localhost" && appConfig.grasscutter.host!=="0.0.0.0"){
            appConfig.grasscutter.dispatch.host = "dispatchcnglobal.yuanshen.com";
          } else {
            appConfig.grasscutter.dispatch.host = "127.0.0.1";
          }
        }
        gcInput[0] = appConfig.grasscutter.host;
        gcInput[1] = appConfig.grasscutter.port;
        gcInput[2] = appConfig.grasscutter.dispatch.port;
        gcInput[3] = appConfig.grasscutter.dispatch.host;
        win.webContents.send('gc_text', gcInput[0], gcInput[1], gcInput[2]);
      }
      if (appConfig.proxy) {
        proxyInput[0] = appConfig.proxy.host;
        proxyInput[1] = appConfig.proxy.port;
        win.webContents.send('proxy_text', proxyInput[0], proxyInput[1]);
      }
      writeAcConfig();
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      gcInput[0] = "127.0.0.1";
      gcInput[1] = "22102";
      gcInput[2] = "443";
      gcInput[3] = "127.0.0.1";
      proxyInput[0] = "127.0.0.1";
      proxyInput[1] = "443";
      const app_config = {
        version: config_version,
        game: { path: "" },
        grasscutter: { port: "22102", host: "127.0.0.1", dispatch: { port: "443", host: "127.0.0.1", ssl: "selfsigned" } },
        proxy: { port: "443", host: "127.0.0.1" },
        mongodb: { port: "27017" },
        java: { exec: "java" }
      };
      gamePath = "";
      gamePathDir = path.dirname(gamePath);
      javaPath = "java";
      console.log(javaPath);
      await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(app_config, null, 2), 'utf8');
      fixAppConfig();
      console.log('app.config.json Created successfully');
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

    if (action == "main-service-save") {
      if (gcConfig.server.http) {
        gcConfig.server.http.accessAddress = gcInputRender[3];
        console.log("http.accessAddress " + gcConfig.server.http.accessAddress);
        gcConfig.server.http.bindPort = gcInputRender[2];
        console.log("http.bindPort " + gcConfig.server.http.bindPort);
      }
      if (gcConfig.server.game) {
        gcConfig.server.game.accessAddress = gcInputRender[0];
        console.log("game.accessAddress " + gcConfig.server.game.accessAddress);
        gcConfig.server.game.bindPort = gcInputRender[1];
        console.log("game.bindPort " + gcConfig.server.game.bindPort);
      }
      mitmConfig = mitmConfig.replace(/(REMOTE_HOST\s*=\s*)"([^"]+)"/g, (_, p2) => {
        console.log(`${p2}"${proxyInputRender[0]}"`);
        return `${p2}"${proxyInputRender[0]}"`;
      });
      mitmConfig = mitmConfig.replace(/(REMOTE_PORT\s*=\s*)([^"]+)/g, (_, p2) => {
        console.log(`${p2}${proxyInputRender[1]}`);
        return `${p2}${proxyInputRender[1]}`;
      });
    } else {
      if (gcConfig.server.http) {
        gcConfig.server.http.accessAddress = gcInput[3];
        console.log("http.accessAddress " + gcConfig.server.http.accessAddress);
        gcConfig.server.http.bindPort = gcInput[2];
        console.log("http.bindPort " + gcConfig.server.http.bindPort);
      }
      if (gcConfig.server.game) {
        gcConfig.server.game.accessAddress = gcInput[0];
        console.log("game.accessAddress " + gcConfig.server.game.accessAddress);
        gcConfig.server.game.bindPort = gcInput[1];
        console.log("game.bindPort " + gcConfig.server.game.bindPort);
      }
      mitmConfig = mitmConfig.replace(/(REMOTE_HOST\s*=\s*)"([^"]+)"/g, (_, p2) => {
        console.log(`${p2}"${proxyInput[0]}"`);
        return `${p2}"${proxyInput[0]}"`;
      });
      mitmConfig = mitmConfig.replace(/(REMOTE_PORT\s*=\s*)([^"]+)/g, (_, p2) => {
        console.log(`${p2}${proxyInput[1]}`);
        return `${p2}${proxyInput[1]}`;
      });
    }
    await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Grasscutter\\config.json`, JSON.stringify(gcConfig, null, 2), 'utf8');
    console.log('moded gc config');
    await fs.promises.writeFile(`${global.packagedPaths.gateServerPath}\\Proxy\\proxy_config.py`, mitmConfig, 'utf8');
    console.log('moded mitm config');
  } catch (err) {
    console.error(err)
  }
}


rwAppConfig();

async function checkJava() {
  try {
    const { stdout, stderr } = await exec('java --version', { encoding: 'binary' });
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log(stderr);

    if (stdout.includes('Java(TM) SE Runtime Environment') || stderr.includes('Java(TM) SE Runtime Environment')) {
      win.webContents.send('jdk-already-installed');
      console.log('JDK is already installed.');
      javaPath = 'java';
      await fs.promises.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf8', async (err, data) => {
        if (err) {
          console.error('Err when reading config file:', err);
          return;
        }
        const config = JSON.parse(data);
        if (javaPath !== "") {
          if (config.java) {
            config.java.exec = javaPath;
          } else {
            config.java = { exec: javaPath };
          }
        }
        await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(config, null, 2), 'utf8', err => {
          if (err) {
            console.error('Err when writing config file:', err);
            return;
          }
          fixAppConfig();
          console.log('app.config.json Updated Successfully');
        });
      });
    } else {
      if (fs.existsSync(`${javaPath}`)) {
        win.webContents.send('jdk-already-installed');
      } else {
        win.webContents.send('download-jdk', 'jdk-false');
        console.log('Java is not installed. Downloading JDK...');
        await downloadJDK();
      }
    }
  } catch (error) {
    console.log(error);
    if (fs.existsSync(`${javaPath}`)) {
      win.webContents.send('jdk-already-installed');
    } else {
      win.webContents.send('download-jdk', 'jdk-false');
      console.log('Java is not installed. Downloading JDK...');
      await downloadJDK();
    }
  }
}


async function downloadJDK() {
  const jdkURL = 'https://repo.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_windows-x64_bin.zip';
  const jdkZipPath = path.join(__dirname, '../jdk-17.0.2.zip');
  try {
      await downloadFile(jdkURL, jdkZipPath, 'Java Development Kit');
      win.webContents.send('download-jdk', 'jdk-true');
      console.log('JDK downloaded successfully.');

      const jdkExtractPath = path.join(__dirname, '../');
      const jdk_zip = new AdmZip(jdkZipPath);
      const jdkPath = path.join(__dirname, '../jdk-17.0.2');
      jdk_zip.extractAllTo(jdkExtractPath, true);

      fs.unlink(jdkZipPath);
      console.log('JDK ZIP file deleted successfully.');
      process.env.PATH = `${process.env.PATH};${jdkPath}`;
      javaPath = jdkPath;
      const configFile = path.join(global.packagedPaths.entryPath, 'app.config.json');
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

      if (javaPath != "") {
        if (config.java) {
          config.java.path = `${javaPath}`;
        } else {
          config.java = { path: `${javaPath}` };
        }
      }

      fs.writeFile(configFile, JSON.stringify(config, null, 2), 'utf8');
      fixAppConfig();
      console.log('app.config.json Updated Successfully');
  } catch (error) {
      console.error('Error:', error);
  }
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
    await downloadFile(`${resURL[0]}${orgUrl.pathname}`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download`, "Grasscutter服务端");
    await downloadFile(`${resURL[1]}/YuukiPS/GC-Resources/-/archive/4.0/GC-Resources-4.0.zip`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download`, "Resources");
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    })
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    })
    win.webContents.send('update_complete');
    console.log("Update Completed");
  } catch (error) {
    console.log(error);
  }
}

ipcMain.on('handelClose', () => {
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
  resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top", "https://api-gh-proxy.btl-cdn.top"];
});

ipcMain.on('resGetWayButton_1-set', () => {
  resURL = ["https://github.com", "https://gitlab.com", "https://api.github.com"];
});

ipcMain.on('officialKeystoreButton-set', () => {
  executofficialKeystore();
});

ipcMain.on('selfSignedKeystoreButton-set', () => {
  executeSelfSignedKeystore();
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

ipcMain.on('openGcToolsBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"))) {
    console.log("run gctools")
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"))
  } else {
    console.error("GcTools not found, try download");
    win.webContents.send("openGcToolsBtn_download-complete")
    (async () => {
      try {
        await downloadFile(`${resURL[0]}/jie65535/GrasscutterCommandGenerator/releases/download/v1.12.2/GcTools-v1.12.2.exe`, path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"), "GcTools v1.12.2");
      } catch (error) {
        console.error(error);
      }
    })();
    try {
      shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GcTools-v1.12.2.exe"))
      console.log("run gctools")
    } catch(err) {
      console.error(err)
    }
  }
})

ipcMain.on('openHandbookTXTBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GM Handbook"))) {
    console.log("open handbook txt")
    shell.openPath(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "GM Handbook", "GM Handbook - CHS.txt"))
  } else {
    console.error("Handbook txt not found");
    win.webContents.send("openHandbookTXTBtn_not-found")
  }
})

ipcMain.on('openHandbookHTMLBtn_try-open', () => {
  if (fs.existsSync(path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "data", "documentation"))) {
    console.log("open handbook html")
    shell.openExternal(`file://${path.join(global.packagedPaths.gateServerPath, "Grasscutter", "workdir", "data", "documentation", "handbook.html")}`);
    win.webContents.send("openHandbookHTMLBtn_open-html")
  } else {
    console.error("Handbook html not found");
    win.webContents.send("openHandbookHTMLBtn_not-found")
  }
})

ipcMain.on('chooseJavaPathButton_open-file-dialog', (event) => {
  dialog.showOpenDialog({
    title: '请定位到jdk文件夹，即bin的上一级',
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      exec(`"${result.filePaths[0]}\\bin\\java" -version`, { encoding: 'binary' },(error,stderr,stdout) => {
        if (error) {
          console.log(`Err ${error}`);
          return;
        }
        if (stdout){
          if (stdout.includes('Java(TM) SE Runtime Environment') && !stdout.includes('HotSpot')){
            win.webContents.send('chooseJavaPathButton_was-jre');
          } else if (stdout.includes('Java(TM) SE Runtime Environment') && stdout.includes('HotSpot')) {
            win.webContents.send('chooseJavaPathButton_was-jdk',javaPath);
            javaPath = result.filePaths[0];
            console.log(javaPath);
            fs.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf8', (err, data) => {
              if (err) {
                console.error('Err when reading config file:', err);
                return;
              }
              const config = JSON.parse(data);
              if (javaPath != "") {
                if (config.java) {
                  config.java.exec = `${javaPath}`;
                } else {
                  config.java = { exec: `${javaPath}` };
                }
              };
              fs.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(config, JSON.stringify(config, null, 2), 2), 'utf8', err => {
                if (err) {
                  console.error('Err when writing config file:', err);
                  return;
                }
                fixAppConfig();
                console.log('app.config.json Updated Successfully');
              });
            });
          } else {
            win.webContents.send('chooseJavaPathButton_not-valid');
          }
        }
      });
    }
  }).catch(err => {
    console.log(err);
  });
});

ipcMain.on('chooseGamePathButton_open-file-dialog', (event) => {
  dialog.showOpenDialog({
    title: '请定位到游戏文件夹并选择exe文件',
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
        sendPatchGamePath(gamePath);
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
      exec(`rm "${gamePathDir}\\version.dll"`, { encoding: 'binary' }, (error, stdout, stderr) => {
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

ipcMain.on('operationBoxBtn_0-run-main-service', async (event, gcInputRender, proxyInputRender) => {
  await checkJava();
  run_main_service(gcInputRender, proxyInputRender);
});

async function run_main_service (gcInputRender, proxyInputRender) {
  await rwAppConfig("main-service-save", gcInputRender, proxyInputRender)
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
  });
  const add_root_crt_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\add_root_crt.bat`], {
    stdio: 'ignore'
  });
  const mongo_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mongo.bat`], {
    stdio: 'ignore'
  });
  const proxy_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`], {
    stdio: 'ignore'
  });
  javaPath == "java" ? finalJavaPath = "java" : finalJavaPath = `${javaPath}\\bin\\java`;
  const gc_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_gc.bat  ${finalJavaPath}`], {
    stdio: 'ignore'
  });
}

ipcMain.on('operationBoxBtn_1-stop-service', async (event) => {
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe & taskkill /f /im mitmdump.exe & reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f & reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    event.sender.send('operationBoxBtn_1-success');
  });
});

ipcMain.on('operationBoxBtn_2-run-game', (event) => {
  if (fs.existsSync(`${gamePath}`)) {
    exec(`start "" "${gamePath}"`, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`${error}`);
        return;
      }
      console.log(`${stdout}\nsuccess`);
      event.sender.send('operationBoxBtn_2-success');
      console.log(`${stderr}\nerror`);
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

ipcMain.on('clear_data', async (event) => {
  const resp0 = await dialog.showMessageBox(win, {
    type: 'warning',
    title: '恢复出厂',
    message: '确定要恢复出厂吗？这将会删除所有的使用痕迹，包括你的游戏数据！！！被删除的数据将无法找回！！！',
    buttons: ['确定', '取消'],
    defaultId: 1,
    cancelId: 1
  });

  if (resp0.response === 0) {
    win.webContents.send('clearing_data');
    exec(`rm ${global.packagedPaths.entryPath}\\app.config.json`,{ encoding: 'binary' },(error,stdout,stderr) => {        
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    exec(`for /r ${global.packagedPaths.gateServerPath}\\MongoDB\\data %G in (*.*) do del /s /q %G & for /d %G in (${global.packagedPaths.gateServerPath}\\MongoDB\\data\\*) do rmdir /s /q %G`, { encoding: 'binary' }, (error, stdout, stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    exec(`rmdir /s /q "${global.packagedPaths.gateServerPath}\\Grasscutter\\GM Handbook"`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\logs`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\cache`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    exec(`rmdir /s /q ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\data\\gacha`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
      console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'));
    });
    const resp2 = await dialog.showMessageBox(win, {
      type: 'info',
      title: '恢复出厂',
      message: '将重启应用以应用更改',
      buttons: ['确定']
    });
    app.relaunch();
    app.exit(0);
  }
});
