const { ipcRenderer } = require('electron');

const elems = {
    dragbar_close: $('#dragbar_close'),
    dragbar_minimize: $('#dragbar_min'),
    dragbar_window: $('#dragbar_window'),
    dragbar_maximize: $('#dragbar_maximize'),
    dragbar_question: $('#dragbar_question'),
    chooseGamePathButton: $('button[name="choose_game_path"]'),
    chooseJavaPathButton: $('button[name=choose_java_path]'),
    choose3DMigotoPathButton: $('button[name=choose_3dmigoto_path]'),
    gamePathInput: $('input[name="game_path"]'),
    javaPathInput: $('input[name="java_path"]'),
    _3DMigotoPathPathInput: $('input[name="3dmigoto_path"]'),
    restoreOfficialButton: $('button[name="restore_official"]'),
    resGetWayButton_0: $(".res_getway_0 input[type='checkbox']"),
    resGetWayButton_1: $(".res_getway_1 input[type='checkbox']"),
    gcVersionLink: $('.gc_version'),
    resVersionLink: $('.res_version'),
    selfSignedKeystoreBox: $(".ssl_ver_0 input[type='checkbox']"),
    noKeystoreBox: $(".ssl_ver_2 input[type='checkbox']"),
    patchState: $('.patch_state'),
    operationBoxBtn_0: $('.operation_box_btn_0'),
    operationBoxBtn_1: $('.operation_box_btn_1'),
    operationBoxBtn_proxy: $('.operation_box_btn_proxy'),
    operationBoxBtn_2: $('.operation_box_btn_2'),
    operationBoxBtn_3: $('.operation_box_btn_3'),
    updateBtn: $('.page_0_text_1_update_btn'),
    connTestBtn: $('.page_0_text_conn_test_btn'),
    updateProgress: $('.update_progress'),
    resVersion: $('.res_version'),
    gcVersion: $('.gc_version'),
    pageLogText0: $('.page_log_text_0'),
    clearData: $('.clear_data'),
    openLogDirBtn: $('button[name="open_log_dir"]'),
    openLogLatestBtn: $('button[name="open_log_latest"]'),
    openGcToolsBtn: $('button[name="gctools_btn"]'),
    openHandbookTXTBtn: $('button[name="handbook_txt"]'),
    openHandbookHTMLBtn: $('button[name="handbook_html"]'),
    editAppConfigBtn: $('button[name="edit_config"]'),
    exportAppConfigBtn: $('button[name="export_config"]'),
    importAppConfigBtn: $('button[name="import_config"]'),
    openCompassBtn: $('button[name="compass_btn"]'),
    modsDragArea: $('.page_tools_mods_drag_area'),
    plugsDragArea: $('.page_tools_plugs_drag_area'),
    gcIp: $('input[name=gc_ip]'),
    gcGamePort: $('input[name=gc_game_port]'),
    gcDispatchPort: $('input[name=gc_dispatch_port]'),
    proxyIP: $('input[name=proxy_ip]'),
    proxyPort: $('input[name=proxy_port]'),
    proxyUsingSSLCheckbox: $(".proxy_using_ssl input[type='checkbox']"),
    remoteMitmGuide: $('button[name="remote_mitm_guide"]')
};

const izi_notify_mp3 = new Audio("sounds/izi_notify.mp3");

let gcInputRender = new Array(4);
let proxyInputRender = new Array(2);
let gcSSLStatus;
let gc_latestCommitSha;
let gc_latestReleaseTagName;
let res_latestCommitSha;

function izi_notify() {
    izi_notify_mp3.pause();
    izi_notify_mp3.currentTime = 0;
    setTimeout(() => {
        izi_notify_mp3.play();
    }, 100);
}

function save_settings() {
    gcInputRender = [elems.gcIp.val(), elems.gcGamePort.val(), elems.gcDispatchPort.val(), elems.gcIp.val()];
    proxyInputRender = [elems.proxyIP.val(), elems.proxyPort.val()];
}

$(window).on('devtoolschange', event => {
    if(event.detail.isOpen) {
        ipcRenderer.send('devtools-opened');
        iziToast.error({
            icon: 'fa-solid fa-circle-exclamation',
            title: 'Error',
            layout: '2',
            message: `Developer tools are not allowed here.`,
            onOpening: function() {
                izi_notify()
            }
        });
    }
});

$(document).ready(function() {
    ipcRenderer.send('render-ready');
    getLatestCommitID();
    $(elems.selfSignedKeystoreBox).on('change', function() {
        if ($(this).prop('checked')) {
            $(elems.noKeystoreBox).prop('checked', false);
        }
    });
    
    $(elems.noKeystoreBox).on('change', function() {
        if ($(this).prop('checked')) {
            $(elems.selfSignedKeystoreBox).prop('checked', false);
        }
    });      

    $(elems.resGetWayButton_0).on('change', function() {
        if ($(this).prop('checked')) {
            $(elems.resGetWayButton_1).prop('checked', false);
        } else {
            $(this).prop('checked', true);
        }
    });
    
    $(elems.resGetWayButton_1).on('change', function() {
        if ($(this).prop('checked')) {
            $(elems.resGetWayButton_0).prop('checked', false);
        } else {
            $(this).prop('checked', true);
        }
    });
})

function getLatestCommitID() {
    $.getJSON('https://api-gh-proxy.btl-cdn.top/repos/Grasscutters/Grasscutter/commits')
        .then(commits => {
            gc_latestCommitSha = commits[0].sha.slice(0, 9);
            elems.gcVersionLink.on('click', () => {
                ipcRenderer.send('open-url', `https://github.com/Grasscutters/Grasscutter/commit/${gc_latestCommitSha}`);
            });
            return $.getJSON('https://api-gh-proxy.btl-cdn.top/repos/Grasscutters/Grasscutter/releases/latest');
        })
        .then(data => {
            gc_latestReleaseTagName = data.tag_name;
            elems.gcVersion.html(`Grasscutter Release ${gc_latestReleaseTagName}-${gc_latestCommitSha}`);
        })
        .fail(error => {
            console.error(error);
        });

    $.getJSON('https://api-glab-proxy.btl-cdn.top/api/v4/projects/YuukiPS%2FGC-Resources/repository/commits')
        .then(commits => {
            res_latestCommitSha = commits[0].id;
            elems.resVersionLink.on('click', () => {
                ipcRenderer.send('open-url', `https://gitlab.com/YuukiPS/GC-Resources/-/commit/${res_latestCommitSha}`);
            });
            elems.resVersion.html(`Yuuki GC-Resources ${res_latestCommitSha}`);
        })
        .fail(error => {
            console.error(error);
        });
}

elems.patchState.css('display', 'none');

elems.dragbar_close.on('click', () => {
    save_settings();
    ipcRenderer.send('handelClose', gcInputRender, proxyInputRender);
});

elems.dragbar_minimize.on('click', () => {
    ipcRenderer.send('handelMinimize');
});

elems.dragbar_maximize.on('click', () => {
    ipcRenderer.send('handelMaximize');
});

elems.dragbar_window.on('click', () => {
    ipcRenderer.send('handelWindow');
});

elems.dragbar_question.on('click', () => {
    ipcRenderer.send('handelQuestion');
    ipcRenderer.send('open-url', 'https://github.com/btjawa/BTJGenshinPS');
})

elems.chooseGamePathButton.on('click', () => {
    ipcRenderer.send('chooseGamePathButton_open-file-dialog');
});

elems.chooseJavaPathButton.on('click', () => {
    ipcRenderer.send('chooseJavaPathButton_open-file-dialog');
});

function choose3DMigotoPathButton_ClickHandler() {
    ipcRenderer.send('choose3DMigotoPathButton_open-file-dialog');
}

elems.choose3DMigotoPathButton.on('click', choose3DMigotoPathButton_ClickHandler);

elems.openLogDirBtn.on('click', () => {
    ipcRenderer.send('openLogDirBtn_open-log-dir');
});

elems.openLogLatestBtn.on('click', () => {
    ipcRenderer.send('openLogLatestBtn_open-log-latest');
});

function openGcToolsBtn_ClickHandler() {
    ipcRenderer.send('openGcToolsBtn_try-open');
}

elems.openGcToolsBtn.on('click', openGcToolsBtn_ClickHandler);

elems.openCompassBtn.on('click', () => {
    ipcRenderer.send('openCompassBtn_try-open');
})

elems.openHandbookTXTBtn.on('click', () => {
    ipcRenderer.send('openHandbookTXTBtn_try-open');
});

elems.openHandbookHTMLBtn.on('click', () => {
    ipcRenderer.send('openHandbookHTMLBtn_try-open');
})

elems.restoreOfficialButton.on('click', () => {
    ipcRenderer.send('restoreOfficialButton_delete-path');
});

function resGetWayButton_0_ClickHandler() {
    if (!$(elems.resGetWayButton_0).prop('checked')) {
        elems.resGetWayButton_0.off('click', resGetWayButton_0_ClickHandler);
        $(elems.resGetWayButton_0).prop('checked', true);
        elems.resGetWayButton_0.on('click', resGetWayButton_0_ClickHandler);
        return;
    }
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
}

elems.resGetWayButton_0.on('click', resGetWayButton_0_ClickHandler);

function resGetWayButton_1_ClickHandler() {
    if (!$(elems.resGetWayButton_1).prop('checked')) {
        elems.resGetWayButton_1.off('click', resGetWayButton_1_ClickHandler);
        $(elems.resGetWayButton_1).prop('checked', true);
        elems.resGetWayButton_1.on('click', resGetWayButton_1_ClickHandler);
        return;
    }
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
}

elems.resGetWayButton_1.on('click', resGetWayButton_1_ClickHandler);

function selfSignedKeystoreBox_ClickHandler() {
    if (!$(elems.selfSignedKeystoreBox).prop('checked')) {
        elems.selfSignedKeystoreBox.off('click', selfSignedKeystoreBox_ClickHandler);
        $(elems.selfSignedKeystoreBox).prop('checked', true);
        elems.selfSignedKeystoreBox.on('click', selfSignedKeystoreBox_ClickHandler);
        return;
    }
    ipcRenderer.send('selfSignedKeystoreBox-set');
    gcSSLStatus = true;
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '正在使用 自签名Keystore！',
        onOpening: function() {
            izi_notify()
        }
    });
}

elems.selfSignedKeystoreBox.on('click', selfSignedKeystoreBox_ClickHandler);

function noKeystoreBox_ClickHandler() {
    if (!$(elems.noKeystoreBox).prop('checked')) {
        elems.noKeystoreBox.off('click', noKeystoreBox_ClickHandler);
        $(elems.noKeystoreBox).prop('checked', true);
        elems.noKeystoreBox.on('click', noKeystoreBox_ClickHandler);
        return;
    }
    ipcRenderer.send('noKeystoreBoxBox-set');
    gcSSLStatus = false;
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'Keystore',
        message: '已停用SSL！',
        onOpening: function() {
            izi_notify()
        }
    });
}

elems.noKeystoreBox.on('click', noKeystoreBox_ClickHandler);

function proxyUsingSSLCheckbox_ClickHandler() {
    if ($(elems.proxyUsingSSLCheckbox).prop('checked')) {
        ipcRenderer.send('proxyUsingSSLCheckbox_ClickHandler-set-on');
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: 'Keystore',
            message: '代理已启用SSL!',
            onOpening: function() {
                izi_notify();
            }
        });
    } else {
        ipcRenderer.send('proxyUsingSSLCheckbox_ClickHandler-set-off');
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: 'Keystore',
            message: '代理已禁用SSL!',
            onOpening: function() {
                izi_notify();
            }
        });
    }
}

elems.proxyUsingSSLCheckbox.on('click', proxyUsingSSLCheckbox_ClickHandler);

function operationBoxBtn_0_ClickHandler() {
    save_settings();
    ipcRenderer.send('operationBoxBtn_0-run-main-service', gcInputRender, proxyInputRender, gcSSLStatus);
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动服务',
        message: '正在启动服务...',
        onOpening: function() {
            izi_notify()
        }
    });
    elems.pageLogText0.append(`请不要关闭稍后弹出来的任何一个窗口！<br>正在启动服务...<br>`);
    toggleMenuState('menu_selector_log');
}

function operationBoxBtn_proxy_ClickHandler() {
    save_settings();
    ipcRenderer.send('operationBoxBtn_proxy-run-proxy-service', gcInputRender, proxyInputRender, gcSSLStatus);
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动服务',
        message: '正在启动服务...',
        onOpening: function() {
            izi_notify()
        }
    });
    elems.pageLogText0.append(`请不要关闭稍后弹出来的任何一个窗口！<br>正在启动代理服务...<br>正在检查目标主机连通性...<br>`);
    toggleMenuState('menu_selector_log');
}

elems.operationBoxBtn_0.on('click', operationBoxBtn_0_ClickHandler);

elems.operationBoxBtn_1.on('click', () => {
    ipcRenderer.send('operationBoxBtn_1-stop-service');
});

elems.operationBoxBtn_proxy.on('click', operationBoxBtn_proxy_ClickHandler);

elems.operationBoxBtn_2.on('click', () => {
    ipcRenderer.send('operationBoxBtn_2-run-game');
});

function operationBoxBtn_3_ClickHandler() {
    ipcRenderer.send('operationBoxBtn_3-run-3dmigoto');
}

elems.operationBoxBtn_3.on('click', operationBoxBtn_3_ClickHandler);

elems.updateBtn.on('click', () => {
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
            iziToast.error({
                icon: 'fa-solid fa-circle-exclamation',
                layout: '2',
                title: 'Github API 已超限！请等待一分钟！',
                onOpening: function() {
                    izi_notify()
                }
            });
        });
});

elems.connTestBtn.on('click', () => {
    save_settings();
    ipcRenderer.send('connTestBtn_test-conn', gcInputRender, proxyInputRender);
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '测试连接',
        message: `HOST:&nbsp;${gcInputRender[0]}&emsp;PORT:&nbsp;${gcInputRender[2]}`,
        onOpening: function() {
            izi_notify()
        }
    });
});

elems.clearData.on('click', () => {
    ipcRenderer.send('clear_data');
});

elems.modsDragArea.on('dragover', (e) => {
    e.preventDefault();
    elems.modsDragArea.css("backgroundColor", "#353740");
});

elems.modsDragArea.on('dragleave', () => {
    elems.modsDragArea.css("backgroundColor", "");
});

elems.modsDragArea.on('drop', (e) => {
    e.preventDefault();
    elems.modsDragArea.css("backgroundColor", "");
    const files = e.originalEvent.dataTransfer.files;
    const filePaths = Array.from(files).map(file => file.path);
    ipcRenderer.send('modsDragArea-add-file', filePaths);
});

elems.plugsDragArea.on('dragover', (e) => {
    e.preventDefault();
    elems.plugsDragArea.css("backgroundColor", "#353740");
});

elems.plugsDragArea.on('dragleave', () => {
    elems.plugsDragArea.css("backgroundColor", "");
});

elems.plugsDragArea.on('drop', (e) => {
    e.preventDefault();
    elems.plugsDragArea.css("backgroundColor", "");
    const files = e.originalEvent.dataTransfer.files;
    const filePaths = Array.from(files).map(file => file.path);
    ipcRenderer.send('plugsDragArea-add-file', filePaths);
});

elems.editAppConfigBtn.on('click', () => {
    ipcRenderer.send('editAppConfigBtn-edit');
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '编辑应用配置',
        timeout: 5000,
        message: `请在弹出的窗口中选择用记事本打开或其他编辑器！<br>编辑后需重启以完成更改!`,
        onOpening: function() {
            izi_notify()
        }
    });
});

elems.exportAppConfigBtn.on('click', () => {
    save_settings();
    ipcRenderer.send('exportAppConfigBtn-export', gcInputRender, proxyInputRender);
});

elems.importAppConfigBtn.on('click', () => {
    ipcRenderer.send('importAppConfigBtn-import');
});



// IPC PROCESS

ipcRenderer.on('showMessageBox', (event, type, title, message, buttons = [], btn_texts = []) => {
    let options = {
        icon: type,
        title: title,
        html: message,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        denyButtonText: '拒绝'
    };
    if (buttons.includes('confirm') && btn_texts[buttons.indexOf('confirm')]) {
        options.confirmButtonText = btn_texts[buttons.indexOf('confirm')];
    } 
    if (buttons.includes('cancel')) {
        options.showCancelButton = true;
        if (btn_texts[buttons.indexOf('cancel')]) {
            options.cancelButtonText = btn_texts[buttons.indexOf('cancel')];
        }
    }
    if (buttons.includes('deny')) {
        options.showDenyButton = true;
        if (btn_texts[buttons.indexOf('cancel')]) {
            options.denyButtonText = btn_texts[buttons.indexOf('deny')];
        }
    }    
    Swal.fire(options).then((result) => {
        if (result.isConfirmed) {
            ipcRenderer.send('showMessageBox-callback', 'confirm');
        } else if (result.isDenied) {
            ipcRenderer.send('showMessageBox-callback', 'deny');
        } else if (result.isDismissed) {
            ipcRenderer.send('showMessageBox-callback', 'cancel');
        }
    });
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


.on('operationBoxBtn_proxy-msg', (event, msg, err) => {
    elems.pageLogText0.append(err ? `遇到错误：${err}<br>请检查端口开放、IP是否正确等，并尝试重新启动服务，报错详情请看日志`: msg, "<br>");
    elems.remoteMitmGuide.on('click', () => {
        toggleMenuState('menu_selector_2');
    })
})

.on('update_complete', (event) => {
    elems.updateProgress.html("下载进度将会显示在这里");
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '更新',
        message: '更新成功！',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('res_getway', (event, way) => {
    if (way === "proxy") {
        elems.resGetWayButton_0.prop('checked', true);
        elems.resGetWayButton_1.prop('checked', false);
    } else if (way === "direct") {
        elems.resGetWayButton_0.prop('checked', false);
        elems.resGetWayButton_1.prop('checked', true);
    }
})

.on('ssl_ver', (event, ver) => {
    if (ver === "selfSignedKeystore") {
        elems.selfSignedKeystoreBox.prop('checked', true);
        elems.noKeystoreBox.prop('checked', false);
        gcSSLStatus = true;
    } else if (ver === "noKeystore") {
        elems.selfSignedKeystoreBox.prop('checked', false);
        elems.noKeystoreBox.prop('checked', true);
        gcSSLStatus = false;
    }
})

.on('ssl_status', (event, status) => {
    if (status) {
        elems.proxyUsingSSLCheckbox.prop('checked', true);
    } else {
        elems.proxyUsingSSLCheckbox.prop('checked', false);
    }
})

.on('gc_text', (event, input) => {
    elems.gcIp.val(input[0]);
    elems.gcGamePort.val(input[1]);
    elems.gcDispatchPort.val(input[2]);
})

.on('proxy_text', (event, input) => {
    elems.proxyIP.val(input[0]);
    elems.proxyPort.val(input[1]);
})

.on('main-window-max', () => {
    elems.dragbar_window.css('display', 'block');
    elems.dragbar_maximize.css('display', 'none');
})

.on('main-window-unmax', () => {
    elems.dragbar_window.css('display', 'none');
    elems.dragbar_maximize.css('display', 'block');
})

.on('add_crt', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'root.crt',
        message: '成功导入根证书！',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('openHandbookHTMLBtn_not-found', (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'Handbook HTML',
        message: '找不到HTML！请尝试运行服务生成！',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('openGcToolsBtn_starting-download', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'GcTools',
        message: '开始下载GcTools...',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('openGcToolsBtn_download-complete', (event) => {
    elems.updateProgress.html("下载进度将会显示在这里");
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'GcTools',
        message: 'GcTools下载成功！尝试打开...',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('openCompassBtn_starting-download', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'MongoDB&nbsp;Compass',
        message: '开始下载MongoDB&nbsp;Compass...',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('openCompassBtn_download-complete', (event) => {
    elems.updateProgress.html("下载进度将会显示在这里");
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: 'MongoDB&nbsp;Compass',
        message: 'MongoDB&nbsp;Compass下载成功！正在解压...',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('chooseGamePathButton_selected-file', (event, path, patchExists, action) => {
    if (patchExists) {
        elems.gamePathInput.val(path);
        elems.patchState.css('display', 'block');
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
        elems.patchState.css('display', 'none'); 
    }
    if (action == "patch_not_exst") {
        iziToast.error({
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
        iziToast.error({
            icon: 'fa-solid fa-circle-exclamation',
            title: '警告',
            layout: '2',
            message: '请先设置游戏路径！',
            onOpening: function() {
                izi_notify()
            }
        });
    }
})

.on('chooseGamePathButton_file-not-valid', (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '4',
        title: '警告',
        message: '请选择有效的游戏文件！<br>国服："YuanShen.exe"<br>国际服："GenshinImpact.exe"',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('choose3DMigotoPathButton_file-not-valid', (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '4',
        title: '警告',
        message: '请选择有效的3DMigoto可执行文件！<br>示例:&nbsp;"3DMigoto Loader.exe"',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('chooseJavaPathButton_was-jre', (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '3',
        title: 'javaPath',
        message: '请选择JDK文件夹而不是JRE文件夹！<br>或者你可以不自定义路径，让程序自动下载',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('chooseJavaPathButton_was-jdk', (event, path, action) => {
    elems.javaPathInput.val(path);
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
})

.on('choose3DMigotoPathButton_was', (event, path, action) => {
    elems._3DMigotoPathPathInput.val(path);
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
})

.on('chooseJavaPathButton_not-valid', (event) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        layout: '2',
        title: 'javaPath',
        message: '请选择有效的Java文件夹！Java校验未通过！\n请尝试选择bin的上一级，即java根目录',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('download-jdk', (event, message) => {
    elems.updateProgress.html("下载进度将会显示在这里");
    if (message == "jdk-false") {
        elems.pageLogText0.append(`未检测到JDK/JDK已损坏！正在下载JDK...<br>`);
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: 'JDK',
            message: '未检测到JDK！正在下载JDK...',
            onOpening: function() {
                izi_notify()
            }
        });
    } else if (message == "jdk-true") {
        elems.pageLogText0.append(`JDK下载完毕！准备启动服务...<br>`);
        elems.updateProgress.html("下载进度将会显示在这里");
        iziToast.info({
            icon: 'fa-solid fa-circle-info',
            layout: '2',
            title: 'JDK',
            message: 'JDK下载完毕！准备启动服务...',
            onOpening: function() {
                izi_notify()
            }
        });
    }
})

.on('jdk-already-installed', (event) => {
    elems.pageLogText0.append(`已检测到JDK！<br>`);   
})

.on('jre-already-installed', (event) => {
    elems.pageLogText0.append(`已检测到JRE，但未检测到JDK<br>`);   
})

.on('operationBoxBtn_0-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动服务',
        message: '成功启动服务！',
        onOpening: function() {
            izi_notify()
        }
    });
    elems.pageLogText0.append(`成功启动服务！<br>`); 
})

.on('operationBoxBtn_1-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '停止服务',
        message: '成功停止服务！',
        onOpening: function() {
            izi_notify()
        }
    });
    elems.pageLogText0.append(`成功停止服务！<br>`); 
})

.on('operationBoxBtn_2-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动游戏',
        message: '成功启动游戏！',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('operationBoxBtn_3-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '3',
        title: '启动3DMigoto',
        message: '成功启动3DMigoto！',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('operationBoxBtn_proxy-success', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '启动代理',
        message: '成功启动代理！',
        onOpening: function() {
            izi_notify()
        }
    });
    elems.pageLogText0.append(`成功启动代理！<br>`); 
})

.on('update_progress', (event, progressText, action) => {
    const allMatches = progressText.match(/([0-9.]+[kMG]|[0-9:]+:[0-9:]+|--:--:--)/g);
    if (progressText.trim() === "0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0" || progressText.includes("% Total    % Received % Xferd  Average Speed   Time    Time     Time  Current")) {
        elems.updateProgress.html(`下载进度<br>正在向服务器请求...`);
    };

    if (allMatches && allMatches.length >= 4) {
        const received = allMatches[1];
        const speed = allMatches[allMatches.length - 1];
        const timeLeft = allMatches[allMatches.length - 2] === '--:--:--' ? '未知' : allMatches[allMatches.length - 2];
        
        elems.updateProgress.html(`下载进度<br>
        当前下载：${action}<br>
        已下载: ${received}<br>
        速度: ${speed}/s<br>
        剩余时间: ${timeLeft}`);

    }
})

.on('using_proxy', (event, proxyServer) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '代理',
        message: `将使用代理：${proxyServer}`,
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('gateserver_not-exists', (event) => {
    elems.operationBoxBtn_0.addClass("disabled");
    elems.operationBoxBtn_proxy.addClass("disabled");
    elems.operationBoxBtn_3.addClass("disabled");
    elems.choose3DMigotoPathButton.addClass("disabled");
    elems.openGcToolsBtn.addClass("disabled");
    elems.operationBoxBtn_0.off('click', operationBoxBtn_0_ClickHandler);
    elems.operationBoxBtn_proxy.off('click', operationBoxBtn_proxy_ClickHandler);
    elems.operationBoxBtn_3.off('click', operationBoxBtn_3_ClickHandler);
    elems.choose3DMigotoPathButton.off('click', choose3DMigotoPathButton_ClickHandler);
    elems.selfSignedKeystoreBox.off('click', selfSignedKeystoreBox_ClickHandler);
    elems.noKeystoreBox.off('click', noKeystoreBox_ClickHandler);
    elems.openGcToolsBtn.off('click', openGcToolsBtn_ClickHandler);
})

.on('clearing_data', (event) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '恢复出厂',
        message: '正在清除数据...',
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('mods-list', (event, modsList) => {
    const $container = $('.page_tools_mods_list');
    $container.empty();
    if (modsList == "empty") {
        $('<div>')
            .addClass('page_tools_mods_list_item')
            .append(
                $('<div>')
                    .addClass('page_tools_mods_name')
                    .text("Mod 文件夹为空！")
            )
            .appendTo($container);
    } else {
        for (let mod of modsList) {
            const $modElement = $('<div>').addClass('page_tools_mods_list_item');
            const $modNameElement = $('<div>').addClass('page_tools_mods_name').text(mod);
            const $deleteButton = $('<div>').addClass('page_tools_mods_list_delete fa-solid fa-trash');
            const $openSelectButton = $('<div>').addClass('page_tools_mods_list_open_select fa-solid fa-folder-open');
            $deleteButton.on('click', function() {
                const modName = $(this).siblings('.page_tools_mods_name').text();
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
            $openSelectButton.on('click', function() {
                const modName = $(this).siblings('.page_tools_mods_name').text();
                if (modName) {
                    ipcRenderer.send('modsListOpenSelectBtn-open-select', modName);
                }
            });
            $modElement.append($modNameElement, $deleteButton, $openSelectButton).appendTo($container);
        }
    }
})    

.on('plugs-list', (event, plugsList) => {
    const $container = $('.page_tools_plugs_list');
    $container.empty();
    if (plugsList == "empty") {
        $('<div>')
            .addClass('page_tools_plugs_list_item')
            .append(
                $('<div>')
                    .addClass('page_tools_plugs_name')
                    .text("插件文件夹为空！")
            )
            .appendTo($container);
    } else {
        for (let plug of plugsList) {
            const $plugElement = $('<div>').addClass('page_tools_plugs_list_item');
            const $plugNameElement = $('<div>').addClass('page_tools_plugs_name').text(plug);
            const $deleteButton = $('<div>').addClass('page_tools_plugs_list_delete fa-solid fa-trash');
            const $openSelectButton = $('<div>').addClass('page_tools_plugs_list_open_select fa-solid fa-folder-open');
            $deleteButton.on('click', function() {
                const plugName = $(this).siblings('.page_tools_plugs_name').text();
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
            $openSelectButton.on('click', function() {
                const plugName = $(this).siblings('.page_tools_plugs_name').text();
                if (plugName) {
                    ipcRenderer.send('plugsListOpenSelectBtn-open-select', plugName);
                }
            });
            $plugElement.append($plugNameElement, $deleteButton, $openSelectButton).appendTo($container);
        }
    }
    $('<div>').addClass('bottom-spacing').appendTo($container);
})

.on('modsDragArea-success', (event, fileName) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '添加模组',
        timeout: 3500,
        message: `已添加模组：${fileName}`,
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('modsDragArea-not-folder', (event, fileName) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        title: '错误',
        layout: '2',
        message: `${fileName}&nbsp;不是文件夹!请拖入文件夹!`,
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('plugsDragArea-success', (event, fileName) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '添加插件',
        timeout: 3500,
        message: `已添加插件：${fileName}`,
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('plugsDragArea-not-jar', (event, fileName) => {
    iziToast.error({
        icon: 'fa-solid fa-circle-exclamation',
        title: '错误',
        layout: '2',
        message: `${fileName}&nbsp;不是JAR!请拖入JAR!`,
        onOpening: function() {
            izi_notify()
        }
    });
})

.on('exportAppConfigBtn-export-success', (event, path) => {
    iziToast.info({
        icon: 'fa-solid fa-circle-info',
        layout: '2',
        title: '导出应用配置',
        timeout: 3500,
        message: `已将配置文件导出至${path}！`,
        onOpening: function() {
            izi_notify()
        }
    });
})