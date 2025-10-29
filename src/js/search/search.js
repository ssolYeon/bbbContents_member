import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc, discountPercent} from "../../utils/renderCardMeta.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {cardTemplates} from "../../utils/renderCardTemplate.js";

/**
 * 통합 검색 페이지 컨트롤러
 * - 탭별 검색 (bb, hb, gb, sb)
 * - 카테고리별 필터링
 * - 1페이지: 더보기 버튼 / 2페이지 이후: 무한스크롤
 */
const searchController = (() => {

    // API 기본 엔드포인트
    const BASE_API = '/api/search';

    /**
     * 통합 상태 관리 객체
     * - 모든 상태값을 하나의 객체로 통합 관리
     */
    const state = {
        // 레이지 로더 인스턴스
        lazy: null,

        // 현재 선택된 값들
        currentSort: 'newest',        // 정렬 기준
        currentPage: 1,              // 현재 페이지 번호
        currentTab: 'bb',            // 현재 활성 탭 (bb=봄봄, hb=해봄, gb=가봄, sb=사봄)
        currentCategory: 'all',       // 현재 선택된 카테고리

        // 검색 관련
        searchKeyword: '',           // 검색어
        allCategoriesData: null,     // 전체 카테고리 데이터

        // 페이징 관련
        totalPages: 1,               // 전체 페이지 수
        hasMorePages: false,         // 추가 페이지 존재 여부

        // 로딩 및 스크롤 관련
        isLoading: false,            // 현재 로딩 중인지 여부
        isInfiniteScrollActive: false, // 무한 스크롤 활성화 여부
        observer: null,              // Intersection Observer 인스턴스
        sentinel: null,              // 스크롤 감지용 센티넬 엘리먼트
    };

    /**
     * 레이지 로더 초기화
     * - 이미지 지연 로딩을 위한 설정
     */
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

    /**
     * 유틸리티 함수 모음
     */
    const utils = {
        /**
         * 할인율 계산
         * @param {string} originalPrice - 원가
         * @param {string} discountPrice - 할인가
         * @returns {number} - 할인율 (0-100)
         */
        calculateDiscountRate: (originalPrice, discountPrice) => {
            if (!originalPrice || !discountPrice) return 0;

            const original = parseInt(originalPrice.replace(/,/g, ''));
            const discount = parseInt(discountPrice.replace(/,/g, ''));

            if (original <= discount) return 0;

            return Math.ceil(((original - discount) / original) * 100);
        },

        /**
         * 페이징 상태 초기화
         * - 새로운 검색이나 필터 변경 시 호출
         */
        resetState: () => {
            document.getElementById('bbb_empty_container').style.display = 'none';
            state.currentPage = 1;
            state.totalPages = 1;
            state.isLoading = false;
            state.isInfiniteScrollActive = false;
            state.hasMorePages = false;
            utils.cleanupObserver();
        },

        /**
         * Intersection Observer 정리
         * - 메모리 누수 방지를 위해 사용하지 않는 observer 제거
         */
        cleanupObserver: () => {
            if (state.observer) {
                state.observer.disconnect();
                state.observer = null;
            }
            if (state.sentinel?.parentElement) {
                state.sentinel.parentElement.removeChild(state.sentinel);
                state.sentinel = null;
            }
        }
    };

    /**
     * URL 관련 함수들
     */
    const urlUtils = {
        /**
         * URL에서 검색어 추출
         * @returns {string} - 검색어 (없으면 빈 문자열)
         */
        getSearchKeywordFromUrl: () => {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('s') || '';
        },

        /**
         * URL 업데이트 (검색어 유지하면서 탭/카테고리 반영)
         * @param {string} tab - 탭 코드
         * @param {string} category - 카테고리 코드
         */
        updateUrl: (tab, category) => {
            const params = new URLSearchParams();

            // 검색어가 있으면 유지
            if (state.searchKeyword) {
                params.set('s', state.searchKeyword);
            }

            // 기본값이 아닌 경우에만 URL에 포함
            if (tab !== 'bb') {
                params.set('tab', tab);
            }
            if (category !== 'all') {
                params.set('category', category);
            }

            const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
            window.history.pushState(null, '', newUrl);
        },

        /**
         * API 호출용 URL 생성
         * @param {string} tab - 탭 코드
         * @param {string} category - 카테고리 코드
         * @param {number} page - 페이지 번호
         * @returns {string} - 완성된 API URL
         */
        buildApiUrl: (tab, category, page = 1) => {
            const params = new URLSearchParams({
                tab: tab,
                category: category,
                page: page
            });

            if (state.searchKeyword) {
                params.set('s', state.searchKeyword);
            }

            return `${BASE_API}?${params.toString()}`;
        },

        /**
         * URL에서 초기 상태 설정
         * - 페이지 로드 시 URL 파라미터를 기반으로 상태 초기화
         */
        initializeFromUrl: () => {
            const urlParams = new URLSearchParams(window.location.search);

            // 검색어 설정
            state.searchKeyword = urlParams.get('s') || '';

            // 탭 설정 (유효한 탭만 허용)
            const urlTab = urlParams.get('tab');
            if (urlTab && ['bb', 'bc', 'bs', 'hb', 'gb', 'sb'].includes(urlTab)) {
                state.currentTab = urlTab;
            }

            // 카테고리 설정
            const urlCategory = urlParams.get('category');
            if (urlCategory) {
                state.currentCategory = urlCategory;
            }

            console.log('URL에서 초기화:', {
                tab: state.currentTab,
                category: state.currentCategory,
                search: state.searchKeyword
            });
        }
    };

    /**
     * 탭 전환 관련 함수들
     */
    const tabControl = {
        /**
         * 메인 탭 전환 처리
         * @param {string} tabType - 전환할 탭 타입 (bb, hb, gb, sb)
         */
        switchMainTab: (tabType) => {
            if (state.currentTab === tabType) return;

            console.log(`탭 전환: ${state.currentTab} → ${tabType}`);

            // 상태 업데이트
            state.currentTab = tabType;
            state.currentCategory = 'all'; // 탭 변경 시 카테고리 초기화

            // 페이지 상태 초기화
            utils.resetState();

            // UI 업데이트
            tabControl.updateTabUI(tabType);
            //uiControl.removeSeriesContentStructure();
            urlUtils.updateUrl(state.currentTab, state.currentCategory);

            // 카테고리 네비게이션 업데이트
            if (state.allCategoriesData) {
                categoryControl.updateNavigation(tabType);
            }

            // 콘텐츠 로드
            contentLoader.loadForTab(tabType);
        },

        /**
         * 탭 UI 업데이트
         * @param {string} activeTab - 활성화할 탭
         */
        updateTabUI: (activeTab) => {

            document.querySelectorAll('#mainTabNavigation a').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('#subTabNavigation a').forEach(subtab => {
                subtab.classList.remove('active');
            });
            const targetTab = document.querySelector(`[data-tab="${activeTab}"]`);
            if (targetTab) {
                if(activeTab == 'bb' || activeTab == 'bc' || activeTab == 'bs'){

                    const bb_targetTab = document.querySelector(`[data-tab="bb"]`);
                    bb_targetTab.classList.add('active');
                    const subTabNavigation = document.getElementById(`subTabNavigation`);
                    subTabNavigation.style.display = 'block';

                    let subactiveTab = 'bc';
                    if(activeTab == 'bs'){
                        subactiveTab  = 'bs';
                    }
                    const subtargetTab = document.querySelector(`[data-tab="${subactiveTab}"]`);
                    subtargetTab.classList.add('active');

                }else{
                    targetTab.classList.add('active');

                    const subTabNavigation = document.getElementById(`subTabNavigation`);
                    subTabNavigation.style.display = 'none';
                }
                document.querySelector('.search_input_container input[name="tab"]').value = activeTab;
            }
        },

        /**
         * 탭 이벤트 바인딩
         */
        bindEvents: () => {
            document.querySelectorAll('#mainTabNavigation a').forEach(tab => {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    tabControl.switchMainTab(this.dataset.tab);
                });
            });
            document.querySelectorAll('#subTabNavigation a').forEach(tab => {
                tab.addEventListener('click', function(e) {
                    e.preventDefault();
                    tabControl.switchMainTab(this.dataset.tab);
                });
            });
        }
    };

    /**
     * 카테고리 관련 함수들
     */
    const categoryControl = {
        /**
         * 카테고리 전환 처리
         * @param {string} categoryCode - 카테고리 코드
         */
        switchCategory: (categoryCode) => {
            if (state.currentCategory === categoryCode) return;

            state.currentCategory = categoryCode;

            console.log(`카테고리 변경: ${categoryCode} (${state.currentTab} 탭)`);

            //uiControl.removeSeriesContentStructure();
            utils.resetState();

            // 카테고리 UI 업데이트
            categoryControl.updateCategoryUI(categoryCode);
            urlUtils.updateUrl(state.currentTab, state.currentCategory);

            // 해당 탭의 카테고리별 콘텐츠 로드
            contentLoader.loadForCategory(state.currentTab, categoryCode);
        },

        /**
         * 카테고리 UI 업데이트
         * @param {string} activeCategory - 활성화할 카테고리
         */
        updateCategoryUI: (activeCategory) => {
            document.querySelectorAll('#categoryNavigation a').forEach(cat => {
                cat.classList.remove('active');
            });
            const targetCategory = document.querySelector(`[data-category="${activeCategory}"]`);
            if (targetCategory) {
                targetCategory.classList.add('active');
            }
        },

        /**
         * 카테고리 네비게이션 업데이트
         * @param {string} tabType - 탭 타입
         */
        updateNavigation: (tabType) => {
            if (!state.allCategoriesData || !state.allCategoriesData[tabType]) {
                console.error('카테고리 데이터가 없습니다:', tabType);
                return;
            }

            const categoryNav = document.getElementById('categoryNavigation');
            if (!categoryNav) {
                console.error('categoryNavigation 요소를 찾을 수 없습니다');
                return;
            }

            const categories = state.allCategoriesData[tabType].categories;

            console.log(`${tabType} 탭의 카테고리 업데이트:`, categories);

            //uiControl.removeSeriesContentStructure();


            categoryNav.innerHTML = categories.map(category =>
                `<a href="javascript:void(0)" class="${category.data === state.currentCategory ? 'active' : ''}" data-category="${category.data}">${category.name}</a>`
            ).join('');


            const categoryScroller = document.getElementById('categoryScroller');

            const categoryDefault = `<li>카테고리</li>`;

            const categoryAdd =  categories.map(category =>
                `<li><a href="javascript:void(0)" class="${category.data === state.currentCategory ? 'active' : ''}" data-category="${category.data}">${category.name}</a></li>`
            ).join('');

            categoryScroller.innerHTML = categoryDefault + categoryAdd;

            // 카테고리 클릭 이벤트 재바인딩
            categoryControl.bindEvents();
        },

        /**
         * 카테고리 이벤트 바인딩
         */
        bindEvents: () => {
            document.querySelectorAll('#categoryNavigation a').forEach(cat => {
                cat.addEventListener('click', function(e) {
                    e.preventDefault();
                    const categoryCode = this.dataset.category;
                    console.log('카테고리 클릭:', categoryCode);
                    categoryControl.switchCategory(categoryCode);
                });
            });

            //dewbian 추가
            const $panel = document.getElementById('category_toggle_navigation');
            const $openBtn = document.querySelector('.btn_category_toggle');
            const $closeBtn= document.querySelector('.btn_category_closed');
            const $topNav  = document.querySelector('.category_navigation');
            // 열기/닫기
            const open  = () => $panel.classList.add('active');
            const close = () => $panel.classList.remove('active');

            $openBtn.addEventListener('click', open);
            $closeBtn.addEventListener('click', close);



            $panel.addEventListener('click', (e) => {
                const a = e.target.closest('a[data-category]');

                const categoryCode = a.dataset.category;
                console.log('카테고리 클릭:', categoryCode);
                if (!a) return;
                // 상단 탭 active 동기화(페이지 이동 없을 때에도 대비)
                if ($topNav) {
                    $topNav.querySelectorAll('a[data-category]').forEach(el => {
                        const on = el.dataset.category === a.dataset.category;
                        el.classList.toggle('active', on);
                        if (on) el.setAttribute('aria-current', 'page');
                        else el.removeAttribute('aria-current');
                    });
                }

                categoryControl.switchCategory(categoryCode);


                close(); // 패널 닫기
                // setTimeout(() => {
                //     window.location.href = a.href;
                // }, 300); // 애니메이션 시간에 맞춰 조정
            }, { passive: true });

        },

        /**
         * 카테고리 데이터 로드
         */
        loadAll: async () => {
            try {
                const response = await fetch('/api/categories');
                const data = await response.json();

                if (data) {
                    state.allCategoriesData = data;
                    categoryControl.updateNavigation(state.currentTab);
                }
            } catch (error) {
                console.error('카테고리 로드 오류:', error);
            }
        }
    };

    /**
     * UI 조작 관련 함수들
     */
    const uiControl = {
        /**
         * 검색 결과 개수 업데이트
         * @param {Object} data - API 응답 데이터
         */
        updateResultsCount: (data) => {
            const resultsCount = document.querySelector('.total_posts');
            if (!resultsCount) return;

            const totalCount = data?.data?.meta?.total_count || data?.meta?.total_count || data?.total || 0;
            resultsCount.innerHTML = `검색결과 <b>${totalCount}</b> 개`;
        },

        /**
         * 더보기 버튼 상태 업데이트
         * - 1페이지에서만 표시, 2페이지부터는 무한스크롤 사용
         */
        updateViewMoreButton: () => {
            const container = document.querySelector('.btn_view_more_container');
            const button = document.querySelector('.btn_view_more');

            if (!container || !button) return;

            // 2페이지부터는 더보기 버튼 숨김 (무한스크롤 사용)
            if (state.currentPage >= 2 || !state.hasMorePages) {
                container.style.display = 'none';
            } else {
                container.style.display = 'flex';
                button.disabled = false;
                button.textContent = '더 보기';
            }
        },

        /**
         * 로딩 상태 토글
         * @param {boolean} loading - 로딩 중 여부
         */
        toggleLoadingState: (loading) => {
            const button = document.querySelector('.btn_view_more');
            const contentContainer = document.querySelector('.list_contents');

            if (button && state.currentPage === 1) {
                if (loading) {
                    button.disabled = true;
                    button.textContent = '로딩 중...';
                } else {
                    button.disabled = false;
                    button.textContent = '더 보기';
                }
            }

            if (contentContainer) {
                contentContainer.style.opacity = loading ? '0.5' : '1';
            }
        },

        /**
         * 에러 표시
         * @param {string} message - 에러 메시지
         */
        showError: (message) => {
            console.error(message);
            // 필요시 토스트 메시지 표시 로직 추가
        },

        /**
         * bb 탭용 시리즈 콘텐츠 구조 삽입
         */
        insertSeriesContentStructure: () => {
            document.getElementById('subTabNavigation').style.display = 'flex';
            // const totalPosts = document.querySelector('.total_posts');
            //
            // if (totalPosts) {
            //     document.getElementById('add_series_title').style.display = 'flex';
            //     document.getElementById('add_series_list').style.display = 'flex';
            //     document.getElementById('add_contents_title').style.display = 'flex';
            // //     const htmlStructure = `
            // //     <h3 class="search_cate" id="add_series_title">시리즈</h3>
            // //     <ul role="list" class="list_contents" id="add_series_list"></ul>
            // //     <h3 class="search_cate" id="add_contents_title">콘텐츠</h3>
            // // `;
            // //    totalPosts.insertAdjacentHTML('afterend', htmlStructure);
            // }
        },

        /**
         * 시리즈 콘텐츠 구조 제거
         */
        removeSeriesContentStructure: () => {
            document.getElementById('subTabNavigation').style.display = 'none';
            // const elementsToRemove = [
            //     document.getElementById('add_series_list'),
            //     document.getElementById('add_series_title'),
            //     document.getElementById('add_contents_title')
            // ];
            //
            // elementsToRemove.forEach(element => {
            //     if (element) {
            //         //element.remove();
            //         element.style.display = 'none';
            //         console.log('시리즈 관련 요소 제거됨:', element.id);
            //     }
            // });
        }
    };

    /**
     * 콘텐츠 로드 관련 함수들
     */
    const contentLoader = {
        /**
         * 공통 콘텐츠 로드 함수
         * @param {string} url - API URL
         * @param {string} tabType - 탭 타입
         * @param {boolean} resetPage - 페이지 리셋 여부
         */
        loadContent: (url, tabType, resetPage = true) => {
            if (state.isLoading) return;

            state.isLoading = true;
            uiControl.toggleLoadingState(true);

            fetch(url)
                .then(response => response.json())
                .then(data => {
                    console.log(`${tabType} 콘텐츠 로드 완료:`, data);

                    // 페이지네이션 정보 업데이트
                    const pagination = data?.data?.pagination || data?.pagination || {};
                    state.currentPage = pagination.current_page || state.currentPage;
                    state.totalPages = pagination.last_page || pagination.total_pages || 1;
                    state.hasMorePages = pagination.has_more_pages || (state.currentPage < state.totalPages);

                    // 결과 개수 업데이트
                    uiControl.updateResultsCount(data);

                    // 콘텐츠 렌더링
                    if (resetPage) {
                        contentRenderer.renderContent(data, tabType);
                    } else {
                        contentRenderer.appendContent(data, tabType);
                    }

                    // 더보기 버튼 상태 업데이트
                    uiControl.updateViewMoreButton();

                    // 무한 스크롤 활성화 (2페이지부터)
                    if (state.currentPage === 2 && !state.isInfiniteScrollActive) {
                        state.isInfiniteScrollActive = true;
                        scrollControl.initInfiniteScroll();
                    }
                })
                .catch(error => {
                    console.error('콘텐츠 로드 오류:', error);
                    uiControl.showError('데이터를 불러오는데 실패했습니다.');
                })
                .finally(() => {
                    state.isLoading = false;
                    uiControl.toggleLoadingState(false);
                });
        },

        /**
         * 탭별 콘텐츠 로드
         * @param {string} tabType - 탭 타입
         * @param {boolean} resetPage - 페이지 리셋 여부
         */
        loadForTab: (tabType, resetPage = true) => {
            console.log(`${tabType} 탭 콘텐츠 로드 중...`);

            if (resetPage) {
                utils.resetState();
            }

            const url = urlUtils.buildApiUrl(tabType, state.currentCategory, state.currentPage);
            contentLoader.loadContent(url, tabType, resetPage);
        },

        /**
         * 카테고리별 콘텐츠 로드
         * @param {string} tabType - 탭 타입
         * @param {string} categoryCode - 카테고리 코드
         */
        loadForCategory: (tabType, categoryCode) => {
            console.log(`${tabType} 탭의 ${categoryCode} 카테고리 콘텐츠 로드 중...`);

            utils.resetState();
            const url = urlUtils.buildApiUrl(tabType, categoryCode, state.currentPage);
            contentLoader.loadContent(url, tabType, true);
        },

        /**
         * 다음 페이지 로드
         */
        loadNextPage: () => {
            if (state.currentPage >= state.totalPages || state.isLoading) {
                return;
            }

            state.currentPage += 1;
            const url = urlUtils.buildApiUrl(state.currentTab, state.currentCategory, state.currentPage);
            contentLoader.loadContent(url, state.currentTab, false);
        }
    };

    /**
     * 콘텐츠 렌더링 관련 함수들
     */
    const contentRenderer = {
        /**
         * 메인 콘텐츠 렌더링 (첫 페이지)
         * @param {Object} data - API 응답 데이터
         * @param {string} tabType - 탭 타입
         */
        renderContent: (data, tabType) => {

            console.log(`${tabType} 콘텐츠 렌더링:`, data);

            //const $contentContainer = document.querySelector('.list_contents');
            const $contentContainer = document.getElementById('origin_list');

            if (!$contentContainer) {
                console.error('list_contents 컨테이너를 찾을 수 없습니다');
                return;
            }

            // 빈 데이터 처리
            const items = data?.data?.items || data?.items || data?.posts || data || [];
            if (!items || items.length === 0) {
                document.getElementById('bbb_empty_container').style.display = 'block';
                $contentContainer.innerHTML = '';
                //$contentContainer.innerHTML = '<li class="nodata">검색 결과가 없습니다.</li>';
                return;
            }

            let renderedHTML = '';

            // bb 탭은 시리즈 데이터 처리가 필요
            if (tabType === 'bb' || tabType === 'bc' ||  tabType === 'bs' ) {
                uiControl.insertSeriesContentStructure();
                // 시리즈 데이터 처리
                // if (data?.series?.items && data.series.meta.total_count > 0) {
                //     uiControl.insertSeriesContentStructure();
                //     // const seriesContainer = document.getElementById('add_series_list');
                //     // if (seriesContainer) {
                //     //     const seriesHTML = data.series.items.map(item =>
                //     //         cardTemplates.seriesCard(item, 'card_175_262')
                //     //     ).join('');
                //     //     seriesContainer.innerHTML = seriesHTML;
                //     //     //시리즈 컨테이너의 레이지 로딩 적용
                //     //     if (state.lazy?.refresh) {
                //     //         state.lazy.refresh(seriesContainer);
                //     //     }
                //     // } else {
                //     //     console.error('add_series_list 컨테이너를 찾을 수 없습니다');
                //     // }
                // } else {
                //     console.log('시리즈 데이터가 없습니다');
                //     uiControl.removeSeriesContentStructure();
                // }

                // bb 탭 일반 콘텐츠 렌더링
                if(tabType === 'bs'){

                    renderedHTML = items.map(item =>
                        cardTemplates.seriesCard (item, 'full')
                    ).join('');

                }else{

                    renderedHTML = items.map(item =>
                        cardTemplates.contentCard_home(item, 'full')
                    ).join('');
                }
            } else {
                uiControl.removeSeriesContentStructure();
                // 다른 탭들의 콘텐츠 렌더링
                switch(tabType) {
                    case 'hb':
                        renderedHTML = items.map(item =>
                            cardTemplates.haebomCard(item, 'half')
                        ).join('');
                        break;
                    case 'gb':
                        renderedHTML = items.map(item => cardTemplates.gabomCard_02(item, 'half')).join('');
                        break;
                    case 'sb':
                        renderedHTML = items.map(item =>
                            cardTemplates.sabomCard(item, 'half')
                        ).join('');
                        break;
                    default:
                        renderedHTML = items.map(item =>
                            cardTemplates.contentCard_home(item, 'full')
                        ).join('');
                }
            }

            // 컨테이너에 렌더링된 HTML 삽입
            $contentContainer.innerHTML = renderedHTML;

            const search_Container = document.querySelector('.search_container');
            state.lazy.refresh(search_Container);
            // if (state.lazy?.refresh) {
            //     state.lazy.refresh($contentContainer);
            //     console.log("레이지 된거지?? ")
            // }
        },

        /**
         * 콘텐츠 추가 (2페이지 이후 무한스크롤용)
         * @param {Object} data - API 응답 데이터
         * @param {string} tabType - 탭 타입
         */
        appendContent: (data, tabType) => {
            console.log(`${tabType} 콘텐츠 추가:`, data);

            // 시리즈 리스트가 아닌 메인 콘텐츠 컨테이너 선택
            const contentContainer = document.querySelector('.list_contents:not(#add_series_list)');
            if (!contentContainer) {
                console.error('list_contents 컨테이너를 찾을 수 없습니다');
                return;
            }

            const items = data?.data?.items || data?.items || data?.posts || data || [];
            if (!items || items.length === 0) {
                return;
            }

            let renderedHTML = '';

            // 탭별 카드 템플릿 적용
            if (tabType === 'bb') {
                renderedHTML = items.map(item =>
                    cardTemplates.contentCard_home(item, 'full')
                ).join('');
            } else {
                switch(tabType) {
                    case 'hb':
                        renderedHTML = items.map(item =>
                            cardTemplates.haebomCard(item, 'full')
                        ).join('');
                        break;
                    case 'gb':
                        renderedHTML = items.map(item =>
                            cardTemplates.gabomCard_02(item, 'full')
                        ).join('');
                        break;
                    case 'sb':
                        renderedHTML = items.map(item =>
                            cardTemplates.sabomCard(item, 'full')
                        ).join('');
                        break;
                    default:
                        renderedHTML = items.map(item =>
                            cardTemplates.contentCard_home(item, 'full')
                        ).join('');
                }
            }

            // 기존 콘텐츠 뒤에 HTML 추가
            contentContainer.insertAdjacentHTML('beforeend', renderedHTML);

            // 새로 추가된 이미지들에 대해 레이지 로딩 적용
            if (state.lazy?.refresh) {
                console.log("추가 콘텐츠 레이지 로딩 새로고침");
                state.lazy.refresh(contentContainer);
            }
        }
    };

    /**
     * 스크롤 제어 관련 함수들
     */
    const scrollControl = {
        /**
         * 더보기 버튼 이벤트 초기화
         */
        initViewMoreButton: () => {
            const button = document.querySelector('.btn_view_more');
            if (!button) return;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                contentLoader.loadNextPage();
            });
        },

        /**
         * 무한 스크롤 초기화
         * - 2페이지부터 활성화되어 자동으로 다음 페이지를 로드
         */
        initInfiniteScroll: () => {
            // 기존 observer 정리
            utils.cleanupObserver();
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
            const listContainer = document.querySelector('.list_contents');
            if (listContainer?.parentElement) {
                const parent = listContainer.parentElement;

                // 부모 요소가 static position이면 relative로 변경
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

                        console.log(`무한 스크롤 트리거: ${state.currentPage + 1}페이지 로드`);
                        contentLoader.loadNextPage();
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0
            });

            // 센티넬 요소 관찰 시작
            if (state.sentinel) {
                state.observer.observe(state.sentinel);
            }
        }
    };

    /**
     * 전체 시스템 초기화
     */
    const systemInit = {
        /**
         * 탭 시스템 초기화
         */
        initializeTabSystem: () => {
            // URL에서 초기 상태 설정
            urlUtils.initializeFromUrl();

            // 초기 탭 UI 설정
            tabControl.updateTabUI(state.currentTab);

            // 이벤트 바인딩
            tabControl.bindEvents();
            categoryControl.bindEvents();
            scrollControl.initViewMoreButton();

            // 카테고리 데이터 로드 후 초기 콘텐츠 로드
            categoryControl.loadAll().then(() => {
                contentLoader.loadForTab(state.currentTab);
            });
        },

        /**
         * 메인 초기화 함수
         */
        initialize: async () => {
            // 레이지 로더 초기화
            initLazyLoader();

            // 캡처/스크랩 기능 초기화
            bindCaptureToast({
                bindClick: false,
                listen: true,
                getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
                //getText: (_btn, next) => next ? '스크랩되었습니다.' : '취소되었습니다.',
            });

            bindCaptureToggle({
                endpoint: '/api/capture',
                goLogin: typeof goLogin !== 'undefined' ? goLogin : () => console.warn('goLogin 함수가 정의되지 않았습니다'),

                onToggleStart: (btn, { prev, next, postId, boardType }) => {
                    if (typeof isLogin !== 'undefined' && !isLogin) {
                        throw new Error('Login required');
                    }
                },
            });

            // 검색 핸들러 초기화
            initSearchHandler({
                activateOnLoad: true,
                prefillFromURL: true,
                closeButtonDeactivatesForm: false
            });

            // 탭 시스템 초기화
            systemInit.initializeTabSystem();
        },

        /**
         * 리소스 정리
         */
        destroy: () => {
            utils.cleanupObserver();
        }
    };

    /**
     * 디버깅용 함수들
     */
    const debug = {
        /**
         * 현재 상태 확인 (개발자 도구용)
         * @returns {Object} - 현재 상태 정보
         */
        getCurrentState: () => {
            return {
                tab: state.currentTab,
                category: state.currentCategory,
                searchKeyword: state.searchKeyword,
                currentPage: state.currentPage,
                totalPages: state.totalPages,
                hasMorePages: state.hasMorePages,
                isLoading: state.isLoading,
                isInfiniteScrollActive: state.isInfiniteScrollActive,
                tabData: state.allCategoriesData ? state.allCategoriesData[state.currentTab] : null
            };
        }
    };

    // 개발자 도구용 전역 함수 등록
    window.debugSearch = {
        current: debug.getCurrentState,
        switchTab: tabControl.switchMainTab,
        switchCategory: categoryControl.switchCategory,
        categories: () => state.allCategoriesData,
        loadNext: contentLoader.loadNextPage,
        state: () => state
    };

    // 외부 API 반환
    return {
        init: systemInit.initialize,
        destroy: systemInit.destroy
    };
})();

// DOM 로드 완료 시 컨트롤러 초기화
document.addEventListener('DOMContentLoaded', searchController.init);
