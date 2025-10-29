import {commonModal} from "../../utils/commonModal.js";
import {bindAutoHideHeader} from "../../utils/bindAutoHideHeader.js";

const notificationController = (() => {

    document.querySelector('.btn_submit').addEventListener('click', (e) => {
        e.preventDefault();
        commonModal.open('설정이 완료되었습니다.')
    });

    const initialize = async() => {
        bindAutoHideHeader();
    }
    return { init: initialize };
})();

document.addEventListener('DOMContentLoaded', notificationController.init);