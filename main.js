const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const util = require('util');
const child_process = require('child_process');
const { exec } = require('child_process');
const fs = require('fs');
const AdmZip = require('adm-zip');
const https = require('https');


let win;
let gamePath;
let gamePathDir;
let patchExists = false;
let action;

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

  if (!app.isPackaged) {win.webContents.openDevTools();}
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


function checkJava(){
  exec('java -version', (error, stdout, stderr) => {
    if (error) {
        console.log('Java is not installed. Downloading JDK...');
        downloadJDK();
    } else {
        if (stderr.includes('Java(TM) SE Runtime Environment') && !stderr.includes('HotSpot')) {
            console.log('JRE is installed. Downloading JDK...');
            downloadJDK();
        } else if (stderr.includes('Java(TM) SE Runtime Environment') && stderr.includes('HotSpot')) {
            console.log('JDK is already installed.');
        } else {
            console.log('Unknown Java installation. Downloading JDK to be safe...');
            downloadJDK();
        }
    }
  });
};

function downloadJDK() {
  const jdkURL = 'https://repo.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_windows-x64_bin.zip';
  const jdkPath = path.join(__dirname, '../jdk-17.0.2.zip');
  const file = fs.createWriteStream(jdkPath);
  https.get(jdkURL, (response) => {
      response.pipe(file);
      file.on('finish', () => {
          file.close(() => {
              console.log('JDK downloaded successfully.');
              const jdkZipPath = path.join(__dirname, '../jdk-17.0.2.zip');
              const jdkExtractPath = path.join(__dirname, '../');
              const jdk_zip = new AdmZip(jdkZipPath);
              jdk_zip.extractAllTo(jdkExtractPath, overwrite=true);
              fs.unlink(jdkZipPath, (err) => {
                  if (err) {
                      console.error('Error deleting JDK ZIP file:', err);
                  } else {
                      console.log('JDK ZIP file deleted successfully.');
                  }
              });
          });
      });
  }).on('error', (error) => {
      fs.unlinkSync(jdkPath);
      console.error('Error downloading JDK:', error);
  });
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
      exec(`copy ".\\GateServer\\data\\RSAPatch.dll" "${gamePathDir}\\version.dll"`, (error, stdout, stderr) => {
        if(error) {
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
      if (config.game.path == "") {} else {
        patchExists = true;
        action = "add_patch_succ";
        win.webContents.send('chooseGamePathButton_selected-file', gamePath, patchExists, action);
      };
    });
    
  }
}


function executeSelfSignedKeystore () {
  exec(`copy ".\\GateServer\\data\\keystore_selfsigned.p12" ".\\GateServer\\Grasscutter\\workdir\\stores\\keystore.p12"`, (error, stdout, stderr) => {
    if(error) {
      console.log(error);
      return;
    }
    console.log(stdout);
    console.log("selfSignedKeystore");
    console.log(stderr);
  });
};


function executofficialKeystore () {
  exec(`copy ".\\GateServer\\data\\keystore_official.p12" ".\\GateServer\\Grasscutter\\workdir\\stores\\keystore.p12"`, (error, stdout, stderr) => {
    if(error) {
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
    game: {
      path: ""
    },
    grasscutter: {
      port: 22102,
      host: "127.0.0.1",
      dispatch: {
        port: 443,
        ssl: "selfsigned"
      }
    },
    mongodb: {
      port: 27017
    }
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

ipcMain.on('resGetWayButton_0-set' , () => {
  patchURL="https://gh-proxy.btl-cdn.top/kuma-dayo/RSAPatch/releases/download/v1.6.0/RSAPatch.dll";
  resURL="https://glab-proxy.btl-cdn.top/YuukiPS/GC-Resources/-/archive/558556930c5886555328683b3609f7670f94f39c/GC-Resources-558556930c5886555328683b3609f7670f94f39c.zip?path=Resources";
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'Cloudflare',
    message: '获取资源方式已更改为 Cloudflare!',
    buttons: ['确定']
  });
});

ipcMain.on('resGetWayButton_1-set' , () => {
  patchURL="https://github.com/kuma-dayo/RSAPatch/releases/download/v1.6.0/RSAPatch.dll";
  resURL="https://gitlab.com/YuukiPS/GC-Resources/-/archive/558556930c5886555328683b3609f7670f94f39c/GC-Resources-558556930c5886555328683b3609f7670f94f39c.zip?path=Resources";
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

ipcMain.on('officialKeystoreButton-set' , () => {
  executofficialKeystore();
});

ipcMain.on('selfSignedKeystoreButton-set' , () => {
  executeSelfSignedKeystore();
});

ipcMain.on('chooseGamePathButton_open-file-dialog', (event) => {
  dialog.showOpenDialog({
    filters: [
      { name: '应用程序', extensions: ['exe'] }
    ],
    properties: ['openFile', ]
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

ipcMain.on('operationBoxBtn_0-run-main-service', (event) => {

});