/**
 * 메인 페이지(mbm) 전용 통합 카드 관리 모듈
 * card_common.js 기반 재설계
 */

/**
 * 공통 카드/그룹 관리 클래스
 */
class CardGroupManager {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || '.groups_wrapper',
            layerSelector: options.layerSelector || '.layer_modal',
            searchEndpoint: options.searchEndpoint || '/api/search',
            fieldPrefix: options.fieldPrefix || 'main_c',
            kValue: options.kValue || 'C0100',
            defaultVtype: options.defaultVtype || 'bch',
            allowedVtypes: options.allowedVtypes || null,
            sectionType: options.sectionType || null,
            ...options
        };

        this.groups = [];
        this.currentGroupIndex = null;
        this.searchResults = [];
        this.selectedCards = [];
        this.currentTab = 0;
        this.isSearching = false;

        this.init();
    }

    /**
     * JSON 안전 파싱
     */
    safeJsonParse(jsonString, defaultValue = null) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('JSON 파싱 실패:', e, jsonString);
            return defaultValue;
        }
    }

    /**
     * 초기화
     */
    init() {
        this.bindEvents();
        this.loadExistingGroups();
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        const container = document.querySelector(this.options.containerSelector);
        const layer = document.querySelector(this.options.layerSelector);

        if (!container || !layer) {
            console.error('필수 요소를 찾을 수 없습니다.', {
                container: this.options.containerSelector,
                layer: this.options.layerSelector
            });
            return;
        }

        // 그룹 제어 버튼
        container.addEventListener('click', (e) => {
            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;
            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);

            if (e.target.closest('.btn_group_up')) {
                this.moveGroupUp(groupIndex);
            } else if (e.target.closest('.btn_group_down')) {
                this.moveGroupDown(groupIndex);
            } else if (e.target.closest('.btn_group_delete')) {
                this.deleteGroup(groupIndex);
            }
        });

        // 카드 추가 버튼
        container.addEventListener('click', (e) => {
            if (e.target.closest('.btn_add_card')) {
                const groupContainer = e.target.closest('.group_container');
                const groupIndex = parseInt(groupContainer.dataset.groupIndex);
                this.openLayer(groupIndex);
            }
        });

        // 카드 제어 버튼
        container.addEventListener('click', (e) => {
            const cardItem = e.target.closest('.common_card_item');
            if (!cardItem) return;

            const groupContainer = e.target.closest('.group_container');
            const groupIndex = parseInt(groupContainer.dataset.groupIndex);
            const cardIndex = parseInt(cardItem.dataset.cardIndex);

            if (e.target.closest('.btn_card_up')) {
                this.moveCardUp(groupIndex, cardIndex);
            } else if (e.target.closest('.btn_card_down')) {
                this.moveCardDown(groupIndex, cardIndex);
            } else if (e.target.closest('.btn_card_delete')) {
                this.deleteCard(groupIndex, cardIndex);
            }
        });

        // 레이어 이벤트는 전역으로 한 번만 바인딩
        if (!CardGroupManager._layerEventsInitialized) {
            this.bindLayerEvents(layer);
            CardGroupManager._layerEventsInitialized = true;
        }

        // 그룹 title/type 변경
        container.addEventListener('input', (e) => {
            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;
            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);

            if (e.target.classList.contains('group_title_input')) {
                this.groups[groupIndex].title = e.target.value;
            } else if (e.target.classList.contains('group_type_select')) {
                this.groups[groupIndex].type = e.target.value;
            }
        });
    }

    /**
     * 레이어 이벤트 바인딩 (전역)
     */
    bindLayerEvents(layer) {
        // 탭 전환
        layer.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.layer_tab_item');
            if (tabItem && !tabItem.disabled) {
                const tabIndex = parseInt(tabItem.dataset.tabIndex);
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.switchTab(tabIndex);
                }
            }
        });

        // 검색
        const searchBtn = layer.querySelector('.btn_layer_search');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (CardGroupManager._activeInstance && !CardGroupManager._activeInstance.isSearching) {
                    CardGroupManager._activeInstance.search();
                }
            });
        }

        const searchInput = layer.querySelector('.layer_search_input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && CardGroupManager._activeInstance && !CardGroupManager._activeInstance.isSearching) {
                    CardGroupManager._activeInstance.search();
                }
            });
        }

        // 검색 결과 추가
        layer.addEventListener('click', (e) => {
            if (e.target.closest('.btn_add_to_selected')) {
                const cardElement = e.target.closest('.search_result_card');
                if (cardElement && CardGroupManager._activeInstance) {
                    const cardData = CardGroupManager._activeInstance.safeJsonParse(cardElement.dataset.card);
                    if (cardData) {
                        CardGroupManager._activeInstance.addToSelected(cardData);
                    }
                }
            }
        });

        // 선택된 카드 제어
        layer.addEventListener('click', (e) => {
            const selectedItem = e.target.closest('.selected_card_item');
            if (!selectedItem || !CardGroupManager._activeInstance) return;

            const cardIndex = parseInt(selectedItem.dataset.selectedIndex);

            if (e.target.closest('.btn_selected_up')) {
                CardGroupManager._activeInstance.moveSelectedUp(cardIndex);
            } else if (e.target.closest('.btn_selected_down')) {
                CardGroupManager._activeInstance.moveSelectedDown(cardIndex);
            } else if (e.target.closest('.btn_remove_selected')) {
                CardGroupManager._activeInstance.removeSelected(cardIndex);
            }
        });

        // 레이어 적용/취소
        layer.addEventListener('click', (e) => {
            if (e.target.closest('.btn_layer_apply')) {
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.applySelection();
                }
            } else if (e.target.closest('.btn_layer_cancel') || e.target.closest('.btn_layer_close')) {
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.closeLayer();
                }
            }
        });

        // 레이어 외부 클릭
        layer.addEventListener('click', (e) => {
            if (e.target === layer && CardGroupManager._activeInstance) {
                CardGroupManager._activeInstance.closeLayer();
            }
        });
    }

    /**
     * 기존 그룹 데이터 로드
     */
    loadExistingGroups() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) {
            this.groups = [];
            return;
        }

        const groupElements = container.querySelectorAll('.group_container');
        this.groups = [];

        if (groupElements.length === 0) {
            return;
        }

        groupElements.forEach((el) => {
            const titleInput = el.querySelector('.group_title_input');
            const typeSelect = el.querySelector('.group_type_select');
            const cardElements = el.querySelectorAll('.common_card_item');

            // 빈 그룹이고 타이틀도 없으면 스킵
            if (cardElements.length === 0 && (!titleInput || !titleInput.value.trim())) {
                return;
            }

            const cards = [];
            cardElements.forEach((cardEl) => {
                const cardData = this.safeJsonParse(cardEl.dataset.card);
                if (cardData) {
                    cards.push(cardData);
                }
            });

            this.groups.push({
                title: titleInput ? titleInput.value : '',
                type: typeSelect ? typeSelect.value : this.options.defaultVtype,
                cards: cards
            });
        });

        console.log(`[${this.options.containerSelector}] 로드된 그룹:`, this.groups);
    }

    /**
     * 그룹 추가
     */
    addGroup() {
        const newGroup = {
            title: '새 그룹',
            type: this.options.defaultVtype,
            cards: []
        };

        this.groups.push(newGroup);
        this.renderGroups();

        setTimeout(() => {
            const container = document.querySelector(this.options.containerSelector);
            if (container) {
                const lastGroup = container.querySelector('.group_container:last-child');
                if (lastGroup) {
                    lastGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 100);
    }

    /**
     * 그룹 이동 (위로)
     */
    moveGroupUp(groupIndex) {
        if (groupIndex === 0) return;

        const temp = this.groups[groupIndex];
        this.groups[groupIndex] = this.groups[groupIndex - 1];
        this.groups[groupIndex - 1] = temp;

        this.renderGroups();
    }

    /**
     * 그룹 이동 (아래로)
     */
    moveGroupDown(groupIndex) {
        if (groupIndex === this.groups.length - 1) return;

        const temp = this.groups[groupIndex];
        this.groups[groupIndex] = this.groups[groupIndex + 1];
        this.groups[groupIndex + 1] = temp;

        this.renderGroups();
    }

    /**
     * 그룹 삭제
     */
    deleteGroup(groupIndex) {
        if (!confirm('이 그룹을 삭제하시겠습니까?')) return;

        this.groups.splice(groupIndex, 1);
        this.renderGroups();
    }

    /**
     * 카드 이동 (위로)
     */
    moveCardUp(groupIndex, cardIndex) {
        if (cardIndex === 0) return;

        const cards = this.groups[groupIndex].cards;
        const temp = cards[cardIndex];
        cards[cardIndex] = cards[cardIndex - 1];
        cards[cardIndex - 1] = temp;

        this.updateSingleGroup(groupIndex);
    }

    /**
     * 카드 이동 (아래로)
     */
    moveCardDown(groupIndex, cardIndex) {
        const cards = this.groups[groupIndex].cards;
        if (cardIndex === cards.length - 1) return;

        const temp = cards[cardIndex];
        cards[cardIndex] = cards[cardIndex + 1];
        cards[cardIndex + 1] = temp;

        this.updateSingleGroup(groupIndex);
    }

    /**
     * 카드 삭제
     */
    deleteCard(groupIndex, cardIndex) {
        if (!confirm('이 카드를 삭제하시겠습니까?')) return;

        this.groups[groupIndex].cards.splice(cardIndex, 1);
        this.updateSingleGroup(groupIndex);
    }

    /**
     * vtype 옵션 생성 (allowedVtypes 반영)
     */
    generateVtypeOptions(selectedType) {
        const vtypeToTabMap = {
            'bch': { label: '콘텐츠가로', tab: 0 },
            'bcv': { label: '콘텐츠세로', tab: 0 },
            'bsh': { label: '시리즈가로', tab: 1 },
            'bsv': { label: '시리즈세로', tab: 1 },
            'hbh': { label: '해봄가로', tab: 2 },
            'hbv': { label: '해봄세로', tab: 2 },
            'gbh': { label: '가봄가로', tab: 3 },
            'gbv': { label: '가봄세로', tab: 3 },
            'sbh': { label: '사봄가로', tab: 4 },
            'sbv': { label: '사봄세로', tab: 4 }
        };

        // allowedVtypes가 설정된 경우 해당 옵션만 표시
        const vtypes = this.options.allowedVtypes
            ? Object.fromEntries(
                Object.entries(vtypeToTabMap).filter(([key]) =>
                    this.options.allowedVtypes.includes(key)
                )
            )
            : vtypeToTabMap;

        return Object.entries(vtypes)
            .map(([value, config]) =>
                `<option value="${value}" ${selectedType === value ? 'selected' : ''}>${config.label}</option>`
            ).join('');
    }

    /**
     * 레이어 열기
     */
    openLayer(groupIndex) {
        CardGroupManager._activeInstance = this;

        this.currentGroupIndex = groupIndex;
        this.selectedCards = JSON.parse(JSON.stringify(this.groups[groupIndex].cards || []));

        const layer = document.querySelector(this.options.layerSelector);
        const container = document.querySelector(this.options.containerSelector);
        const groupContainer = container ? container.querySelector(`.group_container[data-group-index="${groupIndex}"]`) : null;
        const vtypeSelect = groupContainer ? groupContainer.querySelector('.group_type_select') : null;

        let selectedVtype = this.options.defaultVtype || 'bch';
        if (vtypeSelect && vtypeSelect.value) {
            selectedVtype = vtypeSelect.value;
        }

        // 검색 입력창 초기화
        const searchInput = layer.querySelector('.layer_search_input');
        if (searchInput) {
            searchInput.value = '';
        }

        // 검색 결과 초기화
        this.searchResults = [];
        const resultContainer = layer.querySelector('.layer_left_panel .layer_panel_body');
        if (resultContainer) {
            resultContainer.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
        }

        const leftCountElement = layer.querySelector('.layer_left_panel .layer_panel_count');
        if (leftCountElement) {
            leftCountElement.textContent = '0';
        }

        // vtype에 따른 탭 매핑
        const vtypeToTabMap = {
            'bch': 0, 'bcv': 0,
            'bsh': 1, 'bsv': 1,
            'hbh': 2, 'hbv': 2,
            'gbh': 3, 'gbv': 3,
            'sbh': 4, 'sbv': 4
        };

        const targetTabIndex = vtypeToTabMap[selectedVtype] ?? 0;

        // 모든 탭 비활성화/활성화 처리
        const tabs = layer.querySelectorAll('.layer_tab_item');
        tabs.forEach((tab) => {
            const tabIndex = parseInt(tab.dataset.tabIndex);
            if (tabIndex === targetTabIndex) {
                tab.classList.remove('disabled');
                tab.disabled = false;
            } else {
                tab.classList.add('disabled');
                tab.disabled = true;
            }
        });

        layer.classList.add('active');

        // 해당 탭으로 전환
        this.switchTab(targetTabIndex, false);

        // 선택된 카드 렌더링
        this.renderSelectedCards();
    }

    /**
     * 레이어 닫기
     */
    closeLayer() {
        const layer = document.querySelector(this.options.layerSelector);
        layer.classList.remove('active');

        this.currentGroupIndex = null;
        this.selectedCards = [];
        this.searchResults = [];
        this.isSearching = false;

        CardGroupManager._activeInstance = null;
    }

    /**
     * 탭 전환
     */
    switchTab(tabIndex, clearSearch = true) {
        this.currentTab = tabIndex;

        const layer = document.querySelector(this.options.layerSelector);
        const tabs = layer.querySelectorAll('.layer_tab_item');

        tabs.forEach((tab, index) => {
            if (index === tabIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        if (clearSearch) {
            this.searchResults = [];
            const resultContainer = layer.querySelector('.layer_left_panel .layer_panel_body');
            if (resultContainer) {
                resultContainer.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
            }

            const countElement = layer.querySelector('.layer_left_panel .layer_panel_count');
            if (countElement) {
                countElement.textContent = '0';
            }

            const searchInput = layer.querySelector('.layer_search_input');
            if (searchInput) {
                searchInput.value = '';
            }
        }
    }

    /**
     * 검색 실행
     */
    async search() {
        if (this.isSearching) {
            return;
        }

        const layer = document.querySelector(this.options.layerSelector);
        const searchInput = layer.querySelector('.layer_search_input');
        const keyword = searchInput ? searchInput.value.trim() : '';

        if (!keyword) {
            const resultContainer = layer.querySelector('.layer_left_panel .layer_panel_body');
            const countElement = layer.querySelector('.layer_left_panel .layer_panel_count');

            if (resultContainer) {
                resultContainer.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
            }
            if (countElement) {
                countElement.textContent = '0';
            }

            this.searchResults = [];
            return;
        }

        this.isSearching = true;

        try {
            const response = await fetch(this.options.searchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    search: keyword,
                    data_index: this.currentTab
                })
            });

            if (!response.ok) {
                throw new Error('검색 실패');
            }

            const result = await response.json();
            this.searchResults = result.data || [];

            this.renderSearchResults();

        } catch (error) {
            console.error('검색 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * 검색 결과 렌더링
     */
    renderSearchResults() {
        const layer = document.querySelector(this.options.layerSelector);
        const resultContainer = layer.querySelector('.layer_left_panel .layer_panel_body');
        const countElement = layer.querySelector('.layer_left_panel .layer_panel_count');

        if (!resultContainer) return;

        const selectedIds = this.selectedCards.map(card => String(card.idx || card.goods_seq));

        let html = '';
        let visibleCount = 0;

        this.searchResults.forEach((card) => {
            const cardId = String(card.idx || card.goods_seq);
            const isHidden = selectedIds.includes(cardId);

            if (!isHidden) visibleCount++;

            html += this.createSearchCardHTML(card, isHidden);
        });

        if (this.searchResults.length === 0) {
            html = '<div style="padding: 4rem; text-align: center; color: #999;">검색 결과가 없습니다.</div>';
        }

        resultContainer.innerHTML = html;

        if (countElement) {
            countElement.textContent = visibleCount;
        }
    }

    /**
     * 검색 결과 카드 HTML 생성
     */
    createSearchCardHTML(card, isHidden = false) {
        const cardId = card.idx || card.goods_seq;
        const title = card.title || card.goods_name || '제목 없음';
        const category = card.ktitle || card.category_title || '';
        const image = card.thum_s || card.goods_image || '/src/assets/images/no_profile.png';

        const cardJson = JSON.stringify(card)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        return `
            <div class="search_result_card ${isHidden ? 'hidden' : ''}"
                 data-card='${cardJson}'>
                <div class="search_card_thumbnail">
                    <img src="${image}" alt="${title}">
                </div>
                <div class="search_card_info">
                    ${category ? `<span class="search_card_category">${category}</span>` : ''}
                    <div class="search_card_title">${title}</div>
                </div>
                <button type="button" class="btn_add_to_selected">
                    <img src="/src/assets/icons/link_arrow.png" alt="추가">
                </button>
            </div>
        `;
    }

    /**
     * 선택 목록에 추가
     */
    addToSelected(card) {
        const cardId = String(card.idx || card.goods_seq);

        const exists = this.selectedCards.find(c =>
            String(c.idx || c.goods_seq) === cardId
        );

        if (exists) {
            alert('이미 추가된 카드입니다.');
            return;
        }

        this.selectedCards.unshift(card);

        this.renderSelectedCards();
        this.renderSearchResults();
    }

    /**
     * 선택된 카드 렌더링
     */
    renderSelectedCards() {
        const layer = document.querySelector(this.options.layerSelector);
        const container = layer.querySelector('.layer_right_panel .layer_panel_body');
        const countElement = layer.querySelector('.layer_right_panel .layer_panel_count');

        if (!container) return;

        let html = '';

        this.selectedCards.forEach((card, index) => {
            html += this.createSelectedCardHTML(card, index);
        });

        if (this.selectedCards.length === 0) {
            html = '<div style="padding: 4rem; text-align: center; color: #999;">선택된 카드가 없습니다.</div>';
        }

        container.innerHTML = html;

        if (countElement) {
            countElement.textContent = this.selectedCards.length;
        }
    }

    /**
     * 선택된 카드 HTML 생성
     */
    createSelectedCardHTML(card, index) {
        const title = card.title || card.goods_name || '제목 없음';
        const image = card.thum_s || card.goods_image || '/src/assets/images/no_profile.png';

        return `
            <div class="selected_card_item" data-selected-index="${index}">
                <div class="selected_card_controls">
                    <button type="button" class="btn_selected_sort btn_selected_up"
                            ${index === 0 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_up.png" alt="위로">
                    </button>
                    <button type="button" class="btn_selected_sort btn_selected_down"
                            ${index === this.selectedCards.length - 1 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_down.png" alt="아래로">
                    </button>
                </div>
                <div class="selected_card_thumbnail">
                    <img src="${image}" alt="${title}">
                </div>
                <div class="selected_card_info">
                    <div class="selected_card_title">${title}</div>
                </div>
                <button type="button" class="btn_remove_selected">
                    <img src="/src/assets/icons/cancel.png" alt="삭제">
                </button>
            </div>
        `;
    }

    /**
     * 선택 목록 이동 (위로)
     */
    moveSelectedUp(index) {
        if (index === 0) return;

        const temp = this.selectedCards[index];
        this.selectedCards[index] = this.selectedCards[index - 1];
        this.selectedCards[index - 1] = temp;

        this.renderSelectedCards();
    }

    /**
     * 선택 목록 이동 (아래로)
     */
    moveSelectedDown(index) {
        if (index === this.selectedCards.length - 1) return;

        const temp = this.selectedCards[index];
        this.selectedCards[index] = this.selectedCards[index + 1];
        this.selectedCards[index + 1] = temp;

        this.renderSelectedCards();
    }

    /**
     * 선택 목록에서 제거
     */
    removeSelected(index) {
        this.selectedCards.splice(index, 1);
        this.renderSelectedCards();
        this.renderSearchResults();
    }

    /**
     * 선택 적용
     */
    applySelection() {
        if (this.currentGroupIndex === null) return;

        this.groups[this.currentGroupIndex].cards = JSON.parse(JSON.stringify(this.selectedCards));

        this.updateSingleGroup(this.currentGroupIndex);

        this.closeLayer();
    }

    /**
     * 단일 그룹만 업데이트
     */
    updateSingleGroup(groupIndex) {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;

        const groupContainer = container.querySelector(`.group_container[data-group-index="${groupIndex}"]`);
        if (!groupContainer) return;

        // 기존 input 값 저장
        const titleInput = groupContainer.querySelector('.group_title_input');
        const typeSelect = groupContainer.querySelector('.group_type_select');
        const savedTitle = titleInput ? titleInput.value : '';
        const savedType = typeSelect ? typeSelect.value : '';

        // 카드 리스트만 업데이트
        const cardListArea = groupContainer.querySelector('.card_list_area');
        if (!cardListArea) return;

        const cardList = cardListArea.querySelector('.card_list');
        if (!cardList) return;

        // 카드 HTML 생성
        const cardsHTML = this.groups[groupIndex].cards
            .map((card, cardIndex) => this.createCardHTML(card, groupIndex, cardIndex))
            .join('');

        cardList.innerHTML = cardsHTML;
        cardList.classList.toggle('empty', this.groups[groupIndex].cards.length === 0);

        // 저장된 값 복원
        if (titleInput && savedTitle) {
            titleInput.value = savedTitle;
            this.groups[groupIndex].title = savedTitle;
        }
        if (typeSelect && savedType) {
            typeSelect.value = savedType;
            this.groups[groupIndex].type = savedType;
        }
    }

    /**
     * 그룹 렌더링
     */
    renderGroups() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;

        let html = '';

        this.groups.forEach((group, groupIndex) => {
            html += this.createGroupHTML(group, groupIndex);
        });

        container.innerHTML = html;
    }

    /**
     * 그룹 HTML 생성
     */
    createGroupHTML(group, groupIndex) {
        const { fieldPrefix, sectionType } = this.options;
        const kValue = this.options.kValue || 'M0100';

        // 메인 비주얼(main_b)인 경우 타입 셀렉트 없음
        const hasTypeSelect = sectionType !== 'main_b';

        if (!hasTypeSelect) {
            // 메인 비주얼 - 타입 선택 없음
            return `
        <div class="group_container" data-group-index="${groupIndex}">
            <div class="group_header">
                <div class="group_title_area">
                    <input type="text"
                           class="group_title_input"
                           name="${fieldPrefix}[${groupIndex}]"
                           id="${fieldPrefix}_${groupIndex}"
                           value="${group.title}"
                           placeholder="그룹 타이틀 입력"
                           style="flex: 1;">
                    <input type="hidden"
                           name="${fieldPrefix}_k[${groupIndex}]"
                           value="${kValue}">
                    <input type="hidden"
                           name="${fieldPrefix}_vtype[${groupIndex}]"
                           value="bch">
                </div>
            </div>
            <div class="card_list_area">
                <div class="card_list ${group.cards.length === 0 ? 'empty' : ''}">
                    ${group.cards.map((card, cardIndex) =>
                this.createCardHTML(card, groupIndex, cardIndex)
            ).join('')}
                </div>
                <button type="button" class="btn_add_card">
                    + 카드 추가
                </button>
            </div>
        </div>
    `;
        }

        // 일반 섹션 - 타입 선택 있음
        return `
        <div class="group_container" data-group-index="${groupIndex}">
            <div class="group_header">
                <div class="group_title_area">
                    <select class="group_type_select"
                            name="${fieldPrefix}_vtype[${groupIndex}]"
                            id="${fieldPrefix}_vtype_${groupIndex}">
                        <option value="">타입 선택</option>
                        ${this.generateVtypeOptions(group.type)}
                    </select>
                    <input type="text"
                           class="group_title_input"
                           name="${fieldPrefix}[${groupIndex}]"
                           id="${fieldPrefix}_${groupIndex}"
                           value="${group.title}"
                           placeholder="그룹 타이틀 입력">
                    <input type="hidden"
                           name="${fieldPrefix}_k[${groupIndex}]"
                           value="${kValue}">
                </div>
                <div class="group_controls">
                    <span class="group_order_display">${groupIndex + 1}</span>
                    <button type="button" class="btn_group_control btn_group_up"
                            ${groupIndex === 0 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_up.png" alt="위로">
                    </button>
                    <button type="button" class="btn_group_control btn_group_down"
                            ${groupIndex === this.groups.length - 1 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_down.png" alt="아래로">
                    </button>
                    <button type="button" class="btn_group_control btn_group_delete">
                        <img src="/src/assets/icons/cancel.png" alt="삭제">
                    </button>
                </div>
            </div>
            <div class="card_list_area">
                <div class="card_list ${group.cards.length === 0 ? 'empty' : ''}">
                    ${group.cards.map((card, cardIndex) =>
            this.createCardHTML(card, groupIndex, cardIndex)
        ).join('')}
                </div>
                <button type="button" class="btn_add_card">
                    + 카드 추가
                </button>
            </div>
        </div>
    `;
    }

    /**
     * 카드 HTML 생성
     */
    createCardHTML(card, groupIndex, cardIndex) {
        const { fieldPrefix } = this.options;
        const title = card.title || card.goods_name || '제목 없음';
        const image = card.thum_s || card.goods_image || '/src/assets/images/no_profile.png';
        const category = card.ktitle || card.category_title || '';
        const seriesName = card.stitle || '';
        const vsdate = card.vsdate || new Date().toISOString();
        const isFuture = new Date(vsdate) > new Date();
        const dateText = this.formatDate(vsdate);
        const cardId = card.idx || card.goods_seq || '';
        const cardType = card.ctype || card.is_type || 'bc';

        const cardJson = JSON.stringify(card)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        return `
            <div class="common_card_item"
                 data-card-index="${cardIndex}"
                 data-card='${cardJson}'>
                <div class="card_left_controls">
                    <div class="card_order_badge">${cardIndex + 1}</div>
                    <div class="card_sort_buttons">
                        <button type="button" class="btn_card_sort btn_card_up"
                                ${cardIndex === 0 ? 'disabled' : ''}>
                            <img src="/src/assets/icons/icon_arrow_up.png" alt="위로">
                        </button>
                        <button type="button" class="btn_card_sort btn_card_down"
                                ${cardIndex === this.groups[groupIndex].cards.length - 1 ? 'disabled' : ''}>
                            <img src="/src/assets/icons/icon_arrow_down.png" alt="아래로">
                        </button>
                    </div>
                </div>
                <div class="card_thumbnail">
                    <img src="${image}" alt="${title}">
                </div>
                <div class="card_content_info">
                    <div class="card_meta_row">
                        <span class="card_date_badge ${isFuture ? 'future' : ''}">
                            ${isFuture ? '(노출예정) ' : ''}${dateText}
                        </span>
                        ${category ? `<span class="card_category">${category}</span>` : ''}
                        ${seriesName ? `<span class="card_series_name">${seriesName}</span>` : ''}
                    </div>
                    <div class="card_title_text">${title}</div>
                    <input type="hidden" name="${fieldPrefix}_cidx[${groupIndex}][]" value="${cardId}">
                    <input type="hidden" name="${fieldPrefix}_is_type[${groupIndex}][]" value="${cardType}">
                    <input type="hidden" name="${fieldPrefix}_display_order[${groupIndex}][]" value="${cardIndex + 1}">
                </div>
                <div class="card_right_controls">
                    <button type="button" class="btn_card_delete">
                        <img src="/src/assets/icons/cancel.png" alt="삭제">
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 날짜 포맷
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}.${month}.${day}`;
    }

    /**
     * 폼 데이터 가져오기
     */
    getFormData() {
        return this.groups.map(group => ({
            title: group.title,
            type: group.type,
            cards: group.cards.map((card, index) => ({
                ...card,
                order: index + 1
            }))
        }));
    }
}

/**
 * 메인 페이지(mbm) 전용 카드 관리 클래스
 */
class MbmCardManager {
    constructor(options = {}) {
        this.options = {
            searchEndpoint: options.searchEndpoint || '/master/keywords/contents',
            ...options
        };

        this.sectionConfigs = {
            'main_b': {
                code: 'M0100',
                name: '메인 비주얼',
                allowGroupAdd: false,
                allowedVtypes: null,
                defaultVtype: 'bch'
            },
            'main_c': {
                code: 'M0200',
                name: '메인 콘텐츠',
                allowGroupAdd: true,
                allowedVtypes: ['bch', 'bcv'],
                defaultVtype: 'bch'
            },
            'main_bs': {
                code: 'M0300',
                name: '시리즈',
                allowGroupAdd: true,
                allowedVtypes: ['bsh', 'bsv'],
                defaultVtype: 'bsh'
            },
            'main_bc': {
                code: 'M0400',
                name: '콘텐츠',
                allowGroupAdd: true,
                allowedVtypes: ['bch', 'bcv'],
                defaultVtype: 'bch'
            },
            'main_hb': {
                code: 'M0500',
                name: '해봄',
                allowGroupAdd: true,
                allowedVtypes: ['hbh', 'hbv'],
                defaultVtype: 'hbh'
            },
            'main_gb': {
                code: 'M0600',
                name: '가봄',
                allowGroupAdd: true,
                allowedVtypes: ['gbh', 'gbv'],
                defaultVtype: 'gbh'
            },
            'main_sb': {
                code: 'M0700',
                name: '사봄',
                allowGroupAdd: true,
                allowedVtypes: ['sbh', 'sbv'],
                defaultVtype: 'sbh'
            }
        };

        this.managers = {};

        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.initializeSections();
        this.bindGlobalEvents();
    }

    /**
     * 각 섹션별 CardGroupManager 초기화
     */
    initializeSections() {
        document.querySelectorAll('.content_section').forEach(section => {
            const sectionType = section.dataset.sectionType;
            const sectionCode = section.dataset.sectionCode;
            const config = this.sectionConfigs[sectionType];

            if (!config) return;

            this.managers[sectionType] = new CardGroupManager({
                containerSelector: `[data-section-type="${sectionType}"] .groups_wrapper`,
                layerSelector: '.layer_modal',
                fieldPrefix: sectionType,
                kValue: sectionCode,
                defaultVtype: config.defaultVtype,
                allowedVtypes: config.allowedVtypes,
                searchEndpoint: this.options.searchEndpoint,
                sectionType: sectionType
            });

            console.log('[MbmCardManager] 섹션 초기화:', sectionType, config);
        });

        console.log('[MbmCardManager] 초기화된 매니저들:', Object.keys(this.managers));
    }

    /**
     * 전역 이벤트 바인딩
     */
    bindGlobalEvents() {
        document.querySelectorAll('.content_section').forEach(section => {
            const sectionType = section.dataset.sectionType;
            const config = this.sectionConfigs[sectionType];

            // 그룹 추가 버튼은 allowGroupAdd가 true인 섹션만
            if (!config || !config.allowGroupAdd) {
                // 메인 비주얼(main_b)은 그룹 추가 버튼이 없음
                return;
            }

            const addGroupBtn = section.querySelector('.btn_add_group');

            if (addGroupBtn && this.managers[sectionType]) {
                // 기존 이벤트 제거를 위해 복제
                const newBtn = addGroupBtn.cloneNode(true);
                addGroupBtn.parentNode.replaceChild(newBtn, addGroupBtn);

                // 새 이벤트 바인딩
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('[MbmCardManager] 그룹 추가 클릭:', sectionType);

                    const manager = this.managers[sectionType];
                    if (manager) {
                        manager.addGroup();
                    } else {
                        console.error('[MbmCardManager] 매니저를 찾을 수 없습니다:', sectionType);
                    }
                });

                console.log('[MbmCardManager] 이벤트 바인딩 완료:', sectionType);
            }
        });
    }

    /**
     * 모든 매니저의 데이터 가져오기
     */
    getAllData() {
        const allData = {};
        Object.keys(this.managers).forEach(sectionType => {
            allData[sectionType] = this.managers[sectionType].getFormData();
        });
        return allData;
    }
}

// 전역 export
window.CardGroupManager = CardGroupManager;
window.MbmCardManager = MbmCardManager;
