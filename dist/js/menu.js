let state_menu_selector_log = "inactive";

let menuSelectors_0 = document.querySelectorAll('.menu_selector_0');
let menuSelectors_1 = document.querySelectorAll('.menu_selector_1');
let menuSelectorsSettings = document.querySelectorAll('.menu_selector_settings');
let menuSelectorsLog = document.querySelectorAll('.menu_selector_log');
let menuSelector_0_Background= document.querySelector(".menu_selector_0_background");
let menuSelector_1_Background = document.querySelector('.menu_selector_1_background');
let menuSelectorSettings_Background = document.querySelector('.menu_selector_settings_background');
let menuSelectorLog_Background = document.querySelector('.menu_selector_log_background');
let menuSelector_0_Icon = document.getElementById("menu_selector_0_icon");
let menuSelector_1_Icon = document.getElementById("menu_selector_1_icon");
let menuSelectorSettingsIcon = document.getElementById("menu_selector_settings_icon");
let menuSelectorLogIcon = document.getElementById("menu_selector_log_icon");
let menuUnderline_0 = document.querySelector(".menu_underline_0");
let menuUnderline_1 = document.querySelector('.menu_underline_1');
let menuUnderlineSettings = document.querySelector('.menu_underline_settings');
let menuUnderlineLog = document.querySelector('.menu_underline_log');
let resGetway_0 = document.querySelector(".res_getway_0");
let resGetway_1 = document.querySelector(".res_getway_1");
let operationBox = document.querySelector(".operation_box");
let page_0 = document.querySelector('.page_0');
let page_1 = document.querySelector('.page_1');
let page_log = document.querySelector('.page_log');
let page_settings = document.querySelector('.page_settings');


function menuSelector_0_Active(){
    menuSelectors_0.forEach(selector => {
        selector.addEventListener('click', function() {
            menuSelector_0_Background.classList.add('active');
            menuSelector_1_Background.classList.remove('active');
            menuSelectorSettings_Background.classList.remove('active');
            menuSelectorLog_Background.classList.remove('active');
            menuSelector_0_Icon.className = "fa-solid fa-house";
            menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
            menuSelectorSettingsIcon.className = "fa-light fa-gear";
            menuSelectorLogIcon.className = "fa-light fa-memo-circle-info";
            menuUnderline_0.classList.add("active");
            menuUnderline_1.classList.remove("active");
            menuUnderlineSettings.classList.remove("active");
            menuUnderlineLog.classList.remove("active");
            state_menu_selector_log = "inactive";
            page_0.style.display = 'block';
            page_0.classList.add("active");
            page_1.style.display = 'none';
            page_1.classList.remove("active");
            page_settings.style.display = 'none';
            page_settings.classList.remove("active");
            page_log.style.display = 'none';
            page_log.classList.remove("active");
            operationBox.classList.add("active");
            updateBtn.classList.add("active");
        });
    });
}

function menuSelector_1_Active(){
    menuSelectors_1.forEach(selector => {
        selector.addEventListener('click', function() {
            menuSelector_0_Background.classList.remove('active');
            menuSelector_0_Icon.className = "fa-light fa-house";
            menuSelector_1_Icon.className = "fa-solid fa-screwdriver-wrench";
            menuSelector_1_Background.classList.add('active');
            menuSelectorSettingsIcon.className = "fa-light fa-gear";
            menuSelectorSettings_Background.classList.remove('active');
            menuUnderline_0.classList.remove("active");
            menuUnderline_1.classList.add("active");
            menuUnderlineSettings.classList.remove("active");
            state_menu_selector_log = "inactive";
            page_0.style.display = 'none';
            page_0.classList.remove("active");
            page_1.style.display = 'block';
            page_1.classList.add("active");
            page_settings.style.display = 'none';
            page_settings.classList.remove("active");
            operationBox.classList.remove("active");

            page_log.style.display = 'none';
            page_log.classList.remove("active");
            state_menu_selector_log = "inactive";
            menuUnderlineLog.classList.remove("active");
            menuSelectorLogIcon.className = "fa-light fa-memo-circle-info";
            menuSelectorLog_Background.classList.remove('active');
            updateBtn.classList.remove("active");
        });
    }); 
}

function menuSelectorSettingsActive (){
    menuSelectorsSettings.forEach(selector => {
        selector.addEventListener('click', function() {
            menuSelector_0_Background.classList.remove('active');
            menuSelector_0_Icon.className = "fa-light fa-house";
            menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
            menuSelectorSettingsIcon.className = "fa-solid fa-gear";
            menuSelector_1_Background.classList.remove('active');
            menuSelectorSettings_Background.classList.add('active');
            menuUnderline_0.classList.remove("active");
            menuUnderline_1.classList.remove("active");
            menuUnderlineSettings.classList.add("active");
            state_menu_selector_log = "inactive";
            page_0.style.display = 'none';
            page_0.classList.remove("active");
            page_1.style.display = 'none';
            page_1.classList.remove("active");
            page_settings.style.display = 'block';
            page_settings.classList.add("active");
            operationBox.classList.remove("active");

            page_log.style.display = 'none';
            page_log.classList.remove("active");
            state_menu_selector_log = "inactive";
            menuUnderlineLog.classList.remove("active");
            menuSelectorLogIcon.className = "fa-light fa-memo-circle-info";
            menuSelectorLog_Background.classList.remove('active');
            updateBtn.classList.remove('active');
        });
    });  
}

function menuSelectorLogActive (){
    menuSelectorsLog.forEach(selector => {
        selector.addEventListener('click', function() {
            menuSelector_0_Background.classList.remove('active');
            menuSelector_0_Icon.className = "fa-light fa-house";
            menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
            menuSelectorSettingsIcon.className = "fa-light fa-gear";
            menuSelector_1_Background.classList.remove('active');
            menuSelectorSettings_Background.classList.remove('active');
            menuUnderline_0.classList.remove("active");
            menuUnderline_1.classList.remove("active");
            menuUnderlineSettings.classList.remove("active");
            state_menu_selector_log = "active";
            page_0.style.display = 'none';
            page_0.classList.remove("active");
            page_1.style.display = 'none';
            page_1.classList.remove("active");
            page_settings.style.display = 'block';
            page_settings.classList.remove("none");
            operationBox.classList.remove("active");

            menuSelectorLogIcon.style.color = '#c4c4c4';
            document.querySelector(".menu_selector_log_text").style.color = '#c4c4c4';

            menuSelector_0_Background.classList.remove('active');
            menuSelector_1_Background.classList.remove('active');
            menuSelectorSettings_Background.classList.remove('active');
            menuSelectorLog_Background.classList.add('active');

            menuSelector_0_Icon.className = "fa-light fa-house";
            menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
            menuSelectorSettingsIcon.className = "fa-light fa-gear";
            menuSelectorLogIcon.classList = "fa-solid fa-memo-circle-info"

            menuUnderline_0.classList.remove("active");
            menuUnderline_1.classList.remove("active");
            menuUnderlineSettings.classList.remove("active");
            menuUnderlineLog.classList.add("active");

            page_0.style.display = 'none';
            page_0.classList.remove("active");
            page_1.style.display = 'none';
            page_1.classList.remove("active");
            page_log.style.display = 'block';
            page_log.classList.add("active");
            page_settings.style.display = 'none';
            page_settings.classList.remove("active");
            operationBox.classList.remove("active");
            updateBtn.classList.remove('active');
        });
    });  
};
    

document.addEventListener("DOMContentLoaded", function() {
    menuSelectors_0;
    menuSelectors_1;
    menuSelector_0_Icon.className = "fa-solid fa-house";
    menuSelector_1_Icon.className = "fa-light fa-screwdriver-wrench";
    menuSelector_0_Background.classList.add("active");
    menuUnderline_0.classList.add("active");
    page_0.style.display = 'block';
    page_0.classList.add("active");
    page_1.style.display = 'none';
    page_1.classList.remove("active");
    page_settings.style.display = 'none';
    page_settings.classList.remove("active");
    resGetway_0.classList.add("active");
    resGetway_1.classList.add("active");
    operationBox.classList.add("active");
    
    menuSelector_0_Active();
    
    menuSelector_1_Active();
    
    menuSelectorSettingsActive();

    if (state_menu_selector_log == "active"){
        menuSelectorLogActive();
    }
});