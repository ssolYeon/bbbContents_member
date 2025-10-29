/**
 * @param {Object} opts
 * @param {boolean} [opts.activateOnLoad=false]  // 로드시 .search_form_container에 active 부여
 * @param {boolean} [opts.prefillFromURL=true]   // ?query= 값을 인풋에 채우기
 * @param {boolean} [opts.keywordsRequireFocus=false] // 최근검색어는 인풋 focus일 때만 노출
 * @param {boolean} [opts.closeButtonDeactivatesForm=true] // 인풋 옆 닫기 눌렀을 때 폼 active 제거 여부
 */
export function initSearchHandler(opts = {}) {
    const options = {
        activateOnLoad: false,
        prefillFromURL: true,
        keywordsRequireFocus: false,
        closeButtonDeactivatesForm: true,
        ...opts,
    };

    const searchBtn     = document.querySelector('.btn_header_search');
    const searchForm    = document.querySelector('.search_form_container');
    const inputCloseBtn = document.querySelector('.search_form_container > .btn_closed');
    const submitBtn     = searchForm?.querySelector('.btn_search_submit');
    const kwCloseBtn    = searchForm?.querySelector('.search_keyword .button_container .btn_closed'); // 키워드 영역 닫기
    const input         = searchForm?.querySelector('input[name="search"]');
    const keywordWrap   = searchForm?.querySelector('.search_keyword');
    const keywordList   = searchForm?.querySelector('.keyword_list');
    const deleteAllBtn  = searchForm?.querySelector('.search_keyword .btn_delete');
    const toggleSaveBtn = searchForm?.querySelector('.search_keyword .btn_off');

    if (!searchBtn || !searchForm || !keywordWrap || !keywordList || !input) return;

    // ---- 상태 ----
    let autoSaveOn = true;
    let isClosing = false; // 닫기 시퀀스 중 재개방 방지

    // 초기 DOM에서 최근 검색어 확보(중복 허용)
    let recentKeywords = Array.from(keywordList.querySelectorAll('span.keyword'))
        .map(s => s.textContent ?? '');

    // ---- 유틸 ----
    const makeMsgItem = (text, cls = 'msg') => {
        const li = document.createElement('li');
        li.role = 'listitem';
        li.className = cls;
        li.textContent = text;
        return li;
    };
    const isInside = (el, root) => !!(el && root && (el === root || root.contains(el)));

    const renderKeywordList = () => {
        keywordList.innerHTML = '';
        if (!autoSaveOn) {
            keywordList.appendChild(makeMsgItem('자동저장기능이 꺼져있습니다.', 'off'));
            return;
        }
        if (recentKeywords.length === 0) {
            keywordList.appendChild(makeMsgItem('최근 검색어가 없습니다.', 'empty'));
            return;
        }
        recentKeywords.forEach((kw, idx) => {
            const li = document.createElement('li');
            li.role = 'listitem';
            li.dataset.idx = String(idx);
            li.innerHTML = `
        <span class="keyword">${kw}</span>
        <button type="button" class="btn_closed" aria-label="검색어 삭제">
          <img src="/src/assets/images/icons/icon_circle_btn_delete_gray@x3.png" alt="">
        </button>
      `;
            keywordList.appendChild(li);
        });
    };

    // 닫기 공통 처리
    const closeKeywords = (opts2 = { blurInput: false, deactivateForm: false, clearInput: false }) => {
        isClosing = true;
        keywordWrap.classList.remove('active');
        // 검색 페이지 요구: 포커스 없으면 최근검색어 숨김 유지
        if (options.keywordsRequireFocus) searchForm.classList.add('kw-suppress');

        if (opts2.deactivateForm) searchForm.classList.remove('active');
        if (opts2.clearInput) input.value = '';
        if (opts2.blurInput) input.blur();
        setTimeout(() => { isClosing = false; }, 0);
    };

    // 표시 규칙
    const updateKeywordVisibility = () => {
        if (isClosing) {
            keywordWrap.classList.remove('active');
            return;
        }
        const hasAnyItem = keywordList.querySelectorAll('li').length > 0;
        const isFocused  = document.activeElement === input;

        // 기본: (isFocused OR form.active) && hasAnyItem
        // 검색 페이지 옵션(keywordsRequireFocus=true): "form.active"만으로는 절대 열리지 않음
        const showByActive = !options.keywordsRequireFocus && searchForm.classList.contains('active');
        const shouldShow = (isFocused || showByActive) && hasAnyItem;

        if (shouldShow) {
            keywordWrap.classList.add('active');
            if (options.keywordsRequireFocus && isFocused) {
                searchForm.classList.remove('kw-suppress'); // 포커스되면 억제 해제
            }
        } else {
            keywordWrap.classList.remove('active');
            if (options.keywordsRequireFocus && !isFocused) {
                searchForm.classList.add('kw-suppress'); // 포커스가 아니면 억제 유지
            }
        }
    };

    // ---- 초기 세팅 ----
    if (options.activateOnLoad) {
        searchForm.classList.add('active');
    }
    if (options.keywordsRequireFocus) {
        // 폼은 active지만, 초기엔 최근검색어 숨김
        searchForm.classList.add('kw-suppress');
    }
    if (options.prefillFromURL) {
        const urlQuery = new URL(window.location.href).searchParams.get('query');
        if (typeof urlQuery === 'string' && urlQuery.trim()) {
            input.value = urlQuery.trim();
            // 값만 채우고 포커스는 주지 않음(요구사항)
        }
    }

    // ---- 이벤트 ----
    // 열기(헤더의 검색 버튼)
    searchBtn.addEventListener('click', () => {
        searchForm.classList.add('active');
        // 검색 페이지 요구: 자동 포커스 X → 최근검색어도 그대로 숨김(kw-suppress 유지)
        updateKeywordVisibility();
    });

    // 제출 (임시 이동 + 자동저장 ON이면 저장)
    submitBtn?.addEventListener('click', () => {
        const keyword = input.value.trim();
        if (!keyword) return;
        if (autoSaveOn) {
            recentKeywords.unshift(keyword);
            renderKeywordList();
        }
        window.location.href = `/pages/search/search.html?query=${encodeURIComponent(keyword)}`;
    });

    // 인풋 옆 닫기
    inputCloseBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeKeywords({
            blurInput: true,
            deactivateForm: options.closeButtonDeactivatesForm, // 검색페이지에서는 false 권장
            clearInput: true
        });
    });

    // 키워드 영역 닫기
    kwCloseBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeKeywords({ blurInput: true });
    });

    // 인풋 포커스/블러/입력
    input.addEventListener('focus', () => {
        // 포커스 시 억제 해제(검색 페이지)
        if (options.keywordsRequireFocus) searchForm.classList.remove('kw-suppress');
        updateKeywordVisibility();
    });

    input.addEventListener('blur', () => {
        if (isClosing) return;
        // 블러되면 다시 억제(검색 페이지)
        if (options.keywordsRequireFocus) searchForm.classList.add('kw-suppress');
        setTimeout(updateKeywordVisibility, 0);
    });

    input.addEventListener('input', updateKeywordVisibility);

    // 전체삭제
    deleteAllBtn?.addEventListener('click', () => {
        recentKeywords = [];
        renderKeywordList();
        updateKeywordVisibility();
    });

    // 자동 저장 토글
    toggleSaveBtn?.addEventListener('click', () => {
        autoSaveOn = !autoSaveOn;
        toggleSaveBtn.textContent = autoSaveOn ? '자동 저장 끄기' : '자동저장 켜기';
        renderKeywordList();
        updateKeywordVisibility();
    });

    // 리스트 위임: 개별 삭제 / 키워드 클릭
    keywordList.addEventListener('click', (e) => {
        const target = e.target;

        // 개별 삭제(인덱스로 정확히 하나)
        if (target.closest('button.btn_closed')) {
            const li = target.closest('li');
            const idx = Number(li?.dataset.idx);
            if (!Number.isNaN(idx)) {
                recentKeywords.splice(idx, 1);
                renderKeywordList();
                updateKeywordVisibility();
            }
            return;
        }

        // 키워드 클릭 → 인풋 채우고 포커스
        const kwSpan = target.closest('span.keyword');
        if (kwSpan) {
            input.value = kwSpan.textContent ?? '';
            input.focus(); // 포커스되면 억제 해제 → 최근검색어 노출
            updateKeywordVisibility();
        }
    });

    // 바깥 클릭(캡처 단계): 폼 바깥이면 한 번에 닫기
    document.addEventListener('pointerdown', (e) => {
        if (isInside(e.target, searchForm)) return;
        closeKeywords({ blurInput: true });
    }, true);

    // 초기 반영
    renderKeywordList();
    updateKeywordVisibility();
}
