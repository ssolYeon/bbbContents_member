/**
 * 공통 카드/그룹 관리 모듈
 * 그룹 관리, 카드 정렬, 레이어 모달 제어 등을 담당
 */

class CardGroupManager {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || '.groups_wrapper',
            layerSelector: options.layerSelector || '.layer_modal',
            onSave: options.onSave || null,
            searchEndpoint: options.searchEndpoint || '/api/search',
            fieldPrefix: options.fieldPrefix || 'main_c', // main_c, main_hb, main_gb 등
            kValue: options.kValue || 'H0100',
            defaultVtype: options.defaultVtype || 'bch',
            allowedVtypes: options.allowedVtypes || null,
            allowGroupAdd: options.allowGroupAdd !== false, // 기본값 true
            allowGroupDelete: options.allowGroupDelete !== false, // 기본값 true
            allowGroupMove: options.allowGroupMove !== false, // 기본값 true
            ...options
        };

        this.groups = [];
        this.currentGroupIndex = null;
        this.searchResults = [];
        this.selectedCards = [];
        this.currentTab = 0;

        this.init();
    }

    /**
     * 그룹 추가 버튼 표시/숨김
     */
    updateGroupAddButton() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) return;

        const section = container.closest('.content_section');
        if (!section) return;

        const addButton = section.querySelector('.btn_add_group');
        if (!addButton) return;

        if (this.options.allowGroupAdd) {
            addButton.style.display = '';
        } else {
            addButton.style.display = 'none';
        }
    }

    /**
     * 초기화
     */
    init() {
        this.bindEvents();
        this.loadExistingGroups();
        this.updateGroupAddButton();
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        const container = document.querySelector(this.options.containerSelector);
        const layer = document.querySelector(this.options.layerSelector);

        if (!container || !layer) {
            console.error('필수 요소를 찾을 수 없습니다.');
            return;
        }

        // 그룹 추가 버튼 - 해당 container의 section 내에서만
        const section = container.closest('.content_section');
        if (section) {
            const addGroupBtn = section.querySelector('.btn_add_group');
            if (addGroupBtn) {
                addGroupBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.addGroup();
                });
            }
        }

        // 그룹 제어 버튼 (위로, 아래로, 삭제) - container 내에서만
        container.addEventListener('click', (e) => {
            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;

            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);

            if (e.target.closest('.btn_group_up')) {
                e.preventDefault();
                e.stopPropagation();
                this.moveGroupUp(groupIndex);
            } else if (e.target.closest('.btn_group_down')) {
                e.preventDefault();
                e.stopPropagation();
                this.moveGroupDown(groupIndex);
            } else if (e.target.closest('.btn_group_delete')) {
                e.preventDefault();
                e.stopPropagation();
                this.deleteGroup(groupIndex);
            }
        });

        // 카드 추가 버튼 - container 내에서만
        container.addEventListener('click', (e) => {
            if (e.target.closest('.btn_add_card')) {
                e.preventDefault();
                e.stopPropagation();

                const groupContainer = e.target.closest('.group_container');
                if (!groupContainer) return;

                if (!container.contains(groupContainer)) return;

                const groupIndex = parseInt(groupContainer.dataset.groupIndex);
                this.openLayer(groupIndex);
            }
        });

        // 카드 제어 버튼 (위로, 아래로, 삭제) - container 내에서만
        container.addEventListener('click', (e) => {
            const cardItem = e.target.closest('.common_card_item');
            if (!cardItem) return;

            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;

            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);
            const cardIndex = parseInt(cardItem.dataset.cardIndex);

            if (e.target.closest('.btn_card_up')) {
                e.preventDefault();
                e.stopPropagation();
                this.moveCardUp(groupIndex, cardIndex);
            } else if (e.target.closest('.btn_card_down')) {
                e.preventDefault();
                e.stopPropagation();
                this.moveCardDown(groupIndex, cardIndex);
            } else if (e.target.closest('.btn_card_delete')) {
                e.preventDefault();
                e.stopPropagation();
                this.deleteCard(groupIndex, cardIndex);
            }
        });

        // *** 레이어 이벤트는 한 번만 바인딩 (static 플래그 사용) ***
        if (!CardGroupManager._layerEventsInitialized) {
            this.bindLayerEvents(layer);
            CardGroupManager._layerEventsInitialized = true;
        }
    }
    /**
     * 레이어 이벤트 바인딩 (한 번만 실행)
     */
    bindLayerEvents(layer) {
        // 레이어 탭
        layer.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.layer_tab_item');
            if (tabItem && !tabItem.disabled) {
                const tabIndex = parseInt(tabItem.dataset.tabIndex);
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.switchTab(tabIndex);
                }
            }
        });

        // 레이어 검색 버튼
        const searchBtn = layer.querySelector('.btn_layer_search');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.search();
                }
            });
        }

        // 레이어 검색 엔터키
        const searchInput = layer.querySelector('.layer_search_input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (CardGroupManager._activeInstance) {
                        CardGroupManager._activeInstance.search();
                    }
                }
            });
        }

        // 검색 결과 추가
        layer.addEventListener('click', (e) => {
            if (e.target.closest('.btn_add_to_selected')) {
                const cardElement = e.target.closest('.search_result_card');
                if (cardElement && CardGroupManager._activeInstance) {
                    // const cardData = JSON.parse(cardElement.dataset.card);
                    let cardData;
                    try {
                        // HTML 엔티티 디코딩 후 JSON 파싱
                        const cardDataStr = cardElement.dataset.card
                            .replace(/&quot;/g, '"')
                            .replace(/&#039;/g, "'")
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');

                        cardData = JSON.parse(cardDataStr);
                    } catch (e) {
                        console.error('JSON 파싱 에러:', e);
                        console.error('원본 데이터:', cardElement.dataset.card);
                        return; // 또는 적절한 에러 처리
                    }

                    CardGroupManager._activeInstance.addToSelected(cardData);
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

        // 레이어 외부 클릭 시 닫기
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
            console.error('Container를 찾을 수 없습니다:', this.options.containerSelector);
            return;
        }

        const groupElements = container.querySelectorAll('.group_container');
        this.groups = [];

        groupElements.forEach((el, index) => {
            const titleInput = el.querySelector('.group_title_input');
            const typeSelect = el.querySelector('.group_type_select');
            const cardElements = el.querySelectorAll('.common_card_item');

            const cards = [];
            cardElements.forEach((cardEl) => {
                try {
                    // data-card 속성 가져오기
                    let cardDataStr = cardEl.dataset.card;

                    if (!cardDataStr) {
                        console.warn('카드 데이터가 없습니다.');
                        return;
                    }

                    // HTML 엔티티 디코딩
                    const textarea = document.createElement('textarea');
                    textarea.innerHTML = cardDataStr;
                    cardDataStr = textarea.value;

                    // JSON 파싱
                    const cardData = JSON.parse(cardDataStr);
                    cards.push(cardData);

                } catch (e) {
                    console.error('카드 데이터 파싱 실패:', e);
                    console.error('원본 데이터:', cardEl.dataset.card);
                    console.error('Element:', cardEl);
                }
            });

            this.groups.push({
                title: titleInput ? titleInput.value : '',
                type: typeSelect ? typeSelect.value : '',
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

        // 스크롤 맨 하단으로 이동 - containerSelector 기준으로 변경
        setTimeout(() => {
            const container = document.querySelector(this.options.containerSelector);
            if (container) {
                // container의 마지막 group_container로 스크롤
                const lastGroup = container.querySelector('.group_container:last-child');
                if (lastGroup) {
                    lastGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 10);
    }

    getFirstGroupTypeValue() {
        // 동적 방식:
        const tempSelect = document.createElement('select');
        tempSelect.innerHTML = this.getGroupTypeOptions();
        const firstOption = tempSelect.querySelector('option:not([value=""])');
        return firstOption ? firstOption.value : '';
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
     * vtype 옵션 생성
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

        // allowedVtypes가 지정되어 있으면 필터링
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
     * 첫번째 그룹 타입 값 가져오기
     */
    getFirstGroupTypeValue() {
        const vtypeToTabMap = {
            'bch': 0, 'bcv': 0, 'bsh': 1, 'bsv': 1,
            'hbh': 2, 'hbv': 2, 'gbh': 3, 'gbv': 3,
            'sbh': 4, 'sbv': 4
        };

        return Object.keys(vtypeToTabMap)[0]; // 'bch'
    }
    /**
     * 레이어 열기
     */
    openLayer(groupIndex) {
        // 현재 인스턴스를 활성 인스턴스로 설정
        CardGroupManager._activeInstance = this;

        this.currentGroupIndex = groupIndex;
        this.selectedCards = [...this.groups[groupIndex].cards];

        const layer = document.querySelector(this.options.layerSelector);
        const container = document.querySelector(this.options.containerSelector);

        const groupContainer = container ?
            container.querySelector(`.group_container[data-group-index="${groupIndex}"]`) : null;

        const vtypeSelect = groupContainer ? groupContainer.querySelector('.group_type_select') : null;
        const selectedVtype = vtypeSelect ? vtypeSelect.value : '';

        // 검색 입력창 초기화
        const searchInput = layer.querySelector('.layer_search_input');
        if (searchInput) {
            searchInput.value = '';
        }

        // 검색 결과 초기화
        this.searchResults = [];
        const leftPanel = layer.querySelector('.layer_left_panel .layer_panel_body');
        const leftCount = layer.querySelector('.layer_left_panel .layer_panel_count');
        if (leftPanel) {
            leftPanel.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
        }
        if (leftCount) {
            leftCount.textContent = '0';
        }

        // vtype에 따른 탭 매핑
        const vtypeToTabMap = {
            'bch': 0, 'bcv': 0, 'bsh': 1, 'bsv': 1,
            'hbh': 2, 'hbv': 2, 'gbh': 3, 'gbv': 3,
            'sbh': 4, 'sbv': 4
        };

        const targetTabIndex = vtypeToTabMap[selectedVtype] ?? 0;

        // 모든 탭 비활성화/활성화 처리
        const tabs = layer.querySelectorAll('.layer_tab_item');
        tabs.forEach((tab, index) => {
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
        this.currentTab = targetTabIndex;
        tabs.forEach((tab, index) => {
            if (index === targetTabIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

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

        // 활성 인스턴스 해제
        CardGroupManager._activeInstance = null;
    }

    /**
     * 탭 전환
     */
    switchTab(tabIndex) {
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

        this.searchResults = [];
        const leftPanel = layer.querySelector('.layer_left_panel .layer_panel_body');
        const leftCount = layer.querySelector('.layer_left_panel .layer_panel_count');
        if (leftPanel) {
            leftPanel.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
        }
        if (leftCount) {
            leftCount.textContent = '0';
        }
    }

    /**
     * 검색 실행
     */
    async search() {
        const layer = document.querySelector(this.options.layerSelector);
        const searchInput = layer.querySelector('.layer_search_input');
        const keyword = searchInput ? searchInput.value.trim() : '';

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
        }
    }

    /**
     * 검색 결과 렌더링
     */
    renderSearchResults() {
        const layer = document.querySelector(this.options.layerSelector);
        const resultContainer = layer.querySelector('.layer_panel_body');
        const countElement = layer.querySelector('.layer_panel_count');

        if (!resultContainer) return;

        // 이미 선택된 카드 ID 목록
        const selectedIds = this.selectedCards.map(card => card.idx || card.goods_seq);

        let html = '';
        let visibleCount = 0;

        this.searchResults.forEach((card) => {
            const cardId = card.idx || card.goods_seq;
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

        // JSON을 안전하게 이스케이프
        const cardDataJson = JSON.stringify(card)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        return `
        <div class="search_result_card ${isHidden ? 'hidden' : ''}"
             data-card="${cardDataJson}">
            <div class="search_card_thumbnail">
                <img src="${image}" alt="${this.escapeHtml(title)}">
            </div>
            <div class="search_card_info">
                ${category ? `<span class="search_card_category">${this.escapeHtml(category)}</span>` : ''}
                <div class="search_card_title">${this.escapeHtml(title)}</div>
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
        const cardId = card.idx || card.goods_seq;

        // 중복 체크
        const exists = this.selectedCards.find(c =>
            (c.idx || c.goods_seq) === cardId
        );

        if (exists) {
            alert('이미 추가된 카드입니다.');
            return;
        }

        // 맨 앞에 추가 (기존: push → 변경: unshift)
        this.selectedCards.unshift(card);
        this.renderSelectedCards();
        this.renderSearchResults(); // 검색 결과에서 숨김 처리
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
                <img src="${image}" alt="${this.escapeHtml(title)}">
            </div>
            <div class="selected_card_info">
                <div class="selected_card_title">${this.escapeHtml(title)}</div>
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
        this.renderSearchResults(); // 검색 결과에서 다시 표시
    }

    /**
     * 선택 적용
     */
    applySelection() {
        if (this.currentGroupIndex === null) return;

        this.groups[this.currentGroupIndex].cards = [...this.selectedCards];
        this.updateSingleGroup(this.currentGroupIndex);
        this.closeLayer();
    }
    /**
     * ★ 새로운 메서드: 단일 그룹만 업데이트
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
            this.groups[groupIndex].title = savedTitle; // 데이터도 동기화
        }
        if (typeSelect && savedType) {
            typeSelect.value = savedType;
            this.groups[groupIndex].type = savedType; // 데이터도 동기화
        }
    }
    /**
     * 그룹 렌더링
     */
    renderGroups() {
        const container = document.querySelector(this.options.containerSelector);
        if (!container) {
            console.error('Container를 찾을 수 없습니다:', this.options.containerSelector);
            return;
        }

        let html = '';

        this.groups.forEach((group, groupIndex) => {
            html += this.createGroupHTML(group, groupIndex);
        });

        container.innerHTML = html;

        // 그룹 타이틀/타입 변경 이벤트 - container 내에서만
        const inputHandler = (e) => {
            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;

            // 현재 container 내의 group_container인지 확인
            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);

            if (e.target.classList.contains('group_title_input')) {
                this.groups[groupIndex].title = e.target.value;
            } else if (e.target.classList.contains('group_type_select')) {
                this.groups[groupIndex].type = e.target.value;
            }
        };

        // 기존 핸들러 제거 후 추가
        container.removeEventListener('input', inputHandler);
        container.addEventListener('input', inputHandler);

        this.updateGroupAddButton();
    }

    /**
     * 그룹 HTML 생성
     */
    createGroupHTML(group, groupIndex) {
        const { fieldPrefix, allowGroupDelete, allowGroupMove } = this.options;
        const kValue = this.options.kValue || 'H0100';

        // 연관 컨텐츠인지 확인
        const isRelated = fieldPrefix === 'related';

        // 연관 컨텐츠는 vtype 셀렉트 없음
        const vtypeSelectHTML = isRelated ? '' : `
        <select class="group_type_select"
                name="${fieldPrefix}_vtype[${groupIndex}]"
                id="${fieldPrefix}_vtype_${groupIndex}">
            <option value="">타입 선택</option>
            ${this.generateVtypeOptions(group.type)}
        </select>
    `;

        // ★ 수정: 추천 컨텐츠도 실제 input 필드 사용 (hidden 아님)
        const titleInputHTML = isRelated
            ? `<input type="hidden" name="${fieldPrefix}_title[${groupIndex}]" value="연관콘텐츠">`
            : `<input type="text"
                   class="group_title_input"
                   name="${fieldPrefix}_title[${groupIndex}]"
                   id="${fieldPrefix}_title_${groupIndex}"
                   value="${group.title || ''}"
                   placeholder="그룹 타이틀 입력"
                   required>`;

        return `
        <div class="group_container" data-group-index="${groupIndex}">
            <div class="group_header">
                <div class="group_title_area">
                    ${vtypeSelectHTML}
                    ${titleInputHTML}
                    <input type="hidden"
                           name="${fieldPrefix}_k[${groupIndex}]"
                           value="${kValue}">
                </div>
                <div class="group_controls">
                    <span class="group_order_display">${groupIndex + 1}</span>
                    ${allowGroupMove ? `
                    <button type="button" class="btn_group_control btn_group_up"
                            ${groupIndex === 0 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_up.png" alt="위로">
                    </button>
                    <button type="button" class="btn_group_control btn_group_down"
                            ${groupIndex === this.groups.length - 1 ? 'disabled' : ''}>
                        <img src="/src/assets/icons/icon_arrow_down.png" alt="아래로">
                    </button>
                    ` : ''}
                    ${allowGroupDelete ? `
                    <button type="button" class="btn_group_control btn_group_delete">
                        <img src="/src/assets/icons/cancel.png" alt="삭제">
                    </button>
                    ` : ''}
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
        const cardType = card.ctype || card.is_type || 'hb';

        // JSON을 안전하게 이스케이프
        const cardDataJson = JSON.stringify(card)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        return `
        <div class="common_card_item"
             data-card-index="${cardIndex}"
             data-card="${cardDataJson}">
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
                <img src="${image}" alt="${this.escapeHtml(title)}">
            </div>
            <div class="card_content_info">
                <div class="card_meta_row">
                    <span class="card_date_badge ${isFuture ? 'future' : ''}">
                        ${isFuture ? '(노출예정) ' : ''}${dateText}
                    </span>
                    ${category ? `<span class="card_category">${this.escapeHtml(category)}</span>` : ''}
                    ${seriesName ? `<span class="card_series_name">${this.escapeHtml(seriesName)}</span>` : ''}
                </div>
                <div class="card_title_text">${this.escapeHtml(title)}</div>
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
     * HTML 이스케이프 헬퍼 함수 추가
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
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
     * 폼 데이터 가져오기 (저장용)
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

    /**
     * 기존 카드 데이터 로드
     */
    loadExistingCards(groupIndex, cardsData) {
        const container = document.querySelector(this.options.containerSelector);
        const groupContainer = container.querySelector(`.group_container[data-group-index="${groupIndex}"]`);

        if (!groupContainer) {
            console.error(`그룹 인덱스 ${groupIndex}를 찾을 수 없습니다.`);
            return;
        }

        const cardList = groupContainer.querySelector('.card_list');
        if (!cardList) {
            console.error('카드 리스트를 찾을 수 없습니다.');
            return;
        }

        // 기존 카드 초기화
        cardList.innerHTML = '';

        // 카드 데이터 추가
        cardsData.forEach((cardData, index) => {
            const cardElement = this.createCardElement(cardData, index);
            cardList.appendChild(cardElement);
        });

        // empty 클래스 제거
        cardList.classList.remove('empty');
    }

    /**
     * 카드 엘리먼트 생성
     */
    createCardElement(cardData, index) {
        const cardItem = document.createElement('div');
        cardItem.className = 'card_item';
        cardItem.dataset.cardIndex = index;
        cardItem.dataset.cardId = cardData.cidx;
        cardItem.dataset.cardType = cardData.ctype;

        // 이미지 URL 결정
        let imageUrl = cardData.thum_m || cardData.goods_image || '/src/assets/images/no_image.png';

        cardItem.innerHTML = `
        <div class="card_content">
            <div class="card_image">
                <img src="${imageUrl}" alt="${cardData.title || ''}">
            </div>
            <div class="card_info">
                <p class="card_title">${cardData.title || ''}</p>
                ${cardData.description ? `<p class="card_description">${cardData.description}</p>` : ''}
                ${cardData.ktitle ? `<span class="card_category">${cardData.ktitle}</span>` : ''}
            </div>
        </div>
        <div class="card_controls">
            <input type="text" class="card_order_input" name="${this.options.fieldPrefix}_display_order[${this.currentGroupIndex || 0}][]"
                   value="${cardData.list_sort || (index + 1)}" placeholder="순서">
            <button type="button" class="btn_card_control btn_card_up">
                <img src="/src/assets/icons/icon_arrow_up.png" alt="위로">
            </button>
            <button type="button" class="btn_card_control btn_card_down">
                <img src="/src/assets/icons/icon_arrow_down.png" alt="아래로">
            </button>
            <button type="button" class="btn_card_control btn_card_delete">
                <img src="/src/assets/icons/cancel.png" alt="삭제">
            </button>
        </div>
        <input type="hidden" name="${this.options.fieldPrefix}_cidx[${this.currentGroupIndex || 0}][]" value="${cardData.cidx}">
        <input type="hidden" name="${this.options.fieldPrefix}_ctype[${this.currentGroupIndex || 0}][]" value="${cardData.ctype}">
    `;

        return cardItem;
    }

}

// 전역 export
window.CardGroupManager = CardGroupManager;
