$(document).ready(function () {
    const $DocsIframe = $('#doc_iframe');

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

    $('#refresh_iframe').on('click', function() {
        $DocsIframe[0].contentWindow.location.reload();
    });

    function setIframeListeners() {
        const iframeDoc = $DocsIframe[0].contentWindow.document;

        $(iframeDoc).on('click', function(event) {
            let targetElement = $(event.target);
            
            while (targetElement && targetElement[0] !== iframeDoc.body && !targetElement.attr('href')) {
                targetElement = targetElement.parent();
            }
    
            if (targetElement && targetElement.attr('href')) {
                const link = targetElement.attr('href');
                
                const httpRegex = /^https?:\/\//;
                if (httpRegex.test(link)) {
                    event.preventDefault();
                    ipcRenderer.send('open-url', link);
                }
            }
        });
        $(iframeDoc).on('auxclick', function(event) {
            event.preventDefault();
        });
    }

    $DocsIframe.on('load', setIframeListeners);

    $('#home_page_iframe').on('click', function() {
        $DocsIframe.attr('src', "http://localhost:52805/BGP-docs");
        $DocsIframe.on('load', function() {
            setIframeListeners();
            $DocsIframe.off('load');
        });
    });

    $('#backward_page_iframe').on('click', function() {
        $DocsIframe[0].contentWindow.history.back();
        $DocsIframe.on('load', function() {
            setIframeListeners();
            $DocsIframe.off('load');
        });
    });
});
