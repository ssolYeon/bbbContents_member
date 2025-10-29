
    document.addEventListener("DOMContentLoaded", () => {
    /*
    리스트 정렬을 위한 셋팅함수
    */
        function setSortOrder(field, direction) {
            const sortOrderInput = document.querySelector('input[name="sort_order"]');
            sortOrderInput.value = field + '__' + direction;
            document.getElementById('searchForm').submit();
        }

        // 전역 스코프에 노출
        window.setSortOrder = setSortOrder;
    });
