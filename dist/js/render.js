const refreshIframeBtn = document.getElementById('refresh_iframe');
const homePageIframeBtn = document.getElementById('home_page_iframe');
const backwardPageIframeBtn = document.getElementById('backward_page_iframe');
const DocsIframe = document.getElementById('doc_iframe');

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
        title: '复制成功',
        onOpening: function() {
            izi_notify.play();
        }
    });
};

refreshIframeBtn.addEventListener('click', function() {
    DocsIframe.contentWindow.location.reload();
});

function handleIframeContent() {
    if (DocsIframe && DocsIframe.contentWindow && DocsIframe.contentWindow.document) {
        const iframeDoc = DocsIframe.contentWindow.document;
        iframeDoc.addEventListener('click', (event) => {
            let targetElement = event.target;
            
            while (targetElement && targetElement !== iframeDoc.body && !targetElement.hasAttribute('href')) {
                targetElement = targetElement.parentElement;
            }
        
            if (targetElement && targetElement.hasAttribute('href')) {
                const link = targetElement.getAttribute('href');
                
                const httpRegex = /^https?:\/\//;
                if (httpRegex.test(link)) {
                    event.preventDefault();
                    ipcRenderer.send('open-url', link);
                }
            }
        });
        iframeDoc.addEventListener('auxclick', (event) => {
            event.preventDefault();
        });
    } else {
        console.error("Unable to access iframe content.");
    }
}

function setIframeListeners() {
    const iframeDoc = DocsIframe.contentWindow.document;

    iframeDoc.addEventListener('click', (event) => {
        let targetElement = event.target;
        
        while (targetElement && targetElement !== iframeDoc.body && !targetElement.hasAttribute('href')) {
            targetElement = targetElement.parentElement;
        }
    
        if (targetElement && targetElement.hasAttribute('href')) {
            const link = targetElement.getAttribute('href');
            
            const httpRegex = /^https?:\/\//;
            if (httpRegex.test(link)) {
                event.preventDefault();
                ipcRenderer.send('open-url', link);
            }
        }
    });
    iframeDoc.addEventListener('auxclick', (event) => {
        event.preventDefault();
    });
}

DocsIframe.addEventListener('load', setIframeListeners);

homePageIframeBtn.addEventListener('click', (event) => {
    DocsIframe.src = "http://localhost:52805/BGP-docs";
    DocsIframe.onload = () => {
        setIframeListeners();
        DocsIframe.onload = null;
    };
});

backwardPageIframeBtn.addEventListener('click', (event) => {
    DocsIframe.contentWindow.history.back();
    DocsIframe.onload = () => {
        setIframeListeners();
        DocsIframe.onload = null;
    };
});
