const menuState = {
    'menu_selector_0': 'active',
    'menu_selector_1': 'inactive',
    'menu_selector_settings': 'inactive',
    'menu_selector_log': 'inactive',
    'menu_selector_2': 'inactive',
};

const pages = ['page_0', 'page_1', 'page_settings', 'page_log', 'page_2'];
const menuSelectors = ['menu_selector_0', 'menu_selector_1', 'menu_selector_settings', 'menu_selector_log', 'menu_selector_2'];
const homeEss = ['res_getway_0', 'res_getway_1', 'update'];
const classNames = ['fa-home', 'fa-screwdriver-wrench', 'fa-gear', 'fa-memo-circle-info', 'fa-book'];

function toggleMenuState(activeSelector) {
    $.each(menuState, (key, value) => {
        const bg = $(`.${key}_background`);
        const icon = $(`#${key}_icon`);
        const underline = $(`.menu_underline_${key.split('_')[2]}`);
        const index = menuSelectors.indexOf(key);
        const pageElement = $(`.${pages[index]}`);
        if (key === activeSelector) {
            bg.addClass('active');
            icon.attr("class", `fa-solid ${classNames[index]}`);
            underline.addClass('active');
            menuState[key] = 'active';
            pageElement.show().addClass('active');
        } else {
            bg.removeClass('active');
            icon.attr("class", `fa-light ${classNames[index]}`);
            underline.removeClass('active');
            menuState[key] = 'inactive';
            pageElement.hide().removeClass('active');
        }
    });
    for (const buttonSelector of homeEss) {
        const button = $(`button[name="${buttonSelector}"]`);
        if (activeSelector === "menu_selector_0") {
            button.addClass('active');
        } else {
            button.removeClass('active');
        }
    }
    const patchState = $('.patch_state');
    if (activeSelector === "menu_selector_0") {
        patchState.addClass('active');
    } else {
        patchState.removeClass('active');
    }
}

$(document).ready(function () {
    toggleMenuState(Object.keys(menuState).find(key => menuState[key] === 'active'));
    menuSelectors.forEach(selector => {
        $(`.${selector}`).on('click', function () {
            toggleMenuState(selector);
        });
    });
});