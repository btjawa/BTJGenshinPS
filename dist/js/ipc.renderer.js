const { ipcRenderer, ipcMain } = require('electron');

let dragbar_close = document.getElementById('dragbar_close');
let dragbar_minimize = document.getElementById('dragbar_min');
let dragbar_window = document.getElementById('dragbar_window');
let dragbar_maximize = document.getElementById('dragbar_maximize');
let dragbar_question = document.getElementById('dragbar_question');
let chooseGamePathButton = document.querySelector('button[name="choose_game_path"]');
let gamePathInput = document.querySelector('input[name="game_path"]');
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
let updateBtn = document.querySelector('.update')
let updateProgress = document.querySelector('.update_progress');
state_menu_selector_log = "inactive";

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

ipcRenderer.on('chooseGamePathButton_selected-file', (event, path, patchExists, action) => {
    if (patchExists) {
        gamePathInput.value = path;
        patchState.style.display = 'block';
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            title: '添加补丁',
            layout: '2',
            message: '已添加补丁！'
        });
    } else {
        patchState.style.display = 'none';
        
    }
    if (action == "patch_not_exst") {
        iziToast.warn({
            icon: 'fa-solid fa-circle-exclamation',
            title: '警告',
            layout: '2',
            message: '补丁不存在！请重新添加游戏目录路径或等待几秒！'
        });
    }
    if (action == "delete_patch_succ") {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            title: '删除补丁',
            layout: '2',
            message: '已删除补丁，恢复官服！若想重新添加补丁请点击 "选择路径"'
        });
    }
    if (action == "game_patch_undf") {
        iziToast.warn({
            icon: 'fa-solid fa-circle-exclamation',
            title: '警告',
            layout: '2',
            message: '请先设置游戏路径！'
        });
    }
});

ipcRenderer.on('chooseGamePathButton_file-not-valid', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '4',
        title: '警告',
        message: '请选择有效的游戏文件！<br>国服："YuanShen.exe"<br>国际服："GenshinImpact.exe"'
    });
})

restoreOfficialButton.addEventListener('click', () => {
    ipcRenderer.send('restoreOfficialButton_delete-path');
});

resGetWayButton_0.addEventListener('click', () => {
    ipcRenderer.send('resGetWayButton_0-set');
});

resGetWayButton_1.addEventListener('click', () => {
    ipcRenderer.send('resGetWayButton_1-set');
});

officialKeystoreButton.addEventListener('click', () => {
    ipcRenderer.send('officialKeystoreButton-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '正在使用 官方Keystore！'
    });
});

selfSignedKeystoreButton.addEventListener('click', () => {
    ipcRenderer.send('selfSignedKeystoreButton-set');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '正在使用 自签名Keystore！'
    });
});

gcVersionLink.addEventListener('click', () => {
    ipcRenderer.send('open-url', 'https://github.com/Grasscutters/Grasscutter/commit/89efa35f838f95d49415899eec0f62cd9a991ed6');
});

resVersionLink.addEventListener('click', () => {
    ipcRenderer.send('open-url', 'https://gitlab.com/YuukiPS/GC-Resources/-/commit/558556930c5886555328683b3609f7670f94f39c');
});

operationBoxBtn_0.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_0-run-main-service');
    page_log_active();
    state_menu_selector_log = "active";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动服务',
        message: '正在启动服务...'
    });
});

operationBoxBtn_1.addEventListener('click', () => {
    ipcRenderer.send('operationBoxBtn_1-stop-service');
});

ipcRenderer.on('operationBoxBtn_1-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '停止服务',
        message: '成功停止服务！'
    });
});

updateBtn.addEventListener('click' , () => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '4',
        title: '更新',
        message: '正在尝试更新...<br>注意插件等需要手动更新！<br>请不要启动服务，直至提示“更新成功”！'
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
            title: 'Github API 已超限！请等待一分钟！'
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
        message: `将使用代理：${proxyServer}`
    });
});


ipcRenderer.on('update_complete', (event) => {
    updateProgress.innerHTML = "下载进度将会显示在这里";
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '更新成功！'
    });
});