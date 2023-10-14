$(document).ready(function () {
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

    function setIframeListeners() {
        const iframe = $DocsIframe[0].contentWindow.document;
        $(iframe).on('click', function(event) {
            let element = $(event.target);
            while (element && element[0] !== iframe.body && !element.attr('href')) {
                element = element.parent();
            }
            if (element && element.attr('href')) {
                const link = element.attr('href');
                const regex = /(http|https):\/\/([\w.]+\/?)\S*/ig;
                if (regex.test(link)) {
                    event.preventDefault();
                    ipcRenderer.send('open-url', link);
                }
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
