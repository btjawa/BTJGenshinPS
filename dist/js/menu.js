const menuItems = [
    {
        selector: 'menu_selector_0',
        page: 'page_0',
        iconClass: 'fa-home',
        active: true,
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
        active: false
    }
];

function toggleMenuState(selector) {
    menuItems.forEach(item => {
        const active = item.selector === selector;
        const prefix = active ? 'fa-solid' : 'fa-light';
        $(`.${item.selector}_background`).toggleClass('active', active);
        $(`#${item.selector}_icon`).attr("class", `${prefix} ${item.iconClass}`);
        $(`.menu_underline_${item.selector.split('_')[2]}`).toggleClass('active', active);
        $(`.${item.page}`).toggle(active).toggleClass('active', active);
        if (item.extra) {
            for (let i = 0; i < item.extra.length; i++) {
                $(`.${item.extra[i]}`).toggleClass('active', active);
            }
        }
    });
}

$(document).ready(() => {
    menuItems.forEach(item => {
        if (item.active) toggleMenuState(item.selector);
        $(`.${item.selector}`).on('click', () => toggleMenuState(item.selector));
    });
});