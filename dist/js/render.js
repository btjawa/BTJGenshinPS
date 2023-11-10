$(document).ready(function () {
    toggleMenuState(menuItems[0].selector);
    const $DocsIframe = $('#doc_iframe');
    $DocsIframe.on('load', setIframeListeners);
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
    $(document.body).on('copy', function () {
        iziToast.info({
            icon: 'fa-regular fa-copy',
            layout: '2',
            title: '复制成功',
            onOpening: function() {
                izi_notify();
            }
        });
    });
    const contextMenu = $('.context');
    $(document).on('contextmenu', function(event) {
        event.preventDefault();
        contextMenu.removeClass('active');
        contextMenu.css({ left: event.clientX + 'px', top: event.clientY + 'px' });
        contextMenu.get(0).offsetHeight;
        contextMenu.addClass('active');
    });
    $(document).on('click', () => contextMenu.removeClass('active'));
    function setIframeListeners() {
        const iframe = $DocsIframe[0].contentWindow.document;
        $(iframe).on('click', function(event) {
            let element = event.target;
            while (element && element !== iframe.body) {
                if (element.tagName === 'A' && element.hasAttribute('href')) {
                    const link = element.getAttribute('href');
                    const regex = /^(http|https):\/\/([\w.]+\/?)\S*/ig;
                    if (regex.test(link)) {
                        event.preventDefault();
                        ipcRenderer.send('open-url', link);
                        return;
                    }
                }
                element = element.parentElement;
            }
        });
        $(iframe).on('auxclick', function(event) {
            event.preventDefault();
        });
    }
    $('#refresh_iframe').on('click', function() {
        $DocsIframe[0].contentWindow.location.reload();
    });
    $('#backward_page_iframe').on('click', function() {
        $DocsIframe[0].contentWindow.history.back();
        $DocsIframe.on('load', function() {
            setIframeListeners();
            $DocsIframe.off('load');
        });
    });
    $('#home_page_iframe').on('click', function() {
        $DocsIframe.attr('src', "http://localhost:52805/BGP-docs");
        $DocsIframe.on('load', function() {
            setIframeListeners();
            $DocsIframe.off('load');
        });
    });
});