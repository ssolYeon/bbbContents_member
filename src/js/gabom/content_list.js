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

const gabomContentController = (() => {
    // 전역 상태 관리 객체 - dewbian
    const state = {
        lazy: null,
        currentSort: 'newest',
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        isInfiniteScrollActive: false,
        observer: null,
        sentinel: null,
        isGroupMode: false, // 그룹 모드 여부 - dewbian
        groupTitle: null    // 그룹 타이틀 - dewbian
    };

    // 설정 정보 객체 - dewbian
    const config = {
        API_BASE: '/api/gbList', // 상품 API 엔드포인트로 변경 - dewbian
        CARD_TYPES: {
            SHOP: 'shop_174_174',
            CONTENT: 'card_361_270' // 상품 카드 클래스로 변경 - dewbian
        }
    };

    // 유틸리티 함수들 - dewbian
    const utils = {
        // URL에서 카테고리 파라미터 추출 - dewbian
        getCategoryFromQuery: (url = window.location.href) => {
            try {
                const u = new URL(url, window.location.origin);
                return u.searchParams.get('category') || 'all';
            } catch {
                return 'all';
            }
        },

        // URL에서 그룹 파라미터 추출 - dewbian
        getGroupFromQuery: (url = window.location.href) => {
            try {
                const u = new URL(url, window.location.origin);
                return u.searchParams.get('group');
            } catch {
                return null;
            }
        },

        // 현재 활성화된 카테고리 가져오기 - dewbian
        getCurrentCategory: () => {
            // 그룹 모드일 때는 카테고리 무시 - dewbian
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

        // 현재 그룹 가져오기 - dewbian
        getCurrentGroup: () => {
            return utils.getGroupFromQuery();
        },

        // API URL 빌드 함수 - dewbian
        buildApiUrl: (category, group, sort = null, page = 1) => {
            const params = new URLSearchParams();

            // group이 있으면 group 우선, 없으면 category - dewbian
            if (group) {
                params.set('group', group);
            } else if (category && category !== 'all') {
                params.set('category', category);
            }

            if (sort) params.set('sort', sort);
            if (page > 1) params.set('page', page);

            return params.toString() ? `${config.API_BASE}?${params.toString()}` : config.API_BASE;
        },

        // 상태 초기화 함수 - dewbian
        resetState: () => {
            state.currentPage = 1;
            state.totalPages = 1;
            state.isLoading = false;
            state.isInfiniteScrollActive = false;
            utils.cleanupObserver();
        },

        // 그룹 모드 상태 업데이트 - dewbian
        updateGroupMode: () => {
            const group = utils.getCurrentGroup();
            state.isGroupMode = !!group;

            // 카테고리 네비게이션 표시/숨김 처리 - dewbian
            const categoryNav = document.querySelector('.category_navigation_container');
            if (categoryNav) {
                if (state.isGroupMode) {
                    categoryNav.style.display = 'none';
                } else {
                    categoryNav.style.display = '';
                }
            }
        },

        // 그룹 타이틀 업데이트 함수 - dewbian
        updateGroupTitle: (data) => {
            if (!state.isGroupMode || state.currentPage !== 1) return;

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
                    // \r\n을 <br>로 변환하여 HTML에 표시 - dewbian
                    const formattedTitle = groupTitle.replace(/\r\n/g, '<br>');
                    groupTitleElement.innerHTML = formattedTitle;
                }
            }
        },

        // 할인율 계산 함수 (homepageController 방식 적용) - dewbian
        calculateDiscountRate: (originalPrice, discountPrice) => {
            // 둘 중 하나라도 없으면 0 반환 - dewbian
            if (!originalPrice || !discountPrice) return 0;

            // 쉼표 제거 후 숫자로 변환 - dewbian
            const original = parseInt(originalPrice.replace(/,/g, ''));
            const discount = parseInt(discountPrice.replace(/,/g, ''));

            // 할인가가 원가보다 크거나 같으면 할인 없음 - dewbian
            if (original <= discount) return 0;

            // 할인율 계산 후 올림 - dewbian
            return Math.ceil(((original - discount) / original) * 100);
        }
    };

    // 레이지 로더 초기화 함수 - dewbian
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

    function updateResultsCount(count) {
        const resultsCount = document.querySelector('.total_posts');
        if (!resultsCount) return;

        resultsCount.innerHTML = `총 <b>${count}</b> 개`;
    }

    // API 관련 함수들 - dewbian
    const api = {
        // 데이터 요청 함수 - dewbian
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
                ui.showError('상품 데이터를 불러오는데 실패했습니다.');
                return null;
            } finally {
                state.isLoading = false;
                ui.toggleLoadingState(false);
            }
        },

        // 콘텐츠 로드 함수 - dewbian
        loadContent: async (resetPage = false) => {
            if (resetPage) utils.resetState();

            // 그룹 모드 상태 업데이트 - dewbian
            utils.updateGroupMode();

            const category = utils.getCurrentCategory();
            const group = utils.getCurrentGroup();
            const url = utils.buildApiUrl(category, group, state.currentSort, state.currentPage);

            console.log(`상품 로드: ${url} (그룹모드: ${state.isGroupMode})`);
            const data = await api.fetchData(url);

            if (!data) return;

            // 그룹 타이틀 업데이트 (첫 페이지에서만) - dewbian
            utils.updateGroupTitle(data);

            // 다양한 응답 구조 지원 - dewbian
            const items = data?.data?.items || data?.items || data?.posts || data || [];
            const pagination = data?.data?.pagination || data?.pagination || {};

            updateResultsCount(pagination.total);
            // 페이지 정보 업데이트 - dewbian
            state.currentPage = pagination.current_page || 1;
            state.totalPages = pagination.last_page || 1;

            // 렌더링 처리 - dewbian
            if (state.currentPage === 1) {
                content.render(items);
            } else {
                content.append(items);
            }

            // UI 상태 업데이트 - dewbian
            ui.updateViewMoreButton(pagination);

            // 무한 스크롤 활성화 (2페이지부터) - dewbian
            if (state.currentPage === 2 && !state.isInfiniteScrollActive) {
                state.isInfiniteScrollActive = true;
                scroll.initIntersectionObserver();
            }
        },

        // 다음 페이지 로드 함수 - dewbian
        loadNextPage: () => {
            if (state.currentPage >= state.totalPages || state.isLoading) return;

            state.currentPage += 1;
            api.loadContent();
        }
    };

    // 콘텐츠 렌더링 관련 함수들 - dewbian
    const content = {
        // 컨테이너 요소 가져오기 - dewbian
        getContainer: () => document.querySelector('.list_container .list_contents'),

        // 콘텐츠 렌더링 (새로고침) - dewbian
        render: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 빈 데이터 처리 - dewbian
            if (!items || items.length === 0) {
                content.showEmptyState();
                return;
            }

            const html = items.map(item => cardTemplates.gabomCard(item, 'full')).join('');
            container.innerHTML = html;

            // 레이지 로더 새로고침 - dewbian
            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        // 콘텐츠 추가 (무한 스크롤용) - dewbian
        append: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            const html = items.map(item => cardTemplates.gabomCard(item, 'full')).join('');
            container.insertAdjacentHTML('beforeend', html);

            // 레이지 로더 새로고침 - dewbian
            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        // 빈 상태 표시 - dewbian
        showEmptyState: () => {
            const container = content.getContainer();
            if (!container) return;

            container.innerHTML = `<li class="nodata">상품이 없습니다.</li>`;
        }
    };

    // UI 관련 함수들 - dewbian
    const ui = {
        // 더보기 버튼 상태 업데이트 - dewbian
        updateViewMoreButton: (pagination) => {
            const container = document.querySelector('.btn_view_more_container');
            const button = document.querySelector('.btn_view_more');

            if (!container || !button) return;

            // 2페이지 이상이거나 더 이상 페이지가 없으면 숨김 - dewbian
            if (state.currentPage >= 2 || !pagination.has_more_pages) {
                container.style.display = 'none';
            } else {
                container.style.display = 'flex';
                button.disabled = false;
                button.textContent = '더 보기';
            }
        },

        // 로딩 상태 토글 - dewbian
        toggleLoadingState: (loading) => {
            const button = document.querySelector('.btn_view_more');
            if (!button) return;

            if (loading && state.currentPage === 1) {
                button.disabled = true;
                button.textContent = '로딩 중...';
            } else if (!loading && state.currentPage === 1) {
                button.disabled = false;
                button.textContent = '더 보기';
            }
        },

        // 에러 메시지 표시 - dewbian
        showError: (message) => {
            console.error(message);
            // 필요하다면 사용자에게 에러 토스트 표시 - dewbian
        }
    };

    // 정렬 기능 관련 함수들 - dewbian
    const sort = {
        // 정렬 기능 초기화 - dewbian
        init: () => {
            const container = document.querySelector('.sort_container');
            const currentButton = container?.querySelector('.current_sort_state .state');
            const dropdown = container?.querySelector('.component_select_list');

            if (!container || !currentButton || !dropdown) return;

            sort.bindEvents(container, currentButton, dropdown);
        },

        // 이벤트 바인딩 - dewbian
        bindEvents: (container, currentButton, dropdown) => {
            // 드롭다운 토글 이벤트 - dewbian
            currentButton.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = currentButton.getAttribute('aria-expanded') === 'true';
                sort.toggleDropdown(currentButton, dropdown, !isOpen);
            });

            // 외부 클릭 시 닫기 이벤트 - dewbian
            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    sort.toggleDropdown(currentButton, dropdown, false);
                }
            });

            // 정렬 옵션 클릭 이벤트 - dewbian
            dropdown.addEventListener('click', (e) => {
                const option = e.target.closest('[role="option"]');
                if (!option) return;

                e.preventDefault();
                sort.handleSortChange(option, currentButton, dropdown);
            });
        },

        // 드롭다운 토글 함수 - dewbian
        toggleDropdown: (button, dropdown, isOpen) => {
            button.setAttribute('aria-expanded', isOpen);
            dropdown.style.display = isOpen ? 'block' : 'none';
        },

        // 정렬 변경 처리 함수 - dewbian
        handleSortChange: (option, currentButton, dropdown) => {
            const newSort = option.dataset.sort;
            const sortText = option.textContent.trim();

            // 같은 정렬이면 드롭다운만 닫기 - dewbian
            if (newSort === state.currentSort) {
                sort.toggleDropdown(currentButton, dropdown, false);
                return;
            }

            // 상태 업데이트 - dewbian
            state.currentSort = newSort;
            currentButton.textContent = sortText;
            currentButton.dataset.sort = newSort;

            // aria-selected 상태 업데이트 - dewbian
            dropdown.querySelectorAll('[role="option"]').forEach(opt => {
                opt.setAttribute('aria-selected', opt.dataset.sort === newSort ? 'true' : 'false');
            });

            // 드롭다운 닫기 - dewbian
            sort.toggleDropdown(currentButton, dropdown, false);

            // 데이터 새로 로드 - dewbian
            console.log(`정렬 변경: ${sortText} (${newSort})`);
            api.loadContent(true);
        }
    };

    // 스크롤 관련 기능들 - dewbian
    const scroll = {
        // 더보기 버튼 초기화 - dewbian
        initViewMoreButton: () => {
            const button = document.querySelector('.btn_view_more');
            if (!button) return;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                api.loadNextPage();
            });
        },

        // 무한 스크롤 관찰자 초기화 - dewbian
        initIntersectionObserver: () => {
            // 기존 observer 정리 - dewbian
            utils.cleanupObserver();

            // 센티넬 엘리먼트 생성 - dewbian
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

            // 센티넘을 컨테이너에 추가 - dewbian
            const listContainer = content.getContainer();
            if (listContainer?.parentElement) {
                const parent = listContainer.parentElement;

                if (window.getComputedStyle(parent).position === 'static') {
                    parent.style.position = 'relative';
                }

                parent.appendChild(sentinel);
                state.sentinel = sentinel;
            }

            // Intersection Observer 설정 - dewbian
            state.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting &&
                        state.currentPage < state.totalPages &&
                        !state.isLoading &&
                        state.isInfiniteScrollActive) {

                        console.log(`무한 스크롤 트리거: ${state.currentPage + 1}페이지 로드`);
                        api.loadNextPage();
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0
            });

            // 센티넘 관찰 시작 - dewbian
            if (state.sentinel) {
                state.observer.observe(state.sentinel);
            }
        }
    };

    // 정리 함수들 - dewbian
    const cleanup = {
        // 모든 리소스 정리 - dewbian
        all: () => {
            utils.cleanupObserver();
        }
    };

    // 관찰자 정리 함수 - dewbian
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

    // 컨트롤러 초기화 함수 - dewbian
    const initialize = async () => {
        // 그룹 모드 확인 및 초기 설정 - dewbian
        utils.updateGroupMode();

        // 그룹 모드가 아닐 때만 카테고리 네비게이션 렌더링 - dewbian
        if (!state.isGroupMode) {
            renderCategoryNavigation('/api/gbCategory');
        }

        // 각종 컴포넌트 초기화 - dewbian
        countVisualSlider();
        initLazyLoader();
        showInformation();

        // 메인 콘텐츠 로드 - dewbian
        api.loadContent();

        // 기능들 초기화 - dewbian
        scroll.initViewMoreButton();
        sort.init();

        // 캡처/스크랩 관련 기능 초기화 - dewbian
        bindCaptureToast({
            bindClick: false,
            listen: true,
        });
        bindCaptureToggle({
            endpoint: '/api/capture',
            goLogin: goLogin, // 로그인 함수 전달 - dewbian

            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error('Login required');
                }
            },
        });

        // 공통 기능 초기화 - dewbian
        allmenu();
        initSearchHandler();

        // 그룹 모드가 아닐 때만 카테고리 토글 네비게이션 초기화 - dewbian
        if (!state.isGroupMode) {
           await initCategoryToggleNav({dataUrl: "/api/gbCategory"});
        }

        await centerActiveNav({
            navSelector: '.category_navigation',
            activeSelector: 'a.active',
            behavior: 'instant'
        });
    };

    // 외부 API 반환 - dewbian
    return {
        init: initialize,
        destroy: cleanup.all,
        // 외부에서 사용할 수 있는 API들 - dewbian
        loadContent: api.loadContent,
        getCurrentCategory: utils.getCurrentCategory,
        getCurrentGroup: utils.getCurrentGroup,
        isGroupMode: () => state.isGroupMode,
        getGroupTitle: () => state.groupTitle
    };
})();

// DOM 로드 완료 시 컨트롤러 초기화 - dewbian
document.addEventListener('DOMContentLoaded', gabomContentController.init);
