const menuItems = [
    {
        selector: 'menu_selector_0',
        page: 'page_0',
        iconClass: 'fa-home',
        active: false,
        extra: ["page_0_text_1_flex", "page_0_text_conn_test"]
    },
    {
        selector: 'menu_selector_1',
        page: 'page_1',
        iconClass: 'fa-screwdriver-wrench',
        active: false
    },
    {
        selector: 'menu_selector_settings',
        page: 'page_settings',
        iconClass: 'fa-gear',
        active: false
    },
    {
        selector: 'menu_selector_log',
        page: 'page_log',
        iconClass: 'fa-memo-circle-info',
        active: false
    },
    {
        selector: 'menu_selector_2',
        page: 'page_2',
        iconClass: 'fa-book',
        active: false,
        extra: ["doc_iframe"]
    }
];

let current = null;

function toggleMenuState(selector) {
    if (current === selector) return;
    current = selector;
    menuItems.forEach(item => {
        const active = item.selector === selector;
        $(`.${item.selector}`).on('click', () => toggleMenuState(item.selector));
        $(`.${item.selector}_background`).toggleClass('active', active);
        $(`#${item.selector}_icon`).attr("class", `fa-${active?'solid':'light'} ${item.iconClass}`);
        $(`.menu_underline_${item.selector.split('_')[2]}`).toggleClass('active', active);
        $(`.${item.page}`).toggle(active).toggleClass('active', active);
        if (item.extra) {
            for (let i = 0; i < item.extra.length; i++) {
                const top = parseFloat($(`.${item.extra[i]}`).css('top'));
                const keyframes = `@keyframes slideUp_${item.extra[i]} {
                    0% { top: ${top - 17}px; }
                    100% { top: ${top}px; }
                }`;
                document.styleSheets[0].insertRule(keyframes, document.styleSheets[0].cssRules.length);
                $(`.${item.extra[i]}`).css({
                    animation: `slideUp_${item.extra[i]} 0.66s cubic-bezier(0,1,.6,1), fadeIn 0.5s cubic-bezier(0,1,.6,1)`,
                });
                if (!active) $(`.${item.extra[i]}`).css('animation', 'none');
            }
        }
    });
}