/**
 * 공통 카드/그룹 관리 모듈 - Part 1
 * JSON 파싱 예외 처리 적용
 */

class CardGroupManager {
    constructor(options = {}) {
        this.options = {
            containerSelector: options.containerSelector || '.groups_wrapper',
            layerSelector: options.layerSelector || '.layer_modal',
            onSave: options.onSave || null,
            searchEndpoint: options.searchEndpoint || '/api/search',
            fieldPrefix: options.fieldPrefix || 'main_c',
            kValue: options.kValue || 'H0100',
            defaultVtype: options.defaultVtype || 'bch',
            allowedVtypes: options.allowedVtypes || null,
            allowGroupAdd: options.allowGroupAdd !== false,
            allowGroupDelete: options.allowGroupDelete !== false,
            allowGroupMove: options.allowGroupMove !== false,
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

    init() {
        this.bindEvents();
        this.loadExistingGroups();
        this.updateGroupAddButton();
    }

    bindEvents() {
        const container = document.querySelector(this.options.containerSelector);
        const layer = document.querySelector(this.options.layerSelector);

        if (!container || !layer) {
            console.error('필수 요소를 찾을 수 없습니다.');
            return;
        }

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

        if (!CardGroupManager._layerEventsInitialized) {
            this.bindLayerEvents(layer);
            CardGroupManager._layerEventsInitialized = true;
        }
    }

    bindLayerEvents(layer) {
        layer.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.layer_tab_item');
            if (tabItem && !tabItem.disabled) {
                const tabIndex = parseInt(tabItem.dataset.tabIndex);
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.switchTab(tabIndex);
                }
            }
        });

        const searchBtn = layer.querySelector('.btn_layer_search');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (CardGroupManager._activeInstance) {
                    CardGroupManager._activeInstance.search();
                }
            });
        }

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

        layer.addEventListener('click', (e) => {
            if (e.target.closest('.btn_add_to_selected')) {
                const cardElement = e.target.closest('.search_result_card');
                if (cardElement && CardGroupManager._activeInstance) {
                    const cardData = CardGroupManager._activeInstance.safeJsonParse(
                        cardElement.dataset.card
                    );
                    if (cardData) {
                        CardGroupManager._activeInstance.addToSelected(cardData);
                    }
                }
            }
        });

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

        layer.addEventListener('click', (e) => {
            if (e.target === layer && CardGroupManager._activeInstance) {
                CardGroupManager._activeInstance.closeLayer();
            }
        });
    }

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
                const cardData = this.safeJsonParse(cardEl.dataset.card);
                if (cardData) {
                    cards.push(cardData);
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
        }, 10);
    }

    getFirstGroupTypeValue() {
        const tempSelect = document.createElement('select');
        tempSelect.innerHTML = this.getGroupTypeOptions();
        const firstOption = tempSelect.querySelector('option:not([value=""])');
        return firstOption ? firstOption.value : '';
    }

    moveGroupUp(groupIndex) {
        if (groupIndex === 0) return;

        const temp = this.groups[groupIndex];
        this.groups[groupIndex] = this.groups[groupIndex - 1];
        this.groups[groupIndex - 1] = temp;

        this.renderGroups();
    }

    moveGroupDown(groupIndex) {
        if (groupIndex === this.groups.length - 1) return;

        const temp = this.groups[groupIndex];
        this.groups[groupIndex] = this.groups[groupIndex + 1];
        this.groups[groupIndex + 1] = temp;

        this.renderGroups();
    }

    deleteGroup(groupIndex) {
        if (!confirm('이 그룹을 삭제하시겠습니까?')) return;

        this.groups.splice(groupIndex, 1);
        this.renderGroups();
    }

    moveCardUp(groupIndex, cardIndex) {
        if (cardIndex === 0) return;

        const cards = this.groups[groupIndex].cards;
        const temp = cards[cardIndex];
        cards[cardIndex] = cards[cardIndex - 1];
        cards[cardIndex - 1] = temp;

        this.updateSingleGroup(groupIndex);
    }

    moveCardDown(groupIndex, cardIndex) {
        const cards = this.groups[groupIndex].cards;
        if (cardIndex === cards.length - 1) return;

        const temp = cards[cardIndex];
        cards[cardIndex] = cards[cardIndex + 1];
        cards[cardIndex + 1] = temp;

        this.updateSingleGroup(groupIndex);
    }

    deleteCard(groupIndex, cardIndex) {
        if (!confirm('이 카드를 삭제하시겠습니까?')) return;

        this.groups[groupIndex].cards.splice(cardIndex, 1);
        this.updateSingleGroup(groupIndex);
    }

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

    openLayer(groupIndex) {
        CardGroupManager._activeInstance = this;

        this.currentGroupIndex = groupIndex;
        this.selectedCards = [...this.groups[groupIndex].cards];

        const layer = document.querySelector(this.options.layerSelector);
        const container = document.querySelector(this.options.containerSelector);

        const groupContainer = container ?
            container.querySelector(`.group_container[data-group-index="${groupIndex}"]`) : null;

        const vtypeSelect = groupContainer ? groupContainer.querySelector('.group_type_select') : null;
        const selectedVtype = vtypeSelect ? vtypeSelect.value : '';

        const searchInput = layer.querySelector('.layer_search_input');
        if (searchInput) {
            searchInput.value = '';
        }

        this.searchResults = [];
        const leftPanel = layer.querySelector('.layer_left_panel .layer_panel_body');
        const leftCount = layer.querySelector('.layer_left_panel .layer_panel_count');
        if (leftPanel) {
            leftPanel.innerHTML = '<div style="padding: 4rem; text-align: center; color: #999;">검색어를 입력하세요.</div>';
        }
        if (leftCount) {
            leftCount.textContent = '0';
        }

        const vtypeToTabMap = {
            'bch': 0, 'bcv': 0, 'bsh': 1, 'bsv': 1,
            'hbh': 2, 'hbv': 2, 'gbh': 3, 'gbv': 3,
            'sbh': 4, 'sbv': 4
        };

        const targetTabIndex = vtypeToTabMap[selectedVtype] ?? 0;

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

    closeLayer() {
        const layer = document.querySelector(this.options.layerSelector);
        layer.classList.remove('active');

        this.currentGroupIndex = null;
        this.selectedCards = [];
        this.searchResults = [];

        CardGroupManager._activeInstance = null;
    }

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

    renderSearchResults() {
        const layer = document.querySelector(this.options.layerSelector);
        const resultContainer = layer.querySelector('.layer_panel_body');
        const countElement = layer.querySelector('.layer_panel_count');

        if (!resultContainer) return;

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

    addToSelected(card) {
        const cardId = card.idx || card.goods_seq;

        const exists = this.selectedCards.find(c =>
            (c.idx || c.goods_seq) === cardId
        );

        if (exists) {
            alert('이미 추가된 카드입니다.');
            return;
        }

        this.selectedCards.unshift(card);
        this.renderSelectedCards();
        this.renderSearchResults();
    }

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

    moveSelectedUp(index) {
        if (index === 0) return;

        const temp = this.selectedCards[index];
        this.selectedCards[index] = this.selectedCards[index - 1];
        this.selectedCards[index - 1] = temp;

        this.renderSelectedCards();
    }

    moveSelectedDown(index) {
        if (index === this.selectedCards.length - 1) return;

        const temp = this.selectedCards[index];
        this.selectedCards[index] = this.selectedCards[index + 1];
        this.selectedCards[index + 1] = temp;

        this.renderSelectedCards();
    }

    removeSelected(index) {
        this.selectedCards.splice(index, 1);
        this.renderSelectedCards();
        this.renderSearchResults();
    }

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

        const inputHandler = (e) => {
            const groupContainer = e.target.closest('.group_container');
            if (!groupContainer) return;

            if (!container.contains(groupContainer)) return;

            const groupIndex = parseInt(groupContainer.dataset.groupIndex);

            if (e.target.classList.contains('group_title_input')) {
                this.groups[groupIndex].title = e.target.value;
            } else if (e.target.classList.contains('group_type_select')) {
                this.groups[groupIndex].type = e.target.value;
            }
        };

        container.removeEventListener('input', inputHandler);
        container.addEventListener('input', inputHandler);

        this.updateGroupAddButton();
    }

    createGroupHTML(group, groupIndex) {
        const { fieldPrefix, allowGroupDelete, allowGroupMove } = this.options;
        const kValue = this.options.kValue || 'H0100';

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

    formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}.${month}.${day}`;
    }

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

// 전역 export
window.CardGroupManager = CardGroupManager;
