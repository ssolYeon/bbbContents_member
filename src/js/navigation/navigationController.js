import {navigationData} from "./navigationData.js";

export const navigationController = (_data) => {
    const data = navigationData(_data);
    const navigationWrapper = document.querySelector(".gnb > ul");
    let navigationElement = "";

    const method = {
        renderNavigation: () => {
            data.forEach((item) => {
                let subMenu = "";
                if (item.children && item.children.length > 0) { 
                    subMenu = `
                        <ul role="list" class="gnb_2depth">
                            ${item.children.map(subItem => `
                                <li role="listitem" class="depth_item">
                                    <a href="${subItem.link}">${subItem.name}</a>
                                </li>
                            `).join('')}
                        </ul>`;
                }
                navigationElement += `
                    <li role="listitem" class="gnb_1depth">
                        <button type="button" class="js_gnb_open_button">
                            <span class="icon">
                                <img src="${item.lightIcon}" alt="gnb icon" class="light">
                            </span>
                            ${item.name}
                        </button>
                        ${subMenu}
                    </li>`;
            });
            navigationWrapper.innerHTML = navigationElement;
        },
    };

    const initialize = () => {
        method.renderNavigation();
    };

    initialize();
};
