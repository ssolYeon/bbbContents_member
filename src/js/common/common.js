// // import { navigationController } from "../navigation/navigationController.js";
// import { setViewHeight } from "./viewHeight.js";
// import { customSelectHandler } from "../components/select.js";
// import { toastLayerHandler } from "../components/toastLayer.js";
//
// import {gnbHandler} from "../navigation/gnbClassController.js";
// document.addEventListener("DOMContentLoaded", () => {
//     gnbHandler();
//     //navigationController();
//     setViewHeight();
//     window.toastLayerHandler = toastLayerHandler;
//
//     document.body.addEventListener('click', (e)=> {
//         customSelectHandler(e);
//     })
// })
//
//
//
// document.addEventListener("DOMContentLoaded", () => {
//     /*
//     리스트 정렬을 위한 셋팅함수
//     */
//     function setSortOrder(field, direction) {
//         const sortOrderInput = document.querySelector('input[name="sort_order"]');
//         sortOrderInput.value = field + '__' + direction;
//         document.getElementById('searchForm').submit();
//     }
//
//     // 전역 스코프에 노출
//     window.setSortOrder = setSortOrder;
// });
// /js/common/common.js (최적화된 버전)
import { setViewHeight } from "./viewHeight.js";
import { customSelectHandler } from "../components/select.js";
import { toastLayerHandler } from "../components/toastLayer.js";
import { gnbHandler } from "../navigation/gnbClassController.js";

document.addEventListener("DOMContentLoaded", () => {
    // 초기화 함수들
    gnbHandler();
    setViewHeight();
    window.toastLayerHandler = toastLayerHandler;

    // 전역 클릭 이벤트 (커스텀 셀렉트 처리)
    document.body.addEventListener('click', (e) => {
        customSelectHandler(e);
    });

    // 정렬 함수 전역 등록
    window.setSortOrder = function(field, direction) {
        const sortOrderInput = document.querySelector('input[name="sort_order"]');
        if (sortOrderInput) {
            sortOrderInput.value = field + '__' + direction;
            const form = document.getElementById('searchForm');
            if (form) {
                form.submit();
            }
        }
    };

    // MutationObserver for limit_cnt (페이지 전용)
    const limitSelect = document.getElementById('select_limit');
    const limitInput = document.querySelector('input[name="limit_cnt"]');
    const searchForm = document.getElementById('searchForm');

    if (limitSelect && limitInput && searchForm) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-value') {
                    limitInput.value = limitSelect.dataset.value;
                    searchForm.submit();
                }
            });
        });

        observer.observe(limitSelect, {
            attributes: true,
            attributeFilter: ['data-value']
        });
    }

    // 폼 제출 전 data-value를 실제 input value로 복사
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            // 모든 커스텀 셀렉트의 data-value를 실제 value로 복사
            form.querySelectorAll('.js_custom_select .select_value').forEach(function(input) {
                const dataValue = input.dataset.value;
                if (dataValue !== undefined && input.name) {
                    // hidden input이 있으면 업데이트, 없으면 생성
                    let hiddenInput = form.querySelector(`input[type="hidden"][name="${input.name}"]`);
                    if (!hiddenInput) {
                        hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = input.name;
                        form.appendChild(hiddenInput);
                    }
                    hiddenInput.value = dataValue;
                }
            });
        });
    });
});
