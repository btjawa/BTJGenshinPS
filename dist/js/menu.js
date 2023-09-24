const menuState = {
    'menu_selector_0': 'active',
    'menu_selector_1': 'inactive',
    'menu_selector_settings': 'inactive',
    'menu_selector_log': 'inactive',
    'menu_selector_2': 'inactive',
};

const pages = ['page_0', 'page_1', 'page_settings', 'page_log'];
const menuSelectors = ['menu_selector_0', 'menu_selector_1', 'menu_selector_settings', 'menu_selector_log', 'menu_selector_2'];
const homeEss = ['res_getway_0', 'res_getway_1', 'update']
const classNames = ['fa-home', 'fa-screwdriver-wrench', 'fa-gear', 'fa-memo-circle-info', 'fa-book'];

function toggleMenuState(activeSelector, action = null) {
    for (const key in menuState) {
        const bg = document.querySelector(`.${key}_background`);
        const icon = document.getElementById(`${key}_icon`);
        const underline = document.querySelector(`.menu_underline_${key.split('_')[2]}`);
        const index = menuSelectors.indexOf(key);
        const pageElement = document.querySelector(`.${'page_' + key.split('_')[2]}`);
        if (key === activeSelector) {
            bg.classList.add('active');
            icon.className = "fa-solid " + classNames[index];
            underline.classList.add('active');
            menuState[key] = 'active';
            pageElement.style.display = 'block';
            pageElement.classList.add('active');
        } else {
            bg.classList.remove('active');
            icon.className = "fa-light " + classNames[index];
            underline.classList.remove('active');
            menuState[key] = 'inactive';
            pageElement.style.display = 'none';
            pageElement.classList.remove('active');
        }
        for (const buttonSelector of homeEss) {
            const button = document.querySelector(`button[name="${buttonSelector}"]`);
            if (button) {
                if (activeSelector === "menu_selector_0") {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        }
        const patchState = document.querySelector('.patch_state');
        if (patchState) {
            if (activeSelector === "menu_selector_0") {
                patchState.classList.add('active');
            } else {
                patchState.classList.remove('active');
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    Object.entries(menuState).forEach(([key, value]) => {
        const bg = document.querySelector(`.${key}_background`);
        const icon = document.getElementById(`${key}_icon`);
        const underline = document.querySelector(`.menu_underline_${key.split('_')[2]}`);
        const page = document.querySelector(`.page_${key.split('_')[2]}`);
        if (value === 'active') {
            bg.classList.add('active');
            icon.className = `fa-solid ${classNames[menuSelectors.indexOf(key)]}`;
            underline.classList.add('active');
            page.style.display = 'block';
            page.classList.add('active');
        } else {
            bg.classList.remove('active');
            icon.className = `fa-light ${classNames[menuSelectors.indexOf(key)]}`;
            underline.classList.remove('active');
            page.style.display = 'none';
            page.classList.remove('active');
        }
    });
    for (const selector of menuSelectors) {
        const elements = document.querySelectorAll(`.${selector}`);
        elements.forEach(element => {
            element.addEventListener('click', function () {
                toggleMenuState(selector);
            });
        });
    }
});
