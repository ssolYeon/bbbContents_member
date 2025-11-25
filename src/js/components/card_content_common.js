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
            searchEndpoint: options.searchEndpoint || '/master/keywords/contents',
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
        this.searchOffset = 0;
        this.searchLimit = 20;
        this.hasMore = false;
        this.totalCount = 0;
        this.isLoadingMore = false;

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

        // 페이징 초기화
        this.searchOffset = 0;
        this.hasMore = false;
        this.totalCount = 0;
        this.searchResults = [];

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

        // 빈 검색어로 초기 데이터 로드 (최신 20개)
        this.search();
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

        // 페이징 초기화
        this.searchOffset = 0;
        this.hasMore = false;
        this.totalCount = 0;
        this.searchResults = [];

        // 탭 전환 시에도 초기 데이터 로드
        this.search();
    }

    /**
     * 검색 실행
     */
    async search(isLoadMore = false) {
        const layer = document.querySelector(this.options.layerSelector);
        const searchInput = layer.querySelector('.layer_search_input');
        const keyword = searchInput ? searchInput.value.trim() : '';

        // 더보기가 아닌 경우 초기화
        if (!isLoadMore) {
            this.searchOffset = 0;
            this.searchResults = [];
        }

        // 이미 로딩 중이거나, 더보기인데 더 이상 데이터가 없으면 리턴
        if (this.isLoadingMore || (isLoadMore && !this.hasMore)) {
            return;
        }

        this.isLoadingMore = true;

        try {
            const response = await fetch(this.options.searchEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    search: keyword,
                    data_index: this.currentTab,
                    limit: this.searchLimit,
                    offset: this.searchOffset
                })
            });

            if (!response.ok) {
                throw new Error('검색 실패');
            }

            const result = await response.json();
            console.log('검색 API 응답:', result);

            // API 응답 구조에 따라 데이터 추출
            let searchData = [];

            if (result.success && Array.isArray(result.data)) {
                searchData = result.data;
            } else if (result.success && result.data && typeof result.data === 'object') {
                // data가 객체인 경우 (예: { content: [], series: [] })
                // 컨텐츠 배열 찾기
                if (Array.isArray(result.data.content)) {
                    searchData = result.data.content;
                } else if (Array.isArray(result.data.list)) {
                    searchData = result.data.list;
                } else {
                    // 첫 번째 배열 속성 찾기
                    for (let key in result.data) {
                        if (Array.isArray(result.data[key])) {
                            searchData = result.data[key];
                            break;
                        }
                    }
                }
            } else if (Array.isArray(result.data)) {
                searchData = result.data;
            } else if (Array.isArray(result)) {
                searchData = result;
            }

            // 결과 추가 (더보기인 경우 기존 결과에 추가)
            if (isLoadMore) {
                this.searchResults = [...this.searchResults, ...searchData];
            } else {
                this.searchResults = searchData;
            }

            // 페이징 정보 업데이트
            this.totalCount = result.total || 0;
            this.hasMore = result.has_more || false;
            this.searchOffset += this.searchLimit;

            console.log('추출된 검색 결과:', this.searchResults);

            this.renderSearchResults();

        } catch (error) {
            console.error('검색 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            this.isLoadingMore = false;
        }
    }

    /**
     * 검색 결과 렌더링
     */
    renderSearchResults() {
        console.log('=== renderSearchResults 호출 ===');
        const layer = document.querySelector(this.options.layerSelector);
        const resultContainer = layer.querySelector('.layer_left_panel .layer_panel_body');
        const countElement = layer.querySelector('.layer_left_panel .layer_panel_count');

        console.log('레이어:', layer);
        console.log('결과 컨테이너:', resultContainer);

        if (!resultContainer) {
            console.error('검색 결과 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // searchResults가 배열인지 확인
        if (!Array.isArray(this.searchResults)) {
            console.error('searchResults가 배열이 아닙니다:', this.searchResults);
            this.searchResults = [];
        }

        console.log('검색 결과 개수:', this.searchResults.length);
        console.log('선택된 카드 개수:', this.selectedCards.length);

        // 이미 선택된 카드 ID 목록
        const selectedIds = this.selectedCards.map(card => card.id || card.idx || card.goods_seq);
        console.log('선택된 카드 IDs:', selectedIds);

        let html = '';
        let visibleCount = 0;

        this.searchResults.forEach((card) => {
            const cardId = card.id || card.idx || card.goods_seq;
            const isHidden = selectedIds.includes(cardId);

            if (!isHidden) visibleCount++;

            html += this.createSearchCardHTML(card, isHidden);
        });

        if (this.searchResults.length === 0) {
            html = '<div style="padding: 4rem; text-align: center; color: #999;">검색 결과가 없습니다.</div>';
        } else if (this.hasMore) {
            // 더보기 버튼 추가
            html += `
                <div style="padding: 2rem; text-align: center;">
                    <button type="button" class="btn_load_more" style="padding: 1rem 2rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        더보기 (${visibleCount} / ${this.totalCount})
                    </button>
                </div>
            `;
        }

        console.log('생성된 HTML 길이:', html.length);
        console.log('표시될 카드 수:', visibleCount);

        resultContainer.innerHTML = html;

        if (countElement) {
            countElement.textContent = visibleCount;
        }

        // 더보기 버튼 이벤트 바인딩
        const loadMoreBtn = resultContainer.querySelector('.btn_load_more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.search(true); // 더보기 모드로 검색
            });
        }

        console.log('=== renderSearchResults 완료 ===');
    }

    /**
     * 검색 결과 카드 HTML 생성
     */
    createSearchCardHTML(card, isHidden = false) {
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
        console.log('=== addToSelected 호출 ===');
        console.log('추가할 카드:', card);

        const cardId = card.id || card.idx || card.goods_seq;
        console.log('카드 ID:', cardId);

        // 중복 체크
        const exists = this.selectedCards.find(c =>
            (c.id || c.idx || c.goods_seq) === cardId
        );

        if (exists) {
            alert('이미 추가된 카드입니다.');
            return;
        }

        // 맨 앞에 추가 (기존: push → 변경: unshift)
        this.selectedCards.unshift(card);
        console.log('선택된 카드 목록 업데이트됨, 총 개수:', this.selectedCards.length);

        this.renderSelectedCards();

        // 검색 결과에서 해당 카드만 숨김 처리 (전체 재렌더링 대신)
        this.hideSearchResultCard(cardId);

        // 카운트 업데이트
        this.updateSearchResultCount();

        console.log('=== addToSelected 완료 ===');
    }

    /**
     * 검색 결과에서 특정 카드만 숨김
     */
    hideSearchResultCard(cardId) {
        const layer = document.querySelector(this.options.layerSelector);
        if (!layer) {
            console.error('레이어를 찾을 수 없습니다.');
            return;
        }

        const searchCards = layer.querySelectorAll('.search_result_card');
        console.log(`숨기려는 카드 ID: ${cardId}, 검색 결과 카드 수: ${searchCards.length}`);

        let found = false;
        searchCards.forEach(cardEl => {
            try {
                const cardData = JSON.parse(
                    cardEl.dataset.card
                        .replace(/&quot;/g, '"')
                        .replace(/&#039;/g, "'")
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                );

                const currentCardId = cardData.id || cardData.idx || cardData.goods_seq;
                if (currentCardId === cardId) {
                    cardEl.classList.add('hidden');
                    found = true;
                    console.log(`카드 ID ${cardId} 숨김 처리 완료`);
                }
            } catch (e) {
                console.error('카드 데이터 파싱 실패:', e);
            }
        });

        if (!found) {
            console.warn(`카드 ID ${cardId}를 찾을 수 없습니다.`);
        }
    }

    /**
     * 검색 결과 카운트 업데이트
     */
    updateSearchResultCount() {
        const layer = document.querySelector(this.options.layerSelector);
        const countElement = layer.querySelector('.layer_left_panel .layer_panel_count');
        const visibleCards = layer.querySelectorAll('.search_result_card:not(.hidden)');

        if (countElement) {
            countElement.textContent = visibleCards.length;
        }
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
        const removedCard = this.selectedCards[index];
        const cardId = removedCard.id || removedCard.idx || removedCard.goods_seq;

        this.selectedCards.splice(index, 1);
        this.renderSelectedCards();

        // 검색 결과에서 해당 카드만 다시 표시 (전체 재렌더링 대신)
        this.showSearchResultCard(cardId);

        // 카운트 업데이트
        this.updateSearchResultCount();
    }

    /**
     * 검색 결과에서 특정 카드 다시 표시
     */
    showSearchResultCard(cardId) {
        const layer = document.querySelector(this.options.layerSelector);
        const searchCards = layer.querySelectorAll('.search_result_card');

        searchCards.forEach(cardEl => {
            try {
                const cardData = JSON.parse(
                    cardEl.dataset.card
                        .replace(/&quot;/g, '"')
                        .replace(/&#039;/g, "'")
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                );

                const currentCardId = cardData.id || cardData.idx || cardData.goods_seq;
                if (currentCardId === cardId) {
                    cardEl.classList.remove('hidden');
                }
            } catch (e) {
                console.error('카드 데이터 파싱 실패:', e);
            }
        });
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
        const cardId = card.id || card.idx || card.goods_seq || '';
        const cardType = card.board_type || card.ctype || card.is_type || 'bc';

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

/**
 * 폼 체크 및 전송 처리
 * content_registration.js에서 복사
 */
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('mainForm');
    const submitBtn = document.getElementById('submitBtn');

    if (!form || !submitBtn) {
        console.log('폼 또는 제출 버튼을 찾을 수 없습니다.');
        return;
    }

    // 에러 메시지 표시 함수
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            window.scrollTo({
                top: 400,
                behavior: 'smooth'
            });
        }
    }

    // 에러 메시지 숨김 함수
    function hideError(elementId) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    // 모든 에러 메시지 숨김
    function hideAllErrors() {
        hideError('title_error');
        hideError('editer_error');
        hideError('description_error');
        hideError('thum_s_error');
        hideError('thum_m_error');
        hideError('thum_l_error');
    }

    // 파일 유효성 검사
    function validateFile(input, errorId) {
        if (!input.files || input.files.length === 0) {
            return true;
        }

        const file = input.files[0];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            showError(errorId, 'JPG, PNG, GIF 파일만 업로드 가능합니다.');
            return false;
        }

        if (file.size > maxSize) {
            showError(errorId, '파일 크기는 10MB 이하여야 합니다.');
            return false;
        }

        hideError(errorId);
        return true;
    }

    // 폼 유효성 검사
    function validateForm() {
        hideAllErrors();
        let isValid = true;

        const post_title_main = document.getElementById('post_title_main');
        if (post_title_main) {
            if (!post_title_main.value) {
                showError('title_error', '대제목을 입력해주세요.');
                isValid = false;
            } else if (post_title_main.value.length > 30) {
                showError('title_error', '최대 글자 수는 공백 포함 30자입니다.');
                isValid = false;
            }
        }

        const post_subtitle = document.getElementById('post_subtitle');
        if (post_subtitle && !post_subtitle.value) {
            showError('description_error', '부제목을 입력해주세요.');
            isValid = false;
        }

        const member_seq = document.getElementById('member_seq');
        if (member_seq && (!member_seq.value || member_seq.value == 0)) {
            showError('editer_error', '에디터를 선택해주세요.');
            isValid = false;
        }

        const thum_s = document.getElementById('thum_s');
        if (thum_s && !validateFile(thum_s, 'thum_s_error')) {
            isValid = false;
        }

        const thum_m = document.getElementById('thum_m');
        if (thum_m && !validateFile(thum_m, 'thum_m_error')) {
            isValid = false;
        }

        const thum_l = document.getElementById('thum_l');
        if (thum_l && !validateFile(thum_l, 'thum_l_error')) {
            isValid = false;
        }

        return isValid;
    }

    // 버튼 상태 변경
    function setSubmitButtonState(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>처리중...</span>';
            submitBtn.style.opacity = '0.6';
        } else {
            submitBtn.disabled = false;
            const isEditPage = form.action.includes('/update/');
            submitBtn.innerHTML = isEditPage ? '<span>수정</span>' : '<span>등록</span>';
            submitBtn.style.opacity = '1';
        }
    }

    // 폼 전송 처리
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const recommendTitles = document.querySelectorAll('input[name^="recommend_title"]');
        let hasEmptyTitle = false;

        recommendTitles.forEach((input, index) => {
            if (!input.value || input.value.trim() === '') {
                hasEmptyTitle = true;
                console.warn(`추천 그룹 ${index}의 타이틀이 비어있습니다.`);
            }
        });

        if (hasEmptyTitle) {
            alert('추천 컨텐츠의 그룹 타이틀을 모두 입력해주세요.');
            submitBtn.disabled = false;
            return false;
        }

        function setValueSafely(targetName, sourceName) {
            const target = document.querySelector(`input[name="${targetName}"]`);
            const source = document.querySelector(`input[name="${sourceName}"]`);

            if (target && source) {
                const value = source.getAttribute('data-value');
                target.value = (value === null || value === undefined || value === '') ? '0' : value;
            } else {
                if (target) {
                    target.value = '0';
                }
            }
        }

        setValueSafely('category', 'category_tmp');
        setValueSafely('sidx', 'sidx_tmp');
        setValueSafely('member_seq', 'member_tmp');

        // 유효성 검사
        if (!validateForm()) {
            return false;
        }

        // 버튼 상태 변경
        setSubmitButtonState(true);

        // CSRF 토큰 가져오기
        let csrfToken = '';
        const inputCsrf = form.querySelector('input[name="_token"]');
        if (inputCsrf && inputCsrf.value) {
            csrfToken = inputCsrf.value;
        }

        // FormData 생성
        const formData = new FormData(form);

        // 헤더 설정
        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken;
        }

        // AJAX로 폼 전송
        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: headers
        })
            .then(response => {
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return response.json();
                    } else {
                        return { success: true };
                    }
                } else {
                    return response.text().then(text => {
                        try {
                            const errorData = JSON.parse(text);

                            // 인증이 필요한 경우 리다이렉트 처리
                            if (!errorData.success && errorData.redirect) {
                                alert(errorData.message || '로그인후 다시 작업 해주세요.');
                                window.location.href = errorData.redirect;
                                return;
                            }

                            throw new Error(errorData.message || '서버 오류가 발생했습니다.');
                        } catch (e) {
                            // JSON 파싱 실패 시
                            if (e instanceof SyntaxError) {
                                throw new Error('서버 오류가 발생했습니다. (HTTP ' + response.status + ')');
                            }
                            // 다른 에러는 그대로 전파
                            throw e;
                        }
                    });
                }
            })
            .then(data => {
                // 성공 처리
                if (data.success !== false) {
                    const currentUrl = '/master/c/contents';
                    const isEditPage = form.action.includes('/update/');
                    const successMessage = encodeURIComponent(isEditPage ? '수정 되었습니다.' : '등록 되었습니다.');
                    window.location.href = currentUrl + '?success=' + successMessage;
                } else {
                    setSubmitButtonState(false);
                    if (data.errors) {
                        Object.keys(data.errors).forEach(field => {
                            const errorId = field + '_error';
                            showError(errorId, data.errors[field][0]);
                        });
                    }
                    alert(data.message || '저장 중 오류가 발생했습니다.');
                }
            })
            .catch(error => {
                setSubmitButtonState(false);
                let errorMessage = '오류가 발생했습니다.';

                if (error.message.includes('500')) {
                    errorMessage = '서버 내부 오류가 발생했습니다. ';
                } else if (error.message.includes('419')) {
                    errorMessage = 'CSRF 토큰이 만료되었습니다. 페이지를 새로고침 후 다시 시도하세요.';
                } else if (error.message.includes('422')) {
                    errorMessage = '입력값에 오류가 있습니다.';
                } else {
                    errorMessage = error.message;
                }

                alert(errorMessage);
            });

        return false;
    });

    // 파일 삭제 버튼 처리
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('del_btn')) {
            const targetId = e.target.getAttribute('data-target');
            const fileInput = document.getElementById(targetId);
            const imgBox = e.target.closest('.img_box');

            if (fileInput) {
                fileInput.value = '';
            }

            if (imgBox) {
                imgBox.style.display = 'none';
            }
        }
    });

    // 파일 선택 시 미리보기
    document.addEventListener('change', function(e) {
        if (e.target.type === 'file' && e.target.files.length > 0) {
            const file = e.target.files[0];
            const targetId = e.target.id;
            let previewId = '';

            if (targetId === 'thum_s') {
                previewId = 'preViewthum_s';
            } else if (targetId === 'thum_m') {
                previewId = 'preViewthum_m';
            } else if (targetId === 'thum_l') {
                previewId = 'preViewthum_l';
            }

            if (previewId) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const previewImg = document.getElementById(previewId);
                    const imgBox = previewImg ? previewImg.closest('.img_box') : null;

                    if (previewImg) {
                        previewImg.src = event.target.result;
                    }

                    if (imgBox) {
                        imgBox.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    });
});
