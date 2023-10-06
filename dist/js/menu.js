const menuItems = [
    {
        selector: 'menu_selector_0',
        page: 'page_0',
        iconClass: 'fa-home',
        active: true
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

function toggleMenuState(activeSelector) {
    menuItems.forEach(item => {
        const active = item.selector === activeSelector;
        const prefix = active ? 'fa-solid' : 'fa-light';
        $(`.${item.selector}_background`).toggleClass('active', active);
        $(`#${item.selector}_icon`).attr("class", `${prefix} ${item.iconClass}`);
        $(`.menu_underline_${item.selector.split('_')[2]}`).toggleClass('active', active);
        $(`.${item.page}`).toggle(active).toggleClass('active', active);
    });
}

$(document).ready(function () {
    const activeItem = menuItems.find(item => item.active);
    if (activeItem) {
        toggleMenuState(activeItem.selector);
    }
    menuItems.forEach(item => {
        $(`.${item.selector}`).on('click', function () {
            toggleMenuState(item.selector);
        });
    });
});