const { ipcRenderer, ipcMain } = require('electron');
const path = require('path');

let dragbar_close = document.getElementById('dragbar_close');
let dragbar_minimize = document.getElementById('dragbar_min');
let dragbar_window = document.getElementById('dragbar_window');
let dragbar_maximize = document.getElementById('dragbar_maximize');
let dragbar_question = document.getElementById('dragbar_question');
let chooseGamePathButton = document.querySelector('button[name="choose_game_path"]');
let chooseJavaPathButton = document.querySelector('button[name=choose_java_path]');
let gamePathInput = document.querySelector('input[name="game_path"]');
let javaPathInput = document.querySelector('input[name="java_path"]')
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
let updateBtn = document.querySelector('.update')
let updateProgress = document.querySelector('.update_progress');
let resVersion = document.querySelector('.res_version');
let gcVersion = document.querySelector('.gc_version');
let pageLogText0 = document.querySelector('.page_log_text_0');
let clearData = document.querySelector('.clear_data');

let gcIp = document.querySelector('input[name=gc_ip]');
let gcGamePort = document.querySelector('input[name=gc_game_port]');
let gcDispatchPort = document.querySelector('input[name=gc_dispatch_port]');
let proxyIP = document.querySelector('input[name=proxy_ip]');
let proxyPort = document.querySelector('input[name=proxy_port]');

const izi_notify_wav = new Audio("sounds/izi_notify.wav");

function izi_notify () {
    izi_notify_wav.pause();
    izi_notify_wav.currentTime = 0;
    izi_notify_wav.play();
}

let gc_latestCommitSha;
let gc_latestReleaseTagName;
let res_latestCommitSha;

ipcRenderer.on('gc_text', (event, input0, input1, input2) => {
    gcIp.value = input0;
    gcGamePort.value = input1;
    gcDispatchPort.value = input2;
})

ipcRenderer.on('proxy_text', (event, input0, input1) => {
    proxyIP.value = input0;
    proxyPort.value = input1;
})

let gcInputRender = new Array(3);
let proxyInputRender = new Array(2);

function getLatestCommitID (){
    fetch('https://api.github.com/repos/Grasscutters/Grasscutter/commits')
    .then(response => response.json())
    .then(commits => {
        gc_latestCommitSha = commits[0].sha.slice(0, 9);
        gcVersionLink.addEventListener('click', () => {
            ipcRenderer.send('open-url', `https://github.com/Grasscutters/Grasscutter/commit/${gc_latestCommitSha}`);
        });
        return fetch('https://api.github.com/repos/Grasscutters/Grasscutter/releases/latest');
    })
    .then(response => response.json())
    .then(data => {
        gc_latestReleaseTagName = data.tag_name;
        gcVersion.innerHTML = `Latest Commit<br>Grasscutter Release ${gc_latestReleaseTagName}-${gc_latestCommitSha}`;
    })
    .catch(error => {
        console.error("Err:", error);
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
        console.error("Err:", error);
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
    ipcRenderer.send('open-url', 'https://blog.btjawa.top/?p=244');
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
        iziToast.warn({
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
        iziToast.warn({
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

ipcRenderer.on('chooseJavaPathButton_was-jdk', (event, path) => {
    javaPathInput.value = path;
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'javaPath',
        message: 'JDK校验已通过！已保存至配置文件！',
        onOpening: function() {
            izi_notify()
        }
    });
});

ipcRenderer.on('chooseJavaPathButton_not-valid', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'javaPath',
        message: '请选择有效的Java文件夹！',
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

operationBoxBtn_0.addEventListener('click', () => {
    gcInputRender = [gcIp.value, gcGamePort.value, gcDispatchPort.value];
    console.log(gcInputRender)
    proxyInputRender = [proxyIP.value, proxyPort.value];
    console.log(proxyInputRender)
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

operationBoxBtn_1.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_1-stop-service');
});

ipcRenderer.on('download-jdk', (event, message) => {
    if (message == "jdk-false") {
        pageLogText0.innerHTML += `未检测到JDK！正在下载JDK...<br>`;
    } else if (message == "jdk-true") {
        pageLogText0.innerHTML += `JDK下载完毕！准备启动服务...<br>`;
    }
});

ipcRenderer.on('jdk-already-installed', (event) => {
    pageLogText0.innerHTML += `已检测到JDK！<br>`;   
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
        iziToast.warning({
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