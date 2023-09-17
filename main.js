const { app, BrowserWindow, ipcMain, shell, dialog, Menu, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Winreg = require('winreg');
const iconv = require('iconv-lite');

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
  gateServerPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, 'GateServer'),
  entryPath: path.join(app.isPackaged ? path.dirname(app.getAppPath()) : __dirname, '.')
};

let win;
let config_version = 1;
let gamePath;
let gamePathDir;
let patchExists = false;
let action;
let javaPath;
let finalJavaPath;
let resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top"];
let gcInput = new Array(4);
let proxyInput = new Array(2);

function packageNec() {
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

  fs.writeFile(path.join(global.packagedPaths.dataPath, 'add_root_crt.bat'), add_root_crt_batch, (err) => {
    if (err) {
      console.error('Err:', err);
    } else {
      console.log('Created add_root_crt.bat');
    }
  });
};

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

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.exit();
  }
});

app.on('before-quit', () => {
  exec(`taskkill /f /im curl.exe`);
  exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`)
  exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`)
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

packageNec();

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

function sendPatchGamePath() {
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
        console.log('../app.config.json Updated Successfully');
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


function executeSelfSignedKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_selfsigned.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log("selfSignedKeystore");
    console.log(stderr);
  });
};


function executofficialKeystore() {
  exec(`copy "${global.packagedPaths.dataPath}\\keystore_official.p12" "${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\keystore.p12"`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.log(error);
      return;
    }
    console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK'));
    console.log("officialKeystore");
    console.log(stderr);
  });
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
          if (appConfig.grasscutter.host!="127.0.0.1" || appConfig.grasscutter.host!="localhost"){
            appConfig.grasscutter.dispatch.host = gcInputRender[3];
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
        console.log('../app.config.json Created successfully');
      }); 
      await writeAcConfig("main-service-save", gcInputRender, proxyInputRender);

    } else {
      if (appConfig.game) {
        gamePath = appConfig.game.path;
        gamePathDir = path.dirname(gamePath);
        sendPatchGamePath();
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
          if (appConfig.grasscutter.host!="127.0.0.1" || appConfig.grasscutter.host!="localhost"){
            appConfig.grasscutter.dispatch.host = gcInput[3];
          } else {
            appConfig.grasscutter.dispatch.host = "127.0.0.1";
          }
        }
        gcInput[0] = appConfig.grasscutter.host;
        gcInput[1] = appConfig.grasscutter.port;
        gcInput[2] = appConfig.grasscutter.dispatch.port;
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
        java: { exec: "" }
      };
      gamePath = "";
      gamePathDir = path.dirname(gamePath);
      javaPath = "";
      console.log(javaPath);
      await fs.promises.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(app_config, null, 2), 'utf8');
      fixAppConfig();
      console.log('../app.config.json Created successfully');
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
          console.log('../app.config.json Updated Successfully');
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
  await new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-o', jdkZipPath, '-L', jdkURL]);
    curl.stderr.on('data', (data) => {
      const strData = data.toString();
      console.log(strData);
      win.webContents.send('update_progress', strData, 'Java Developement Kit');
    });
    curl.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    curl.on('close', (code) => {
      if (code === 0) {
        win.webContents.send('download-jdk', 'jdk-true');
        console.log('JDK downloaded successfully.');

        const jdkExtractPath = path.join(__dirname, '../');
        const jdk_zip = new AdmZip(jdkZipPath);
        const jdkPath = path.join(__dirname, '../jdk-17.0.2');
        jdk_zip.extractAllTo(jdkExtractPath, true);
        fs.unlink(jdkZipPath, (err) => {
          if (err) {
            console.error('Error deleting JDK ZIP file:', err);
            reject(err);
            return;
          }
          console.log('JDK ZIP file deleted successfully.');
          process.env.PATH = `${process.env.PATH};${jdkPath}`;
          javaPath = jdkPath;
          console.log(jdkPath);
          fs.readFile(`${global.packagedPaths.entryPath}\\app.config.json`, 'utf8', (err, data) => {
            if (err) {
              console.error('Err when reading config file:', err);
              reject(err);
              return;
            }
            const config = JSON.parse(data);
            if (javaPath != "") {
              if (config.java) {
                config.java.path = `${javaPath}`;
              } else {
                config.java = { path: `${javaPath}` };
              }
            }
            fs.writeFile(`${global.packagedPaths.entryPath}\\app.config.json`, JSON.stringify(config, null, 2), 'utf8', err => {
              if (err) {
                console.error('Err when writing config file:', err);
                reject(err);
                return;
              }
              fixAppConfig();
              console.log('../app.config.json Updated Successfully');
              resolve();
            });
          });
        });
      } else {
        fs.unlinkSync(jdkZipPath);
        console.error('Error downloading JDK:', new Error(`curl process exited with code ${code}`));
        reject(new Error(`curl process exited with code ${code}`));
      }
    });
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
  resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top"];
});

ipcMain.on('resGetWayButton_1-set', () => {
  resURL = ["https://github.com", "https://gitlab.com"];
});

ipcMain.on('officialKeystoreButton-set', () => {
  executofficialKeystore();
});

ipcMain.on('selfSignedKeystoreButton-set', () => {
  executeSelfSignedKeystore();
});


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
                console.log('../app.config.json Updated Successfully');
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
        sendPatchGamePath();
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
