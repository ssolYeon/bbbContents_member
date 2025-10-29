import {commonModal} from "../../utils/commonModal.js";
import {bindAutoHideHeader} from "../../utils/bindAutoHideHeader.js";

const commentsController = (() => {

    const bindCommentsModals = () => {
        const list = document.querySelector('.comments_list_container .list_contents');
        if (!list) return;

        list.addEventListener('click', (e) => {
            const openBtn = e.target.closest('.btn_open_modal');
            if (openBtn) {
                e.preventDefault();
                e.stopPropagation();

                const li = openBtn.closest('li');
                if (!li) return;

                const modal = li.querySelector('.modal_button_container');
                if (!modal) return;

                // (선택) 다른 항목에 열려있는 모달 닫기
                list.querySelectorAll('.modal_button_container.active').forEach(el => {
                    if (el !== modal) el.classList.remove('active');
                });

                modal.classList.add('active');
                return;
            }

            const cancelBtn = e.target.closest('.btn_cancel');
            if (cancelBtn) {
                e.preventDefault();
                e.stopPropagation();

                const li = cancelBtn.closest('li');
                li?.querySelector('.modal_button_container')?.classList.remove('active');
                return;
            }
        });
    };

    const initialize = async() => {
        bindCommentsModals();
    }
    return { init: initialize };
})();

document.addEventListener('DOMContentLoaded', commentsController.init);