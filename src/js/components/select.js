// export const customSelectHandler = (e) => {
//     const $customSelectBox = e.target.closest('.js_custom_select');
//     const $allSelects = document.querySelectorAll('.js_custom_select');
//
//     $allSelects.forEach(select => {
//         if (select !== $customSelectBox) {
//             select.classList.remove('on');
//         }
//     })
//
//     if ($customSelectBox) {
//         $customSelectBox.classList.toggle('on');
//     }
//
//     if (e.target.tagName === 'LI' && e.target.closest('.js_custom_select')) {
//         const value = e.target.innerHTML;
//         const dataValue = e.target.dataset.value;
//         const selectInput = e.target.closest('.js_custom_select').querySelector('.select_value');
//
//         if (selectInput.tagName === 'INPUT') {
//             selectInput.value = value;
//             selectInput.dataset.value = dataValue;
//         } else if (selectInput.tagName === 'DIV') {
//             selectInput.innerHTML = value;
//             selectInput.dataset.value = dataValue;
//         }
//         $customSelectBox.classList.remove('on');
//     }
// }
export const customSelectHandler = (e) => {
    const $customSelectBox = e.target.closest('.js_custom_select');
    const $allSelects = document.querySelectorAll('.js_custom_select');

    // 클릭한 요소가 커스텀 셀렉트와 관련이 없으면 모든 셀렉트 닫기
    if (!$customSelectBox) {
        $allSelects.forEach(select => {
            select.classList.remove('on');
        });
        return;
    }

    // LI 요소 클릭 시 (옵션 선택)
    if (e.target.tagName === 'LI' && e.target.closest('.js_custom_select')) {
        const value = e.target.innerHTML;
        const dataValue = e.target.dataset.value;
        const selectInput = $customSelectBox.querySelector('.select_value');

        // 값 설정
        if (selectInput.tagName === 'INPUT') {
            selectInput.value = value;
            selectInput.dataset.value = dataValue;
        } else if (selectInput.tagName === 'DIV') {
            selectInput.innerHTML = value;
            selectInput.dataset.value = dataValue;
        }

        // 모든 셀렉트 닫기
        $allSelects.forEach(select => {
            select.classList.remove('on');
        });

        // limit_cnt 셀렉트인 경우 MutationObserver가 감지하도록 이벤트 발생
        if (selectInput.id === 'select_limit') {
            // data-value 변경을 트리거하여 MutationObserver가 감지하도록 함
            const event = new Event('change', { bubbles: true });
            selectInput.dispatchEvent(event);
        }

        // 이벤트 전파 중단
        e.stopPropagation();
        return;
    }

    // 셀렉트 박스 클릭 시 (토글)
    if (e.target.closest('.js_custom_select')) {
        // 다른 모든 셀렉트 닫기
        $allSelects.forEach(select => {
            if (select !== $customSelectBox) {
                select.classList.remove('on');
            }
        });

        // 현재 셀렉트 토글
        $customSelectBox.classList.toggle('on');

        // 이벤트 전파 중단
        e.stopPropagation();
    }
};
