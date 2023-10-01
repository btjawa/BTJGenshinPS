const { app, BrowserWindow, ipcMain, shell, dialog} = require('electron');
const path = require('path');
const fs = require('fs');
const yauzl = require("yauzl");
const { spawn, execSync } = require('child_process');
const ini = require('ini');
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
};

const config_version = 1;
const logDirPath = path.join(global.packagedPaths.rootPath, 'log');
const EXPRESS_PORT = 52805;
const defaultAppConfig = { 
  version: config_version,
  getRes: "proxy",
  game: { path: "", "_3dmigoto": path.join(global.packagedPaths.gateServerPath, "3DMigoto", "3DMigoto Loader.exe") },
  grasscutter: { port: "22102", host: "127.0.0.1", dispatch: { port: "443", host: "127.0.0.1", ssl: "selfsigned" } },
  proxy: { port: "443", host: "127.0.0.1" },
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
let finalJavaPath;
let resURL = new Array(3);
let gcInput = new Array(3);
let proxyInput = new Array(2);
let modsList = [];
let proxyPort = 54321;



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



// PROCESS



console.log("Start Logging...")



// EXPRESS PROCESS



express_app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  const BLACKLIST = [
    /^\/app-main\//,
    /^\/BGP-docs\//
  ]
  const isBlacklisted = BLACKLIST.some(pattern => pattern.test(req.path));
  if (isBlacklisted) {
    if (!req.headers['user-agent'] || !req.headers['user-agent'].includes('Electron')) {
        return res.status(403).send(`<body>
        <center><h1>403 Forbidden</h1></center>
        <hr><center>btjawa</center>
        </body>`);
    }
  }
  express_app.get('*', (req, res) => {
    return res.status(404).send(`<body>
    <center><h1>404 Not Found</h1>
    <h2>尝试访问<a href="http://localhost:${EXPRESS_PORT}">根目录</a>以重新路由</2>
    </center>
    <hr><center>btjawa</center>
    </body>`);
  });
  next();
});
express_app.use('/BGP-docs', express.static(path.join(__dirname, './dist/docs')));
express_app.use('/app-main', express.static(path.join(__dirname, './dist')));
express_app.listen(EXPRESS_PORT, () => {
  console.log(`Doc server is running on http://localhost:${EXPRESS_PORT}`);
});



// MAIN PROCESS



app.whenReady().then(async (event) => {
  await createWindow();
});

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  console.log('App is quitting...\nSaving config...');
  exec(`taskkill /f /im curl.exe`);
  exec(`del ${global.packagedPaths.dataPath}\\run_gc.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mongo.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_mitm_proxy.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\add_root_crt.bat`);
  exec(`del ${global.packagedPaths.dataPath}\\run_3dmigoto.bat`);
});

(async () => {
  await createMitmCA();
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
  } catch(err) {
    console.log("app.config.json not exists");
  }
})();



// IPCMAIN PROCESS



ipcMain.on('render-ready', async (event) => {
  if (!app.isPackaged) {
    win.webContents.openDevTools();
  }
  await rwAppConfig();
  await rwMods();
  await rwPlugs();
  await updateAPP();
  await checkGateServer();
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
  app.quit();
  await rwAppConfig("simple-save", gcInputRender, proxyInputRender, "simple-save");
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

ipcMain.on('officialKeystoreButton-set', () => {
  officialKeystore();
});

ipcMain.on('selfSignedKeystoreButton-set', () => {
  selfSignedKeystore();
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
    await rwAppConfig("simple-save", gcInputRender, proxyInputRender, "simple-save");
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const result = await dialog.showOpenDialog({
      title: '请选择配置文件将要导出至的文件夹',
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const exportPath = result.filePaths[0];
        exec(`copy "${path.join(global.packagedPaths.entryPath, "app.config.json")}" "${path.join(exportPath, `app.config_${currentMoment}.json`)}"`, {encoding: "binary"}, (error, stdout, stderr) => {
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
            const resp0 = await dialog.showMessageBox(win, {
              type: 'info',
              title: '导入应用配置',
              message: '导入成功！将重启应用以应用更改',
            });
            app.relaunch();
            app.exit(0);
          };
          if (stderr) {
            console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK'))
            const resp1 = await dialog.showMessageBox(win, {
              type: 'warning',
              title: '导入应用配置',
              message: '导入失败！',
            });
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
          javaPath = result.filePaths[0];
          console.log(javaPath);
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

ipcMain.on('operationBoxBtn_1-stop-service', async (event) => {
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe & taskkill /f /im mitmdump.exe & taskkill /f /im cmd.exe & reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyEnable /t REG_DWORD /d 0 /f & reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /d "" /f`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      return;
    }
    if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
    if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    event.sender.send('operationBoxBtn_1-success');
  });
});

ipcMain.on('operationBoxBtn_2-run-game', (event) => {
  run_game();
});

ipcMain.on('operationBoxBtn_3-run-3dmigoto', (event) => {
  run_3dmigoto();
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
      if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    });
    exec(`for /r ${global.packagedPaths.gateServerPath}\\MongoDB\\data %G in (*.*) do del /s /q %G & for /d %G in (${global.packagedPaths.gateServerPath}\\MongoDB\\data\\*) do rmdir /s /q %G`, { encoding: 'binary' }, (error, stdout, stderr) => {
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



// FUNCTION



function writeToLog(message, type = "log") {
  fs.appendFileSync(path.join(logDirPath, `${currentMoment}.log`), `[${type} ${currentMomentLog}] ${message}\n`);
}

async function createWindow() {
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

  win.loadURL(`http://localhost:${EXPRESS_PORT}/app-main`);

  win.on('maximize', function () {
    win.webContents.send('main-window-max');
  })
  win.on('unmaximize', function () {
    win.webContents.send('main-window-unmax');
  })
}

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
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer /t REG_SZ /d "127.0.0.1:${proxyPort}" /f\r
echo.\r
echo 正在启动Mitm代理...\r
cd "${global.packagedPaths.gateServerPath}\\Proxy"\r
mitmdump -s proxy.py --ssl-insecure --set block_global=false --listen-port ${proxyPort}\r
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

async function createMitmCA () {
  if (fs.existsSync(path.join(process.env.USERPROFILE, '.mitmproxy'))) {
    console.log(path.join(process.env.USERPROFILE, '.mitmproxy') + " exist.")
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
            console.log('Error killing mitmdump:', error);
          } else {
            console.log('Successfully killed mitmdump:', stdout);
          }
        });
      }
    }, 100);
  }
}

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

async function fetchRelease(resURL) {
  const response = await fetch(`${resURL[2]}/repos/btjawa/BTJGenshinPS/tags`);
  const tags = await response.json();
  const latestTag = tags[0].name.replace('v', '');
  const latestMatches = latestTag.match(/^([\d\.]+)-?(\w+)?/);
  const latestTagVersion = latestMatches[1];
  const latestTagType = latestMatches[2];
  return {
      latestTagVersion,
      latestTagType,
      latestTag
  };
}

async function unzipFile(inputZipPath, outputDirectory) {
  return new Promise((resolve, reject) => {
    yauzl.open(inputZipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        const outputPath = path.join(outputDirectory, entry.fileName);
        if (/\/$/.test(entry.fileName)) {
          fs.mkdir(outputPath, { recursive: true }, (err) => {
            if (err) {
              reject(err);
              return;
            }
            zipfile.readEntry();
          });
        } else {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            fs.mkdir(path.dirname(outputPath), { recursive: true }, (err) => {
              if (err) {
                reject(err);
                return;
              }
              readStream.pipe(fs.createWriteStream(outputPath));
              readStream.on("end", () => {
                zipfile.readEntry();
              });
            });
          });
        }
      });
      zipfile.on("end", () => {
        resolve();
      });
      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}

async function updateAPP() {
  try {
    console.log("Current Version:", currentVersion);
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
    const { latestTagVersion, latestTagType, latestTag } = await fetchRelease(resURL);

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
          const appZipPath = path.join(global.packagedPaths.entryPath, "BTJGenshinPS-win32-ia32-app.zip");
          await unzipFile(appZipPath, appExtractPath);

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
          const resp1 = await dialog.showMessageBox(win, {
            type: 'info',
            title: '更新',
            message: '将重启应用以应用更改',
            buttons: ['确定']
          });
          console.log("Restart APP to Complete Update");
          spawn('cmd.exe', ['/c', `${path.join(global.packagedPaths.entryPath, 'update_app.bat')}`], {
            detached: true,
            stdio: 'ignore'
          }).unref();
          await rwAppConfig("simple-save", gcInputRender, proxyInputRender, "simple-save");
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


async function checkGateServer() {
  try {
    await fs.promises.access(global.packagedPaths.gateServerPath);
  } catch(err) {
    if (err.code === "ENOENT") {
      console.log("GateServer not found");
      if (!app.isPackaged) {
        const resp0 = await dialog.showMessageBox(win, {
          type: 'info',
          title: 'GateServer',
          message: 'GateServer不存在！是否自动下载？',
          buttons: ['确定', '取消'],
          defaultId: 1,
          cancelId: 1
        });
        if (resp0.response === 0) {
          const { latestTagVersion, latestTagType } = await fetchRelease(resURL);
          win.webContents.send('gateserver_install');
          const downloadGateServerURL = `${resURL[0]}/btjawa/BTJGenshinPS/releases/download/v${latestTagVersion}-${latestTagType}/BTJGenshinPS-${latestTagVersion}-win32-ia32-${latestTagType}.zip`;
          console.log("FULL URL:", downloadGateServerURL);
          await downloadFile(downloadGateServerURL, path.join(global.packagedPaths.entryPath, `BTJGenshinPS-win32-ia32.zip`), "GateServer");
          win.webContents.send('gateserver_install_download_complete');
          console.log("Download GateServer Completed");

          const appExtractPath = path.join(global.packagedPaths.entryPath, "temp_gateserver");
          const appZipPath = path.join(global.packagedPaths.entryPath, "BTJGenshinPS-win32-ia32.zip");

          await unzipFile(appZipPath, appExtractPath);

          await fs.promises.unlink(appZipPath, (err) => {
            if (err) {
              console.error('Error deleting APP ZIP file:', err);
              reject(err);
              return;
            }
            console.log('APP ZIP file deleted successfully.');
            console.log(appZipPath);
          });

          try {
            execSync(`xcopy "${path.join(appExtractPath, "resources", "GateServer")}\\" "${path.join(global.packagedPaths.entryPath, "GateServer")}\\" /E /Y`,{ encoding: 'binary' },(error,stdout,stderr) => {
              if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
              if (stdout) { console.log(iconv.decode(Buffer.from(out, 'binary'), 'GBK')) };
              if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
            });
            execSync(`rmdir /s /q ${path.join(global.packagedPaths.entryPath, "temp_gateserver")}`,{ encoding: 'binary' },(error,stdout,stderr) => {
              if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
              console.log('Temp GateServer deleted successfully.');
              if (stdout) { console.log(iconv.decode(Buffer.from(out, 'binary'), 'GBK')) };
              if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
            });
          } catch (err) {
              console.error('Error deleting Temp GateServer:', err);
          }
          
          const resp1 = await dialog.showMessageBox(win, {
            type: 'info',
            title: 'GateServer',
            message: '将重启应用以应用更改',
            buttons: ['确定']
          });
          app.relaunch();
          app.exit(0);
        } else {
          win.webContents.send("gateserver_cancel-install");
        }
      } else {
        console.log("GateServer not found");
        const resp1 = await dialog.showMessageBox(win, {
          type: 'warning',
          title: 'GateServer',
          message: 'GateServer不存在！',
        });
      }
    } else {
      console.error(err);
    }
  }
}


async function sendPatchGamePath(gamePath) {
  console.log(gamePath);
  const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8');
  let appConfig;
  try {
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
  } catch (err) {
    console.error(err);
  }
}


async function selfSignedKeystore() {
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
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
};


async function officialKeystore() {
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
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
};


async function resSetProxy () {
  resURL = ["https://gh-proxy.btl-cdn.top", "https://glab-proxy.btl-cdn.top", "https://api-gh-proxy.btl-cdn.top"];
  console.log("proxy");
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.grasscutter.getRes) {
      appConfig.grasscutter.getRes = "proxy";
    }
    await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('app.config.json Updated successfully');
  } catch (err) {
    console.error(err)
  }
}


async function resSetDirect () {
  resURL = ["https://github.com", "https://gitlab.com", "https://api.github.com"];
  console.log("direct");
  try {
    await fs.promises.access(path.join(global.packagedPaths.entryPath, "app.config.json"));
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf-8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.grasscutter.getRes) {
      appConfig.grasscutter.getRes = "direct";
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
    } else if (appConfig.getRes === "direct") {
      resSetDirect();
    }

    if (action === "main-service-save" || action === "simple-save") {
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
      await fs.promises.writeFile(path.join(global.packagedPaths.entryPath, "app.config.json"), JSON.stringify(appConfig, null, 2), 'utf8', async (err) => {
        if (err) {
          console.error('Err when writing config to file:', err);
          return;
        }
        console.log('app.config.json Created successfully');
      }); 
      await writeAcConfig("main-service-save", gcInputRender, proxyInputRender);

    } else {
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
        console.log(javaPath)
        win.webContents.send('chooseJavaPathButton_was-jdk', javaPath);
      }
      if (appConfig.grasscutter) {
        if (appConfig.grasscutter.dispatch) {
          if (appConfig.grasscutter.dispatch.ssl == "selfsigned") {
            selfSignedKeystore();
          }
          else if (appConfig.grasscutter.dispatch.ssl == "official") {
            officialKeystore();
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
        win.webContents.send('proxy_text', proxyInput);
      }
      await writeAcConfig();
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      gcInput = ["127.0.0.1", "22102", "443", "127.0.0.1"]
      proxyInput = ["127.0.0.1", "443"];
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
      console.log(javaPath);
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

    if (action === "main-service-save" || action === "simple-save") {
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


async function checkJava() {
  try {
    const appConfigData = await fs.promises.readFile(path.join(global.packagedPaths.entryPath, "app.config.json"), 'utf8');
    const appConfig = JSON.parse(appConfigData);
    if (appConfig.java && appConfig.java.exec !== "") {
      javaPath = appConfig.java.exec;
      try {
        const { stdout } = await exec(`"${javaPath}" --version`, { encoding: 'binary' });
        if (stdout.includes('Java(TM) SE Runtime Environment')) {
          win.webContents.send('jdk-already-installed');
          console.log('JDK from config is valid.');
          return;
        }
      } catch (err) {
        console.log('appConfigured Java path is not valid JDK.');
      }
    }
    const { stdout, stderr } = await exec('java --version', { encoding: 'binary' });
    if (stdout.includes('Java(TM) SE Runtime Environment')) {
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
      if (stdout.includes('Java(TM) SE Runtime Environment')) {
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
    try {
      await fs.promises.access(path.join(global.packagedPaths.entryPath, 'jdk-17.0.2'));
      await fs.promises.rmdir(path.join(global.packagedPaths.entryPath, 'jdk-17.0.2'), { recursive: true });
    } catch(err) {}
    
    await downloadFile(jdkURL, jdkZipPath, 'Java Development Kit');
    win.webContents.send('download-jdk', 'jdk-true');
    console.log('JDK downloaded successfully.');

    const jdkExtractPath = global.packagedPaths.entryPath;
    const jdkPath = path.join(global.packagedPaths.entryPath, 'jdk-17.0.2');

    await unzipFile(jdkZipPath, jdkExtractPath);

    javaPath = jdkPath;
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
    if (allPlugs.length == 0) {
      win.webContents.send('plugs-list', "empty");
    } else {
      win.webContents.send('plugs-list', allPlugs);
    }
  } catch(err) {
    console.error(err);
  }
}

async function update(gc_org_url) {
  const orgUrl = new URL(gc_org_url);
  try {
    await downloadFile(`${resURL[0]}${orgUrl.pathname}`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download`, "Grasscutter服务端");
    await downloadFile(`${resURL[1]}/YuukiPS/GC-Resources/-/archive/4.0/GC-Resources-4.0.zip`, `${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download`, "Resources");
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\grasscutter.jar`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      if (stderr) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stdout) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    })
    exec(`move ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip.download ${global.packagedPaths.gateServerPath}\\Grasscutter\\workdir\\resources.zip`,{ encoding: 'binary' },(error,stdout,stderr) => {
      if (error) { console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK')); }
      if (stderr) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
      if (stdout) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
    })
    win.webContents.send('update_complete');
    console.log("Update Completed");
  } catch (error) {
    console.log(error);
  }
}


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


async function run_main_service (gcInputRender, proxyInputRender) {
  await rwAppConfig("main-service-save", gcInputRender, proxyInputRender)
  exec(`taskkill /f /im java.exe & taskkill /f /im mongod.exe`, { encoding: 'binary' }, (error, stdout, stderr) => {
    if (error) {
      console.error(iconv.decode(Buffer.from(error.message, 'binary'), 'GBK'));
      return;
    }
    if (stdout) { console.log(iconv.decode(Buffer.from(stdout, 'binary'), 'GBK')) };
    if (stderr) { console.error(iconv.decode(Buffer.from(stderr, 'binary'), 'GBK')) };
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
  javaPath == "java" ? finalJavaPath = "java" : finalJavaPath = `${path.join(javaPath, "bin", "java")}`;
  console.log(finalJavaPath)
  const gc_terminal = spawn('cmd.exe', ['/c', `start ${global.packagedPaths.dataPath}\\run_gc.bat  ${finalJavaPath}`], {
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
    dialog.showMessageBox(win, {
      type: 'info',
      title: '启动游戏',
      message: '游戏路径不存在！请点击“选择路径”选择游戏路径！',
      buttons: ['确定']
    });
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
          dialog.showMessageBox(win, {
            type: 'info',
            title: '配置游戏路径',
            message: '游戏路径不存在！请点击“选择路径”选择游戏路径！',
            buttons: ['确定']
          });
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
        dialog.showMessageBox(win, {
          type: 'info',
          title: '注入3DMigoto',
          message: '3DMigoto路径不存在！请在设置中点击“选择3DMigoto路径”选择路径！',
          buttons: ['确定']
        });
      }
    }
}