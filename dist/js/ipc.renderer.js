const { ipcRenderer } = require('electron');

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
state_menu_selector_log = "inactive";

const handelOperationBoxBtn_0 = () => {
    if (state_menu_selector_log == "inactive") {
        operationBoxBtn_0.style.backgroundColor = '#6e6e6e';
        operationBoxBtn_0.style.color = '#ebebeb60';
        ipcRenderer.send('operationBoxBtn_0-run-main-service');
        page_log_active();
        state_menu_selector_log = "active";
    };
    operationBoxBtn_0.removeEventListener('click', handelOperationBoxBtn_0);
};

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
    } else {
        patchState.style.display = 'none';
        
    }
    if (action == "add_patch_succ") {
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            title: '添加补丁',
            layout: '2',
            message: '已添加补丁！'
        });
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

operationBoxBtn_0.addEventListener('click', handelOperationBoxBtn_0);