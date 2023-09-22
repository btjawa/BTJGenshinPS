const iziToast = require("izitoast");

const refreshIframeBtn = document.getElementById('refresh_iframe')
const prevPageIframeBtn = document.getElementById('prev_page_iframe')
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

getLatestCommitID();

refreshIframeBtn.addEventListener('click', function() {
    docIframe.src = docIframe.src;
});

let attempts = 0;
const MAX_ATTEMPTS = 30;

function handleIframeContent() {
    if (DocsIframe && DocsIframe.contentWindow && DocsIframe.contentWindow.document) {
        clearInterval(checkIframeInterval);

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
    } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(checkIframeInterval);
        console.error("Unable to access iframe content after multiple attempts.");
    }
    attempts++;
}

const checkIframeInterval = setInterval(handleIframeContent, 500);