import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {countVisualSlider} from "../../utils/sliderController.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc, discountPercent} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {showInformation} from "../common/footer.js";
import {getUrlPrams} from "../../utils/getUrlPrams.js";
import {renderCategoryNavigation} from "../../utils/renderCategoryNvigation.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {allmenu} from "../common/allmenu.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {initCategoryToggleNav} from "../../utils/contentsCategory.js";
import { centerActiveNav } from"../../utils/centerActiveNav.js";
import {cardTemplates} from "../../utils/renderCardTemplate.js";

const bombomController = (() => {
    // 전역 상태 관리
    const state = {
        lazy: null,
        currentSort: 'newest',
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        isInfiniteScrollActive: false,
        observer: null,
        sentinel: null,
        isGroupMode: false, // 그룹 모드 여부
        groupTitle: null    // 그룹 타이틀
    };

    const config = {
        API_BASE: '/api/bsList',
        CARD_TYPES: {
            SHOP: 'shop_174_174',
            CONTENT: 'card_361_361'
        }
    };

    // 유틸리티 함수들
    const utils = {
        getCategoryFromQuery: (url = window.location.href) => {
            try {
                const u = new URL(url, window.location.origin);
                return u.searchParams.get('category') || 'all';
            } catch {
                return 'all';
            }
        },

        getGroupFromQuery: (url = window.location.href) => {
            try {
                const u = new URL(url, window.location.origin);
                return u.searchParams.get('group');
            } catch {
                return null;
            }
        },

        getCurrentCategory: () => {
            // 그룹 모드일 때는 카테고리 무시
            if (state.isGroupMode) return null;

            const fromURL = utils.getCategoryFromQuery();
            if (fromURL) return fromURL;

            const selectVal = document.querySelector('.js_custom_select .select_value')?.dataset?.value;
            if (selectVal) return selectVal;

            const navActive = document.querySelector('.category_navigation [data-value].active, .category_navigation [aria-current="page"]');
            const navVal = navActive?.dataset?.value;
            if (navVal) return navVal;

            return 'all';
        },

        getCurrentGroup: () => {
            return utils.getGroupFromQuery();
        },

        buildApiUrl: (category, group, sort = null, page = 1) => {
            const params = new URLSearchParams();

            // group이 있으면 group 우선, 없으면 category
            if (group) {
                params.set('group', group);
            } else if (category && category !== 'all') {
                params.set('category', category);
            }

            if (sort) params.set('sort', sort);
            if (page > 1) params.set('page', page);

            return params.toString() ? `${config.API_BASE}?${params.toString()}` : config.API_BASE;
        },

        resetState: () => {
            state.currentPage = 1;
            state.totalPages = 1;
            state.isLoading = false;
            state.isInfiniteScrollActive = false;
            utils.cleanupObserver();
        },

        updateGroupMode: () => {
            const group = utils.getCurrentGroup();
            state.isGroupMode = !!group;


            // 탭네비게이션 표시/숨김
            const tabNav = document.querySelector('.bombom_category_navigation');
            if (tabNav) {
                if (state.isGroupMode) {
                    tabNav.style.display = 'none';
                } else {
                    tabNav.style.display = '';
                }
            }

            // 카테고리 네비게이션 표시/숨김
            const categoryNav = document.querySelector('.category_navigation_container');
            if (categoryNav) {
                if (state.isGroupMode) {
                    categoryNav.style.display = 'none';
                } else {
                    categoryNav.style.display = '';
                }
            }
        },

        updateGroupTitle: (data) => {
            if (!state.isGroupMode || state.currentPage !== 1) return

            //dewbian 그룹모드일때는 정렬셀렉트 삭제
            const sort_container = document.querySelector('.sort_container');
            if(sort_container){
                sort_container.style.display = 'none';
            }

            const groupTitle = data?.data?.meta?.recommendation_group?.title;
            if (groupTitle) {
                state.groupTitle = groupTitle;

                const groupTitleElement = document.getElementById('groupTitle');
                if (groupTitleElement) {
                    // \r\n을 <br>로 변환하여 HTML에 표시
                    const formattedTitle = groupTitle.replace(/\r\n/g, '<br>');
                    groupTitleElement.innerHTML = formattedTitle;
                }
            }
        }
    };

    // 레이지 로더 초기화
    const initLazyLoader = () => {
        state.lazy = createLazyLoader({
            // selector: '.lazy_loading_container img[data-src]',
            // root: null,
            // rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad: (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        state.lazy.init();
    };

    // HTML 템플릿 생성
    const templates = {
        shopCard: (item) => `
            <li role="listitem" class="series_card ${config.CARD_TYPES.SHOP}">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img data-src="${item.thumbnail}" alt="${escapeHtml(item.title)}"
                                 width="174.5" height="174.5" loading="lazy">
                        </picture>
                    </a>
                    <div class="card_top_marker">${renderCategory(item.category)}</div>
                    <button type="button"
                            class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                            data-post-id="${item.id}" data-board-type="${item.board_type}"
                            data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                            aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                    </button>
                </div>
                <div class="component_information_container">
                    <a href="${item.detail_url}">
                        <span class="card_seller">${item.seller}</span>
                        <p class="card_title text_ellipsis_2">${item.title}</p>
                        <p class="card_description">${item.description}</p>
                        <div class="price_container">
                            <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                            <div>
                                <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                <b>${item.price}</b>
                                <span class="unit">${item.unit}</span>
                            </div>
                        </div>
                        <div class="review_counter">리뷰 <b>${item.review_count}</b></div>
                    </a>
                </div>
            </li>
        `,

        contentCard: (item) => `
            <li class="series_card ${config.CARD_TYPES.CONTENT}">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img data-src="${item.thumbnail}" alt="${escapeHtml(item.title)}"
                                 width="361" height="270" loading="lazy">
                        </picture>
                    </a>
                    <div class="card_top_marker">${renderCategory(item.category)}</div>
                    <button type="button"
                            class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                            data-post-id="${item.id}" data-board-type="${item.board_type}"
                            data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                            aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                    </button>
                    <div class="card_tag_container">${renderTag(item.tag)}</div>
                </div>
                <div class="component_information_container">
                    <a href="${item.detail_url}">
                        <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                        <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                    </a>
                </div>
            </li>
        `,


        seriesCard: (item) => `
                  <li class="series_card full">
                    <div class="thumbnail">
                        <a href=${item.detail_url}>
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="360"
                              height="480"
                              loading="lazy"
                            >
                          </picture>
                          <div class="card_top_marker">
                            ${renderCategory(item.category)}
                          </div>
                          <div class="component_information_container">
                              <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                              <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                              <div class="card_tag_container">${renderTag(item.tag)}</div>
                              <div class="card_count_posts">총 콘텐츠 <b>${item.contents_count}</b>개</div>
                          </div>
                        </a>
                        <button type="button"
                              class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                              data-post-id="${item.id}"
                              data-board-type = "${item.board_type}"
                              data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                              aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}"
                         >
                            <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                         </button>
                    </div>
                  </li>
        `
    };

    function updateResultsCount(count) {
        const resultsCount = document.querySelector('.total_posts');
        if (!resultsCount) return;

        resultsCount.innerHTML = `총 <b>${count}</b> 개`;
    }



    // API 관련 함수들
    const api = {
        fetchData: async (url) => {
            if (state.isLoading) return null;

            try {
                state.isLoading = true;
                ui.toggleLoadingState(true);

                const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' },
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                return data;

            } catch (error) {
                console.error('API 요청 실패:', error);
                ui.showError('데이터를 불러오는데 실패했습니다.');
                return null;
            } finally {
                state.isLoading = false;
                ui.toggleLoadingState(false);
            }
        },

        loadContent: async (resetPage = false) => {
            if (resetPage) utils.resetState();

            // 그룹 모드 상태 업데이트
            utils.updateGroupMode();

            const category = utils.getCurrentCategory();
            const group = utils.getCurrentGroup();
            const url = utils.buildApiUrl(category, group, state.currentSort, state.currentPage);

            //console.log(`콘텐츠 로드: ${url} (그룹모드: ${state.isGroupMode})`);
            const data = await api.fetchData(url);

            if (!data) return;

            // 그룹 타이틀 업데이트 (첫 페이지에서만)
            utils.updateGroupTitle(data);

            // 다양한 응답 구조 지원
            const items = data?.data?.items || data?.items || data?.posts || data || [];
            const pagination = data?.data?.pagination || data?.pagination || {};

            updateResultsCount(pagination.total);
            // 페이지 정보 업데이트
            state.currentPage = pagination.current_page || 1;
            state.totalPages = pagination.last_page || 1;

            // 렌더링
            if (state.currentPage === 1) {
                content.render(items);
            } else {
                content.append(items);
            }

            // UI 상태 업데이트
            ui.updateViewMoreButton(pagination);

            // 무한 스크롤 활성화 (2페이지부터)
            if (state.currentPage === 2 && !state.isInfiniteScrollActive) {
                state.isInfiniteScrollActive = true;
                scroll.initIntersectionObserver();
            }
        },

        loadNextPage: () => {
            if (state.currentPage >= state.totalPages || state.isLoading) return;

            state.currentPage += 1;
            api.loadContent();
        }
    };

    // 콘텐츠 렌더링
    const content = {
        getContainer: () => document.querySelector('.list_container .list_contents'),

        getCardType: () => {
            // 컨테이너나 기존 카드를 확인하여 카드 타입 결정
            const container = content.getContainer();
            if (!container) return 'content';

            const existingCard = container.querySelector('.component_card');
            if (existingCard?.classList.contains(config.CARD_TYPES.SHOP)) {
                return 'shop';
            }
            return 'content';
        },

        render: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 빈 데이터 처리
            if (!items || items.length === 0) {
                content.showEmptyState();
                return;
            }

            const cardType = content.getCardType();
            //const template = cardType === 'shop' ? templates.shopCard : templates.contentCard;

            const template = templates.seriesCard;

            const html__ = items.map(template).join('');
            const html = items.map(item => cardTemplates.seriesCard(item, 'full')).join('');
            container.innerHTML = html;

            if (state.lazy?.refresh) state.lazy.refresh(container);
        },
        append: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            const cardType = content.getCardType();
            //const template = cardType === 'shop' ? templates.shopCard : templates.contentCard;
            const template = templates.seriesCard;

            const html__ = items.map(template).join('');
            const html = items.map(item => cardTemplates.seriesCard(item, 'full')).join('');
            container.insertAdjacentHTML('beforeend', html);

            if (state.lazy?.refresh) state.lazy.refresh(container);
        },
        showEmptyState: () => {
            const container = content.getContainer();
            if (!container) return;

            container.innerHTML = `<li class="nodata">콘텐츠가 없습니다.</li>`;
        },


    };

    // UI 관련 함수들
    const ui = {
        updateViewMoreButton: (pagination) => {
            const container = document.querySelector('.btn_view_more_container');
            const button = document.querySelector('.btn_view_more');

            if (!container || !button) return;

            if (state.currentPage >= 2 || !pagination.has_more_pages) {
                container.style.display = 'none';
            } else {
                container.style.display = 'flex';
                button.disabled = false;
                button.textContent = '콘텐츠 더 보기';
            }
        },

        toggleLoadingState: (loading) => {
            const button = document.querySelector('.btn_view_more');
            if (!button) return;

            if (loading && state.currentPage === 1) {
                button.disabled = true;
                button.textContent = '로딩 중...';
            } else if (!loading && state.currentPage === 1) {
                button.disabled = false;
                button.textContent = '콘텐츠 더 보기';
            }
        },

        showError: (message) => {
            console.error(message);
            // 필요하다면 사용자에게 에러 토스트 표시
        }
    };

    const sort = {
        init: () => {
            const container = document.querySelector('.sort_container');
            const currentButton = container?.querySelector('.current_sort_state .state');
            const dropdown = container?.querySelector('.component_select_list');

            if (!container || !currentButton || !dropdown) return;

            sort.bindEvents(container, currentButton, dropdown);
        },

        bindEvents: (container, currentButton, dropdown) => {
            // 드롭다운 토글
            currentButton.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = currentButton.getAttribute('aria-expanded') === 'true';
                sort.toggleDropdown(currentButton, dropdown, !isOpen);
            });

            // 외부 클릭 시 닫기
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    sort.toggleDropdown(currentButton, dropdown, false);
                }
            });

            // 정렬 옵션 클릭
            dropdown.addEventListener('click', (e) => {
                const option = e.target.closest('[role="option"]');
                if (!option) return;

                e.preventDefault();
                sort.handleSortChange(option, currentButton, dropdown);
            });
        },

        toggleDropdown: (button, dropdown, isOpen) => {
            button.setAttribute('aria-expanded', isOpen);
            dropdown.style.display = isOpen ? 'flex' : 'none';
        },

        handleSortChange: (option, currentButton, dropdown) => {
            const newSort = option.dataset.sort;
            const sortText = option.textContent.trim();

            if (newSort === state.currentSort) {
                sort.toggleDropdown(currentButton, dropdown, false);
                return;
            }

            // 상태 업데이트
            state.currentSort = newSort;
            currentButton.textContent = sortText;
            currentButton.dataset.sort = newSort;

            // aria-selected 상태 업데이트
            dropdown.querySelectorAll('[role="option"]').forEach(opt => {
                opt.setAttribute('aria-selected', opt.dataset.sort === newSort ? 'true' : 'false');
            });

            // 드롭다운 닫기
            sort.toggleDropdown(currentButton, dropdown, false);

            // 데이터 새로 로드
            //console.log(`정렬 변경: ${sortText} (${newSort})`);
            api.loadContent(true);
        }
    };
    // 정렬 기능
    const sort__ = {
        init: () => {
            const container = document.querySelector('.sort_container');
            const currentButton = container?.querySelector('.current_sort_state .state');
            const dropdown = container?.querySelector('.component_select_list');

            if (!container || !currentButton || !dropdown) return;

            sort.bindEvents(container, currentButton, dropdown);
        },

        bindEvents: (container, currentButton, dropdown) => {
            // 드롭다운 토글
            currentButton.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = currentButton.getAttribute('aria-expanded') === 'true';
                sort.toggleDropdown(currentButton, dropdown, !isOpen);
            });

            // 외부 클릭 시 닫기
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    sort.toggleDropdown(currentButton, dropdown, false);
                }
            });

            // 정렬 옵션 클릭
            dropdown.addEventListener('click', (e) => {
                const option = e.target.closest('[role="option"]');
                if (!option) return;

                e.preventDefault();
                sort.handleSortChange(option, currentButton, dropdown);
            });
        },

        toggleDropdown: (button, dropdown, isOpen) => {
            button.setAttribute('aria-expanded', isOpen);
            dropdown.style.display = isOpen ? 'block' : 'none';
        },

        handleSortChange: (option, currentButton, dropdown) => {
            const newSort = option.dataset.sort;
            const sortText = option.textContent.trim();

            if (newSort === state.currentSort) {
                sort.toggleDropdown(currentButton, dropdown, false);
                return;
            }

            // 상태 업데이트
            state.currentSort = newSort;
            currentButton.textContent = sortText;
            currentButton.dataset.sort = newSort;

            // aria-selected 상태 업데이트
            dropdown.querySelectorAll('[role="option"]').forEach(opt => {
                opt.setAttribute('aria-selected', opt.dataset.sort === newSort ? 'true' : 'false');
            });

            // 드롭다운 닫기
            sort.toggleDropdown(currentButton, dropdown, false);

            // 데이터 새로 로드
            //(`정렬 변경: ${sortText} (${newSort})`);
            api.loadContent(true);
        }
    };

    // 스크롤 관련 기능
    const scroll = {
        initViewMoreButton: () => {
            const button = document.querySelector('.btn_view_more');
            if (!button) return;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                api.loadNextPage();
            });
        },

        initIntersectionObserver: () => {
            // 기존 observer 정리
            utils.cleanupObserver();

            // 센티넬 엘리먼트 생성
            const sentinel = document.createElement('div');
            sentinel.className = 'scroll-sentinel';
            sentinel.style.cssText = `
                position: absolute;
                bottom: 300px;
                height: 1px;
                pointer-events: none;
                opacity: 0;
                z-index: -1;
            `;

            // 센티넬을 컨테이너에 추가
            const listContainer = content.getContainer();
            if (listContainer?.parentElement) {
                const parent = listContainer.parentElement;

                if (window.getComputedStyle(parent).position === 'static') {
                    parent.style.position = 'relative';
                }

                parent.appendChild(sentinel);
                state.sentinel = sentinel;
            }

            // Intersection Observer 설정
            state.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting &&
                        state.currentPage < state.totalPages &&
                        !state.isLoading &&
                        state.isInfiniteScrollActive) {

                        //console.log(`무한 스크롤 트리거: ${state.currentPage + 1}페이지 로드`);
                        api.loadNextPage();
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0
            });

            if (state.sentinel) {
                state.observer.observe(state.sentinel);
            }
        }
    };

    // 정리 함수들
    const cleanup = {
        all: () => {
            utils.cleanupObserver();
        }
    };

    utils.cleanupObserver = () => {
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
        if (state.sentinel?.parentElement) {
            state.sentinel.parentElement.removeChild(state.sentinel);
            state.sentinel = null;
        }
    };

    // 초기화 함수
    const initialize = async () => {
        // 그룹 모드 확인 및 초기 설정
        utils.updateGroupMode();

        // 그룹 모드가 아닐 때만 카테고리 네비게이션 렌더링
        if (!state.isGroupMode) {
            renderCategoryNavigation('/api/bsCategory');
        }

        countVisualSlider();
        initLazyLoader();
        showInformation();

        // 메인 콘텐츠 로드
        api.loadContent();

        // 기능들 초기화
        scroll.initViewMoreButton();
        sort.init();

        bindCaptureToast({
            bindClick: false,
            listen: true,
            getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
            //getText: (_btn, next) => next ? '스크랩되었습니다.':'취소되었습니다.',
        });
        bindCaptureToggle({
            endpoint: '/api/capture',
            //dewbian 로그인 포함시키자
            goLogin: goLogin, // 로그인 함수 전달

            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error('Login required');
                }
            },
        });

        allmenu();
        initSearchHandler();

        // 그룹 모드가 아닐 때만 카테고리 토글 네비게이션 초기화
        if (!state.isGroupMode) {
            await initCategoryToggleNav({dataUrl: "/api/bsCategory"});
        }

        await centerActiveNav({
            navSelector: '.category_navigation',
            activeSelector: 'a.active',
            behavior: 'instant'
        });
    };

    return {
        init: initialize,
        destroy: cleanup.all,
        // 외부에서 사용할 수 있는 API들
        loadContent: api.loadContent,
        getCurrentCategory: utils.getCurrentCategory,
        getCurrentGroup: utils.getCurrentGroup,
        isGroupMode: () => state.isGroupMode,
        getGroupTitle: () => state.groupTitle
    };
})();

document.addEventListener('DOMContentLoaded', bombomController.init);
