import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {countVisualSlider} from "../../utils/sliderController.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc, discountPercent} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {showInformation} from "../common/footer.js";
import {renderCategoryNavigation} from "../../utils/renderCategoryNvigation.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {allmenu} from "../common/allmenu.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {initCategoryToggleNav} from "../../utils/contentsCategory.js";
import {wheelCustom} from "../../utils/horizontalScroll.js";
import {cardTemplates} from "../../utils/renderCardTemplate.js";

const haebomSubMainController = (()=>{

    const state = {
        lazy: null, // 여기서 lazy 인스턴스 관리
        currentSort: 'newest',
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        isInfiniteScrollActive: false,
        observer: null,
        sentinel: null,
        isGroupMode: false,
        groupTitle: null
    };

    const config = {
        API_BASE: '/api/hbList',
        CARD_TYPES: {
            SHOP: 'shop_174_174',
            CONTENT: 'card_174_174'
        }
    };

    const lazyLoader = ()=>{
        // state.lazy에 할당하도록 수정
        state.lazy = createLazyLoader({
            // selector: '.lazy_loading_container img[data-src]',
            // root: null,
            // rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad:  (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        state.lazy.init();
    }

    const renderCarousel = ()=>{
        const DATA_URL = '/api/banners?type=hbm';
        const $container = document.querySelector('.sub_visual_container');
        if (!$container) return;

        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderContent(data?.data || []);
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.swiper-wrapper');
                if (!$list) return;

                // S : dewbian 배너데이터가 없으면 섹션 숨김
                if(items.length < 1){
                    $container.style.display = "none";
                    return;
                }
                $container.style.display = "block";
                // E : dewbian 배너데이터가 없으면 섹션 숨김

                const contents = items.map((item) => `
                    <div class="swiper-slide slider">
                        <a href="${item.target_url}" target="${item.target}">
                            <div class="slider_thumbnail_container">
                                <img src="${item.banner}" alt="${item.title}">
                            </div>
                        </a>
                    </div>
                `).join('');

                $list.innerHTML = contents;

                countVisualSlider();
            },
        };

        methods.requestAPI();
    }
    const renderBanner = () => {
        const DATA_URL = '/api/banners?type=hbb';
        const $container = document.querySelector('.banner_container');
        if (!$container) return;

        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderContent(data?.data || []);
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.swiper-wrapper');
                if (!$list) return;

                // S : dewbian 배너데이터가 없으면 섹션 숨김
                if(items.length < 1){
                    $container.style.display = "none";
                    return;
                }
                $container.style.display = "block";
                // E : dewbian 배너데이터가 없으면 섹션 숨김

                const contents = items.map((item) => `
                    <div class="swiper-slide slider">
                        <a href="${item.target_url}" target="${item.target}">
                            <div class="slider_thumbnail_container">
                                <img src="${item.banner}" alt="${item.title}">
                            </div>
                        </a>
                    </div>
                `).join('');

                $list.innerHTML = contents;

                countVisualSlider();
            },
        };

        methods.requestAPI();
    }

    const groupHaebomContents = async () => {
        const methods = {
            requestAPI: async () => {
                try {
                    // API 호출
                    const response = await fetch('/api/bbH0100', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`API 호출 실패: ${response.status}`);
                    }

                    const data = await response.json();
                    methods.renderContent(data);

                } catch (err) {
                    console.error('해봄 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent({});
                }
            },

            renderContent: (data = {}) => {
                // 모든 list_container 요소들 가져오기
                //const $listContainers = document.querySelectorAll('.list_container');
                const $listContainers = document.querySelectorAll('.list_container:not(.list_newest)');

                const $subVisual = document.querySelector('.sub_visual_container .swiper-wrapper');

                // 먼저 모든 컨테이너 숨기기
                $listContainers.forEach(container => {
                    container.style.display = 'none';
                });

                // 데이터를 배열로 변환하고 정렬 (키 순서대로)
                const sortedData = Object.keys(data)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(key => data[key]);

                // 모든 그룹을 하나의 배열로 수집
                const allGroups = [];
                sortedData.forEach(content => {
                    content.groups.forEach(group => {
                        allGroups.push({
                            ...group,
                            vtype: content.vtype // 그룹에 vtype 추가
                        });
                    });
                });

                // 아이템이 있는 그룹들만 필터링
                const validGroups = allGroups.filter(group => group.items && group.items.length > 0);

                // 나머지 그룹들을 list_container에 순차적으로 할당
                validGroups.slice(0).forEach((group, index) => {
                    const $container = $listContainers[index];

                    if ($container) {
                        // 컨테이너 표시
                        $container.style.display = 'block';

                        // 타이틀 설정
                        const $title = $container.querySelector('.title_container .title');
                        if ($title) {
                            //$title.innerHTML = group.group_info.title;
                            const formattedTitle = group.group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
                            $title.innerHTML = formattedTitle;
                        }

                        // S : dewbian 그룹 더보기 하이퍼링크 변경
                        const viewMoreBtn = $container.querySelector('.btn_view_more');
                        viewMoreBtn.style.display = 'block';
                        if (viewMoreBtn) {
                            viewMoreBtn.href = '/hbl?group='+group.group_info.gidx;
                        }
                        // E : dewbian 그룹 더보기 하이퍼링크 변경

                        // 리스트 타입에 따라 렌더링
                        const $horizontalList = $container.querySelector('.list_horizontal');
                        const $doubleRowList = $container.querySelector('.list_small');
                        const $contentsList = $container.querySelector('.list_contents');

                        if ($horizontalList) {
                            methods.renderHorizontalList($horizontalList, group);
                        } else if ($doubleRowList) {
                            methods.renderDoubleRowList($doubleRowList, group);
                        } else if ($contentsList) {
                            methods.renderContentsList($contentsList, group);
                        }
                    }
                });
            },

            // 가로 리스트 렌더링
            renderHorizontalList: ($container, group) => {
                const items = group.items || [];
                const contents = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');

                $container.innerHTML = contents;
                if (state.lazy?.refresh) { state.lazy.refresh($container); }
            },


            renderSmallList: ($container, group) => {
                const items = group.items || [];

                const contents = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');

                $container.innerHTML = contents;
                if (state.lazy?.refresh) { state.lazy.refresh($container); }
            },


            // 더블 로우 리스트 렌더링
            renderDoubleRowList: ($container, group) => {
                const items = group.items || [];
                const contents = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');

                $container.innerHTML = `
        <div class="row">${topRowRender}</div>
        <div class="row">${bottomRowRender}</div>
    `;
                if (state.lazy?.refresh) { state.lazy.refresh($container); }
            },

        // 콘텐츠 리스트 렌더링
            renderContentsList: ($container, group) => {
                const items = group.items || [];

                const contents = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');

                $container.innerHTML = contents;
                if (state.lazy?.refresh) { state.lazy.refresh($container); }
            }
        };

        // 초기화
        methods.requestAPI();
    };




// 할인율 계산 함수
    const calculateDiscountRate = (originalPrice, discountPrice) => {
        if (!originalPrice || !discountPrice) return 0;

        const original = parseInt(originalPrice.replace(/,/g, ''));
        const discount = parseInt(discountPrice.replace(/,/g, ''));

        if (original <= discount) return 0;

        return Math.ceil(((original - discount) / original) * 100);
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

        // API URL 빌드 함수 - dewbian
        buildApiUrl: (category,  sort = null, page = 1) => {
            const params = new URLSearchParams();

            // group이 있으면 group 우선, 없으면 category - dewbian
            // if (group) {
            //     params.set('group', group);
            // } else if (category && category !== 'all') {
            //     params.set('category', category);
            // }

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

            const category = '';
            const url = utils.buildApiUrl(category, state.currentSort, state.currentPage);

            console.log(`상품 로드: ${url} (그룹모드: ${state.isGroupMode})`);
            const data = await api.fetchData(url);

            if (!data) return;

            // 그룹 타이틀 업데이트 (첫 페이지에서만) - dewbian
            utils.updateGroupTitle(data);

            // 다양한 응답 구조 지원 - dewbian
            const items = data?.data?.items || data?.items || data?.posts || data || [];
            const pagination = data?.data?.pagination || data?.pagination || {};

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
        getContainer: () => document.querySelector('.list_container .list_contents.list_newest'),

        // 콘텐츠 렌더링 (새로고침) - dewbian
        render: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 빈 데이터 처리 - dewbian
            if (!items || items.length === 0) {
                content.showEmptyState();
                return;
            }

            // 상품 카드 템플릿 사용하여 HTML 생성 - dewbian
            const html = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');
            container.innerHTML = html;
            // 직접 templates 객체 사용도 가능

            // 레이지 로더 새로고침 - dewbians
            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        // 콘텐츠 추가 (무한 스크롤용) - dewbian
        append: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 상품 카드 템플릿 사용하여 HTML 생성 - dewbian
            const html = items.map(item => cardTemplates.haebomCard(item, 'half')).join('');
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
            const button = document.querySelector('.btn_view_more.list_newest');

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
            const button = document.querySelector('.btn_view_more.list_newest');
            if (!button) return;

            if (loading && state.currentPage === 1) {
                button.style.display = 'none';
                // button.disabled = true;
                // button.textContent = '로딩 중...';
            } else if (!loading && state.currentPage === 1) {
                button.style.display = 'block';
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


    // 스크롤 관련 기능들 - dewbian
    const scroll = {
        // 더보기 버튼 초기화 - dewbian
        initViewMoreButton: () => {
            const button = document.querySelector('.btn_view_more.list_newest');
            if (!button) {
                return;
            }

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


    const initialize = ()=>{
        renderCategoryNavigation('/api/hbCategory');
        renderCarousel();
        renderBanner();
        groupHaebomContents();
        lazyLoader();
        showInformation();


        // S : dewbian 무한스크롤페이지
        api.loadContent();
        scroll.initViewMoreButton();
        // E : dewbian 무한스크롤페이지


        bindCaptureToast({
            bindClick: false,
            listen: true,
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
        initCategoryToggleNav({dataUrl:"/api/hbCategory"})
        //renderAllSlots.forEach(fn=> fn())
        wheelCustom();
    }
    return {
        init : initialize,
    }

})();

document.addEventListener('DOMContentLoaded', haebomSubMainController.init);
