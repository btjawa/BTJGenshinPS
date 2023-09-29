const { ipcRenderer } = require('electron');
const iziToast = require("izitoast");
const path = require('path');
const fs = require('fs');

let dragbar_close = document.getElementById('dragbar_close');
let dragbar_minimize = document.getElementById('dragbar_min');
let dragbar_window = document.getElementById('dragbar_window');
let dragbar_maximize = document.getElementById('dragbar_maximize');
let dragbar_question = document.getElementById('dragbar_question');
let chooseGamePathButton = document.querySelector('button[name="choose_game_path"]');
let chooseJavaPathButton = document.querySelector('button[name=choose_java_path]');
let choose3DMigotoPathButton = document.querySelector('button[name=choose_3dmigoto_path]');
let gamePathInput = document.querySelector('input[name="game_path"]');
let javaPathInput = document.querySelector('input[name="java_path"]')
let _3DMigotoPathPathInput = document.querySelector('input[name="3dmigoto_path"]')
let restoreOfficialButton = document.querySelector('button[name="restore_official"]');
let resGetWayButton_0 = document.querySelector('.res_getway_0');
let resGetWayButton_1 = document.querySelector('.res_getway_1');
let gcVersionLink = document.querySelector('.gc_version');
let resVersionLink = document.querySelector('.res_version');
let officialKeystoreButton = document.querySelector('button[name="official-keystore"]');
let selfSignedKeystoreButton = document.querySelector('button[name="self-signed-keystore"]');
let patchState = document.querySelector('.patch_state');
let operationBoxBtn_0 = document.querySelector('.operation_box_btn_0');
let operationBoxBtn_1 = document.querySelector('.operation_box_btn_1');
let operationBoxBtn_2 = document.querySelector('.operation_box_btn_2');
let operationBoxBtn_3 = document.querySelector('.operation_box_btn_3');
let updateBtn = document.querySelector('.update')
let updateProgress = document.querySelector('.update_progress');
let resVersion = document.querySelector('.res_version');
let gcVersion = document.querySelector('.gc_version');
let pageLogText0 = document.querySelector('.page_log_text_0');
let clearData = document.querySelector('.clear_data');
let openLogDirBtn = document.querySelector('button[name="open_log_dir"]');
let openLogLatestBtn = document.querySelector('button[name="open_log_latest"]');
let openGcToolsBtn = document.querySelector('button[name="gctools_btn"]')
let openHandbookTXTBtn = document.querySelector('button[name="handbook_txt"]')
let openHandbookHTMLBtn = document.querySelector('button[name="handbook_html"]')

let modsDragArea = document.querySelector('.page_tools_mods_drag_area');
let plugsDragArea = document.querySelector('.page_tools_plugs_drag_area');

let gcIp = document.querySelector('input[name=gc_ip]');
let gcGamePort = document.querySelector('input[name=gc_game_port]');
let gcDispatchPort = document.querySelector('input[name=gc_dispatch_port]');
let proxyIP = document.querySelector('input[name=proxy_ip]');
let proxyPort = document.querySelector('input[name=proxy_port]');

const izi_notify_wav = new Audio("sounds/izi_notify.wav");

function izi_notify() {
    izi_notify_wav.pause();
    izi_notify_wav.currentTime = 0;
    setTimeout(() => {
        izi_notify_wav.play();
    }, 100);
}

let gc_latestCommitSha;
let gc_latestReleaseTagName;
let res_latestCommitSha;

document.addEventListener('DOMContentLoaded', (event) => {
    ipcRenderer.send('render-ready');
});

ipcRenderer.on('gc_text', (event, input) => {
    gcIp.value = input[0];
    gcGamePort.value = input[1];
    gcDispatchPort.value = input[2];
})

ipcRenderer.on('proxy_text', (event, input) => {
    proxyIP.value = input[0];
    proxyPort.value = input[1];
})

let gcInputRender = new Array(4);
let proxyInputRender = new Array(2);

function getLatestCommitID (){
    fetch('https://api-gh-proxy.btl-cdn.top/repos/Grasscutters/Grasscutter/commits')
    .then(response => response.json())
    .then(commits => {
        gc_latestCommitSha = commits[0].sha.slice(0, 9);
        gcVersionLink.addEventListener('click', () => {
            ipcRenderer.send('open-url', `https://github.com/Grasscutters/Grasscutter/commit/${gc_latestCommitSha}`);
        });
        return fetch('https://api-gh-proxy.btl-cdn.top/repos/Grasscutters/Grasscutter/releases/latest');
    })
    .then(response => response.json())
    .then(data => {
        gc_latestReleaseTagName = data.tag_name;
        gcVersion.innerHTML = `Latest Commit<br>Grasscutter Release ${gc_latestReleaseTagName}-${gc_latestCommitSha}`;
    })
    .catch(error => {
        console.error(error);
    });

    fetch('https://gitlab.com/api/v4/projects/YuukiPS%2FGC-Resources/repository/commits')
    .then(response => response.json())
    .then(commits => {
        res_latestCommitSha = commits[0].id;
        resVersionLink.addEventListener('click', () => {
            ipcRenderer.send('open-url', `https://gitlab.com/YuukiPS/GC-Resources/-/commit/${res_latestCommitSha}`);
        });
        resVersion.innerHTML = `Yuuki GC-Resources ${res_latestCommitSha}`;
    })
    .catch(error => {
        console.error(error);
    });
}

function page_log_active (){

    menuSelectorsLog.forEach(selector => {
        menuSelectorLogIcon.style.color = '#c4c4c4';
        document.querySelector(".menu_selector_log_text").style.color = '#c4c4c4';

        menuSelector_0_Background.classList.remove('active');
        menuSelector_1_Background.classList.remove('active');
        menuSelectorSettings_Background.classList.remove('active');
        menuSelectorLog_Background.classList.add('active');

        menuSelector_0_Icon.className = "fa-light fa-house";
        menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
        menuSelectorSettingsIcon.className = "fa-light fa-gear";
        menuSelectorLogIcon.classList = "fa-solid fa-memo-circle-info"

        menuUnderline_0.classList.remove("active");
        menuUnderline_1.classList.remove("active");
        menuUnderlineSettings.classList.remove("active");
        menuUnderlineLog.classList.add("active");

        page_0.style.display = 'none';
        page_0.classList.remove("active");
        page_1.style.display = 'none';
        page_1.classList.remove("active");
        page_log.style.display = 'block';
        page_log.classList.add("active");
        page_settings.style.display = 'none';
        page_settings.classList.remove("active");
        operationBox.classList.remove("active");

        menuSelectorLogActive ();
        
    });
}

patchState.style.display = 'none';

dragbar_close.addEventListener('click', () => {
    ipcRenderer.send('handelClose');
});

dragbar_minimize.addEventListener('click', () => {
    ipcRenderer.send('handelMinimize');
});

dragbar_maximize.addEventListener('click', () => {
    ipcRenderer.send('handelMaximize');
});

dragbar_window.addEventListener('click', () => {
    ipcRenderer.send('handelWindow');
});

dragbar_question.addEventListener('click', () => {
    ipcRenderer.send('handelQuestion');
    ipcRenderer.send('open-url', 'https://github.com/btjawa/BTJGenshinPS');
});

ipcRenderer.on('main-window-max', () => {
    document.getElementById('dragbar_window').style.display = 'block';
    document.getElementById('dragbar_maximize').style.display = 'none';
});
ipcRenderer.on('main-window-unmax', () => {
    document.getElementById('dragbar_window').style.display = 'none';
    document.getElementById('dragbar_maximize').style.display = 'block';
});

chooseGamePathButton.addEventListener('click', () => {
    ipcRenderer.send('chooseGamePathButton_open-file-dialog');
});

chooseJavaPathButton.addEventListener('click', () => {
    ipcRenderer.send('chooseJavaPathButton_open-file-dialog')
});

/*
 choose3DMigotoPathButton.addEventListener('click', () => {
     ipcRenderer.send('choose3DMigotoPathButton_open-file-dialog')
    });
*/

openLogDirBtn.addEventListener('click', () => {
    ipcRenderer.send('openLogDirBtn_open-log-dir');
})

openLogLatestBtn.addEventListener('click', () => {
    ipcRenderer.send('openLogLatestBtn_open-log-latest')
});

openGcToolsBtn.addEventListener('click', () => {
    ipcRenderer.send('openGcToolsBtn_try-open')
});

openHandbookTXTBtn.addEventListener('click', () => {
    ipcRenderer.send('openHandbookTXTBtn_try-open')
});

openHandbookHTMLBtn.addEventListener('click', () => {
    ipcRenderer.send('openHandbookHTMLBtn_try-open')
});

ipcRenderer.on('openHandbookTXTBtn_not-found', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'Handbook TXT',
        message: '找不到txt！请尝试运行服务生成！',
        onOpening: function() {
            izi_notify()
        }
    });
})

ipcRenderer.on('openHandbookHTMLBtn_not-found', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'Handbook TXT',
        message: '找不到txt！请尝试运行服务生成！',
        onOpening: function() {
            izi_notify()
        }
    });
})

ipcRenderer.on('openGcToolsBtn_starting-download', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'GcTools',
        message: '开始下载GcTools...',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('openGcToolsBtn_download-complete', (event) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'GcTools',
        message: 'GcTools下载成功！尝试打开...',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('chooseGamePathButton_selected-file', (event, path, patchExists, action) => {
    if (patchExists) {
        gamePathInput.value = path;
        patchState.style.display = 'block';
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            title: '添加补丁',
            layout: '2',
            message: '已添加补丁！',
            onOpening: function() {
                izi_notify()
            }
        });
    } else {
        patchState.style.display = 'none';
        
    }
    if (action == "patch_not_exst") {
        iziToast.info({
            icon: 'fa-solid fa-circle-exclamation',
            title: '警告',
            layout: '2',
            message: '补丁不存在！请重新添加游戏目录路径或等待几秒！',
            onOpening: function() {
                izi_notify()
            }
        });
    }
    if (action == "delete_patch_succ") {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            title: '删除补丁',
            layout: '2',
            message: '已删除补丁，恢复官服！若想重新添加补丁请点击 "选择路径"',
            onOpening: function() {
                izi_notify()
            }
        });
    }
    if (action == "game_patch_undf") {
        iziToast.info({
            icon: 'fa-solid fa-circle-exclamation',
            title: '警告',
            layout: '2',
            message: '请先设置游戏路径！',
            onOpening: function() {
                izi_notify()
            }
        });
    }
});

ipcRenderer.on('chooseGamePathButton_file-not-valid', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '4',
        title: '警告',
        message: '请选择有效的游戏文件！<br>国服："YuanShen.exe"<br>国际服："GenshinImpact.exe"',
        onOpening: function() {
            izi_notify()
        }
    });
})

ipcRenderer.on('choose3DMigotoPathButton_file-not-valid', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '4',
        title: '警告',
        message: '请选择有效的3DMigoto可执行文件！<br>示例:&nbsp;"3DMigoto Loader.exe"',
        onOpening: function() {
            izi_notify()
        }
    });
})

ipcRenderer.on('chooseJavaPathButton_was-jre', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '3',
        title: 'javaPath',
        message: '请选择JDK文件夹而不是JRE文件夹！<br>或者你可以不自定义路径，让程序自动下载',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('chooseJavaPathButton_was-jdk', (event, path, action) => {
    javaPathInput.value = path;    
    if (action == "init") {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: 'javaPath',
            message: 'JDK校验已通过！已保存至配置文件！',
            onOpening: function() {
                izi_notify()
            }
        });
    }
});

ipcRenderer.on('choose3DMigotoPathButton_was', (event, path, action) => {
    _3DMigotoPathPathInput.value = path;
    if (action == "init") {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: '3DMigotoPath',
            message: '3DMigoto校验已通过！已保存至配置文件！',
            onOpening: function() {
                izi_notify()
            }
        });
    }
});

ipcRenderer.on('chooseJavaPathButton_not-valid', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'javaPath',
        message: '请选择有效的Java文件夹！Java校验未通过！\n请尝试选择bin的上一级，即java根目录',
        onOpening: function() {
            izi_notify()
        }
    });
});

restoreOfficialButton.addEventListener('click', () => {
    ipcRenderer.send('restoreOfficialButton_delete-path');
});

resGetWayButton_0.addEventListener('click', () => {
    ipcRenderer.send('resGetWayButton_0-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '代理',
        message: '获取资源方式已更改为 代理!',
        onOpening: function() {
            izi_notify()
        }
    });
});

resGetWayButton_1.addEventListener('click', () => {
    ipcRenderer.send('resGetWayButton_1-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '直连',
        message: '获取资源方式已更改为 直连!',
        onOpening: function() {
            izi_notify()
        }
    });
});

officialKeystoreButton.addEventListener('click', () => {
    ipcRenderer.send('officialKeystoreButton-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '正在使用 官方Keystore！',
        onOpening: function() {
            izi_notify()
        }
    });
});

selfSignedKeystoreButton.addEventListener('click', () => {
    ipcRenderer.send('selfSignedKeystoreButton-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '正在使用 自签名Keystore！',
        onOpening: function() {
            izi_notify()
        }
    });
});

function operationBoxBtn_0_ClickHandler() {
    operationBoxBtn_0.addEventListener('click', () => {
        gcInputRender = [gcIp.value, gcGamePort.value, gcDispatchPort.value];
        if (gcIp.value!=="127.0.0.1" && gcIp.value!=="localhost" && gcIp.value!=="0.0.0.0") {
            gcInputRender[3] = "dispatchcnglobal.yuanshen.com";
        } else {
            gcInputRender[3] = "127.0.0.1";
        }
        proxyInputRender = [proxyIP.value, proxyPort.value];
        ipcRenderer.send('operationBoxBtn_0-run-main-service', gcInputRender, proxyInputRender);
        toggleMenuState('menu_selector_log', 'make-active');
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: '启动服务',
            message: '正在启动服务...',
            onOpening: function() {
                izi_notify()
            }
        });
        pageLogText0.innerHTML += `请不要关闭稍后弹出来的任何一个窗口！<br>正在启动服务...<br>`; 
    });
}

operationBoxBtn_0_ClickHandler();

operationBoxBtn_1.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_1-stop-service');
});

ipcRenderer.on('download-jdk', (event, message) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    if (message == "jdk-false") {
        pageLogText0.innerHTML += `未检测到JDK！正在下载JDK...<br>`;
    } else if (message == "jdk-true") {
        pageLogText0.innerHTML += `JDK下载完毕！准备启动服务...<br>`;
    }
});

ipcRenderer.on('jdk-already-installed', (event) => {
    pageLogText0.innerHTML += `已检测到JDK！<br>`;   
});

ipcRenderer.on('jre-already-installed', (event) => {
    pageLogText0.innerHTML += `已检测到JRE，但未检测到JDK<br>`;   
});

ipcRenderer.on('operationBoxBtn_1-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '停止服务',
        message: '成功停止服务！',
        onOpening: function() {
            izi_notify()
        }
    });
    pageLogText0.innerHTML += `成功停止服务！<br>`; 
});

operationBoxBtn_2.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_2-run-game');
});

ipcRenderer.on('operationBoxBtn_2-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动游戏',
        message: '成功启动游戏！',
        onOpening: function() {
            izi_notify()
        }
    });
});

operationBoxBtn_3.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_3-run-3dmigoto');
});

ipcRenderer.on('operationBoxBtn_3-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '3',
        title: '启动3DMigoto',
        message: '成功启动3DMigoto！',
        onOpening: function() {
            izi_notify()
        }
    });
});

updateBtn.addEventListener('click' , () => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '3',
        title: '更新',
        message: '正在尝试更新...<br>注意插件等需要手动更新！',
        onOpening: function() {
            izi_notify()
        }
    });
    fetch('https://api.github.com/repos/Grasscutters/Grasscutter/releases/latest')
        .then(response => response.json())
        .then(data => {
            const latestReleaseUrl = data.assets[0].browser_download_url;
            ipcRenderer.send('update_latest', latestReleaseUrl);
            
        })
        .catch(error => {
        iziToast.info({
            icon: 'fa-solid fa-circle-exclamation',
            layout: '2',
            title: 'Github API 已超限！请等待一分钟！',
            onOpening: function() {
                izi_notify()
            }
        });
    });
});

ipcRenderer.on('update_progress', (event, progressText, action) => {
    const allMatches = progressText.match(/([0-9.]+[kMG]|[0-9:]+:[0-9:]+|--:--:--)/g);
    if (progressText.trim() === "0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0" || progressText.includes("% Total    % Received % Xferd  Average Speed   Time    Time     Time  Current")) {
        updateProgress.innerHTML = `下载进度<br>正在向服务器请求...`;
    };

    if (allMatches && allMatches.length >= 4) {
        const received = allMatches[1];
        const speed = allMatches[allMatches.length - 1];
        const timeLeft = allMatches[allMatches.length - 2] === '--:--:--' ? '未知' : allMatches[allMatches.length - 2];
        
        updateProgress.innerHTML = `下载进度<br>
        当前下载：${action}<br>
        已下载: ${received}<br>
        速度: ${speed}/s<br>
        剩余时间: ${timeLeft}`;

    }
});

ipcRenderer.on('using_proxy', (event, proxyServer) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '代理',
        message: `将使用代理：${proxyServer}`,
        onOpening: function() {
            izi_notify()
        }
    });
});


ipcRenderer.on('update_complete', (event) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '更新成功！',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('app_update', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '开始下载APP更新...',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('gateserver_install', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'GateServer',
        message: '开始下载GateServer...在此期间请勿运行服务',
        onOpening: function() {
            izi_notify()
        }
    });
    operationBoxBtn_0.classList.add("disabled");
    operationBoxBtn_0.removeEventListener('click', operationBoxBtn_0_ClickHandler);
});

ipcRenderer.on('gateserver_cancel-install', (event) => {
    operationBoxBtn_0.classList.add("disabled");
    operationBoxBtn_0.removeEventListener('click', operationBoxBtn_0_ClickHandler);
})

ipcRenderer.on('app_update_download_complete', (event) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '成功下载APP更新！准备重启以完成更新...',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('gateserver_install_download_complete', (event) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '成功下载GateServer！准备解压...',
        onOpening: function() {
            izi_notify()
        }
    });
});


clearData.addEventListener('click', () => {
    ipcRenderer.send('clear_data');
});

ipcRenderer.on('clearing_data', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '恢复出厂',
        message: '正在清除数据...',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('vc_redist_init', (event, path) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '初始化',
        timeout: 5000,
        message: `初次使用，请按照弹出的窗口中的指引安装必要依赖<br>或手动安装:&nbsp;${path}<br>若显示"修改安装程序"，请点击"修复"`,
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('mods-list', (event, modsList) => {
    const container = document.querySelector('.page_tools_mods_list');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    if (modsList == "empty") {
        let modElement = document.createElement('div');
            modElement.className = 'page_tools_mods_list_item';
            let modNameElement = document.createElement('div');
            modNameElement.className = 'page_tools_mods_name';
            modNameElement.innerText = "Mod 文件夹为空！";
            modElement.appendChild(modNameElement);
            container.appendChild(modElement);
    } else {
        for (let mod of modsList) {
            let modElement = document.createElement('div');
            modElement.className = 'page_tools_mods_list_item';
            let modNameElement = document.createElement('div');
            modNameElement.className = 'page_tools_mods_name';
            modNameElement.innerText = mod;
            let deleteButton = document.createElement('div');
            deleteButton.className = 'page_tools_mods_list_delete fa-solid fa-trash';
            let openSelectButton = document.createElement('div');
            openSelectButton.className = 'page_tools_mods_list_open_select fa-solid fa-folder-open';
            modElement.appendChild(modNameElement);
            modElement.appendChild(deleteButton);
            modElement.appendChild(openSelectButton);
            container.appendChild(modElement);
        }
        const deleteButtons = document.querySelectorAll('.page_tools_mods_list_delete');
        const openSelectButtons = document.querySelectorAll('.page_tools_mods_list_open_select')
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                let parent = this.parentNode;
                let modNameElement = parent.querySelector('.page_tools_mods_name');
                let modName = modNameElement ? modNameElement.textContent : null;
                if (modName) {
                    ipcRenderer.send('modsListDeleteBtn-delete', modName);
                    iziToast.info({
                        icon: 'fa-solid fa-circle-info',
                        layout: '2',
                        title: '删除模组',
                        timeout: 3500,
                        message: `已将模组扔进回收站！若想恢复可进入回收站右键"还原"`,
                        onOpening: function() {
                            izi_notify()
                        }
                    });
                }
            });
        });
        openSelectButtons.forEach(button => {
            button.addEventListener('click', function() {
                let parent = this.parentNode;
                let modNameElement = parent.querySelector('.page_tools_mods_name');
                let modName = modNameElement ? modNameElement.textContent : null;
                if (modName) {
                    ipcRenderer.send('modsListOpenSelectBtn-open-select', modName);
                }
            });
        });
    }
});

ipcRenderer.on('plugs-list', (event, plugsList) => {
    const container = document.querySelector('.page_tools_plugs_list');
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    if (plugsList == "empty") {
        let plugElement = document.createElement('div');
            plugElement.className = 'page_tools_plugs_list_item';
            let plugNameElement = document.createElement('div');
            plugNameElement.className = 'page_tools_plugs_name';
            plugNameElement.innerText = "插件文件夹为空！";
            plugElement.appendChild(plugNameElement);
            container.appendChild(plugElement);
    } else {
        for (let plug of plugsList) {
            let plugElement = document.createElement('div');
            plugElement.className = 'page_tools_plugs_list_item';
            let plugNameElement = document.createElement('div');
            plugNameElement.className = 'page_tools_plugs_name';
            plugNameElement.innerText = plug;
            let deleteButton = document.createElement('div');
            deleteButton.className = 'page_tools_plugs_list_delete fa-solid fa-trash';
            let openSelectButton = document.createElement('div');
            openSelectButton.className = 'page_tools_plugs_list_open_select fa-solid fa-folder-open';
            plugElement.appendChild(plugNameElement);
            plugElement.appendChild(deleteButton);
            plugElement.appendChild(openSelectButton);
            container.appendChild(plugElement);
        }
        const deleteButtons = document.querySelectorAll('.page_tools_plugs_list_delete');
        const openSelectButtons = document.querySelectorAll('.page_tools_plugs_list_open_select')
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                let parent = this.parentNode;
                let plugNameElement = parent.querySelector('.page_tools_plugs_name');
                let plugName = plugNameElement ? plugNameElement.textContent : null;
                if (plugName) {
                    ipcRenderer.send('plugsListDeleteBtn-delete', plugName);
                    iziToast.info({
                        icon: 'fa-solid fa-circle-info',
                        layout: '2',
                        title: '删除插件',
                        timeout: 3500,
                        message: `已将插件扔进回收站！若想恢复可进入回收站右键"还原"`,
                        onOpening: function() {
                            izi_notify()
                        }
                    });
                }
            });
        });
        openSelectButtons.forEach(button => {
            button.addEventListener('click', function() {
                let parent = this.parentNode;
                let plugNameElement = parent.querySelector('.page_tools_plugs_name');
                let plugName = plugNameElement ? plugNameElement.textContent : null;
                if (plugName) {
                    ipcRenderer.send('plugsListOpenSelectBtn-open-select', plugName);
                }
            });
        });
    }
    const spacer = document.createElement('div');
    spacer.className = 'bottom-spacing';
    container.appendChild(spacer);
});

modsDragArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    modsDragArea.style.backgroundColor = '#353740';
});

modsDragArea.addEventListener('dragleave', () => {
    modsDragArea.style.backgroundColor = '';
});

modsDragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    modsDragArea.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    const filePaths = Array.from(files).map(file => file.path);
    const fileNames = filePaths.map(filePaths => path.basename(filePaths));
    for (let filePath of filePaths) {
        if (!fs.statSync(filePath).isDirectory()) {
            iziToast.error({
                icon: 'fa-solid fa-circle-exclamation',
                title: '错误',
                layout: '2',
                message: `${fileNames}&nbsp;不是文件夹!请拖入文件夹!`,
                onOpening: function() {
                    izi_notify()
                }
            });
            return;
        }
    }
    ipcRenderer.send('modsDragArea-add-file', filePaths);
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '添加模组',
        timeout: 3500,
        message: `已添加模组：${fileNames}`,
        onOpening: function() {
            izi_notify()
        }
    });
    console.log('modsDragArea add files', filePaths);
});

plugsDragArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    plugsDragArea.style.backgroundColor = '#353740';
});

plugsDragArea.addEventListener('dragleave', () => {
    plugsDragArea.style.backgroundColor = '';
});

plugsDragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    plugsDragArea.style.backgroundColor = '';
    const files = e.dataTransfer.files;
    const filePaths = Array.from(files).map(file => file.path);
    const fileNames = filePaths.map(filePaths => path.basename(filePaths));
    for (let filePath of filePaths) {
        const extension = path.extname(filePath);
        if (extension !== '.jar') {
            iziToast.error({
                icon: 'fa-solid fa-circle-exclamation',
                title: '错误',
                layout: '2',
                message: `${fileNames}&nbsp;不是JAR!请拖入JAR!`,
                onOpening: function() {
                    izi_notify()
                }
            });
            return;
        }
    }
    ipcRenderer.send('plugsDragArea-add-file', filePaths);
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '添加插件',
        timeout: 3500,
        message: `已添加插件：${fileNames}`,
        onOpening: function() {
            izi_notify()
        }
    });
    console.log('plugsDragArea add files', filePaths);
});