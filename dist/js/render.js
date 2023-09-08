const iziToast = require("izitoast");

iziToast.settings({
    timeout: 2500,
    icon: 'Fontawesome',
    closeOnEscape: 'true',
    transitionIn: 'bounceInLeft',
    transitionOut: 'fadeOutRight',
    displayMode: 'replace',
    position: 'topCenter',
    backgroundColor: '#686b80',
    theme: 'dark'
});

document.body.oncopy = function () {
    iziToast.info({
        icon: 'fa-regular fa-copy',
        layout: '2',
        title: '复制成功'
    });
};

getLatestCommitID();
