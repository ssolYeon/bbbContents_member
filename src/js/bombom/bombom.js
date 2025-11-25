import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {countVisualSlider} from "../../utils/sliderController.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {showInformation} from "../common/footer.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {allmenu} from "../common/allmenu.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {cardTemplates} from "../../utils/renderCardTemplate.js";

const bombomController = (()=>{


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
        API_BASE: '/api/bcList',
        CARD_TYPES: {
            SHOP: 'shop_174_174',
            CONTENT: 'card_174_174'
        }
    };


    const lazyLoader = ()=>{
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

    const renderBannerBCM = () => {
        const DATA_URL = '/api/banners?type=bcm';
        const $container = document.querySelector('.sub_visual_container');
        if (!$container) return;
        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderContent(data?.data || []);
                } catch (err) {
                    console.error('봄봄 메인 상단 배너 로드 실패:', err);
                }
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.swiper-wrapper');
                if (!$list) return;

                // 배너 데이터가 없으면 섹션 숨김
                if(items.length < 1){
                    $container.style.display = "none";
                    return;
                }
                $container.style.display = "block";

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

    const renderBannerBCB = () => {
        const DATA_URL = '/api/banners?type=bcb';
        const $container = document.querySelector('.banner_container');
        if (!$container) return;

        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderContent(data?.data || []);
                } catch (err) {
                    console.error('봄봄 메인 하단 배너 로드 실패:', err);
                }
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.swiper-wrapper');
                if (!$list) return;

                // 배너 데이터가 없으면 섹션 숨김
                if(items.length < 1){
                    $container.style.display = "none";
                    return;
                }
                $container.style.display = "block";

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

    // 통합 데이터 처리 함수
    const loadUnifiedContent = async () => {
        const API_URL = '/api/bbC0100';

        try {
            const data = await requestJson(API_URL);

            // 데이터를 섹션별로 분류하여 렌더링
            renderSections(data);

        } catch (err) {
            console.error('봄봄 데이터 로드 실패:', err);
        }
    };

    // 섹션별 렌더링 함수
    const renderSections = (data) => {
        const sections = [
            {
                container: '.bombom_contents_container',
                targetVtype: 'bch', // 콘텐츠 가로형
                renderType: 'content'
            },
            {
                container: '.bombom_series_container',
                targetVtype: 'bsv', // 시리즈 세로형
                renderType: 'series'
            },
            {
                container: '.bombom_contents_custom_container',
                targetVtype: 'bch', // 커스텀 콘텐츠 (두 번째 bch)
                renderType: 'content'
            }
        ];

        let bchCount = 0; // bch 타입 카운터

        sections.forEach((section, index) => {


            const $container = document.querySelector(section.container);
            if (!$container) return;
            // 해당 섹션에 맞는 데이터 찾기
            const sectionData = findSectionData(data, section.targetVtype, bchCount);

            if (section.targetVtype === 'bch') {
                bchCount++; // bch 타입일 때마다 카운터 증가
            }

            if (sectionData && sectionData.items && sectionData.items.length > 0) {



                // 데이터가 있으면 섹션 표시하고 렌더링
                $container.style.display = '';
                renderTitle(sectionData.title, $container);



                if (section.renderType === 'series') {

                    // S : dewbian 그룹 더보기 하이퍼링크 변경
                    const viewMoreBtn = $container.querySelector('.btn_view_more');
                    viewMoreBtn.style.display = 'block';
                    if (viewMoreBtn) {
                        viewMoreBtn.href = '/bs?group='+sectionData.gidx;
                    }
                    // E : dewbian 그룹 더보기 하이퍼링크 변경


                    renderSeriesContent(sectionData.items, $container);
                } else {

                    // S : dewbian 그룹 더보기 하이퍼링크 변경
                    const viewMoreBtn = $container.querySelector('.btn_view_more');
                    viewMoreBtn.style.display = 'block';
                    if (viewMoreBtn) {
                        viewMoreBtn.href = '/bc?group='+sectionData.gidx;
                    }
                    // E : dewbian 그룹 더보기 하이퍼링크 변경

                    renderContentItems(sectionData.items, $container);
                }
            } else {
                // 데이터가 없으면 섹션 숨기기
                $container.style.display = 'none';
            }
        });
    };

    // 섹션에 맞는 데이터 찾기
    const findSectionData = (data, targetVtype, bchIndex = 0) => {
        // data가 없거나 빈 객체인 경우 처리
        if (!data || Object.keys(data).length === 0) {
            return null;
        }

        const groups = Object.values(data);

        if (targetVtype === 'bsv') {
            // bsv 타입 찾기
            const bsvGroup = groups.find(group => group.vtype === 'bsv');
            if (bsvGroup && bsvGroup.groups && bsvGroup.groups[0]) {
                return {
                    title: bsvGroup.groups[0].group_info?.title || '',
                    gidx: bsvGroup.groups[0].group_info?.gidx || '',
                    items: bsvGroup.groups[0].items || []
                };
            }
        } else if (targetVtype === 'bch') {
            // bch 타입 찾기 (순서대로)
            const bchGroups = groups.filter(group => group.vtype === 'bch');
            if (bchGroups[bchIndex] && bchGroups[bchIndex].groups && bchGroups[bchIndex].groups[0]) {
                return {
                    title: bchGroups[bchIndex].groups[0].group_info?.title || '',
                    gidx: bchGroups[bchIndex].groups[0].group_info?.gidx || '',
                    items: bchGroups[bchIndex].groups[0].items || []
                };
            }
        }

        return null;
    };

    // 데이터 없음 메시지 렌더링
    const renderNoData = ($container) => {
        const $list = $container.querySelector('.list_contents');
        if (!$list) return;

        $list.innerHTML = '<li class="nodata">콘텐츠가 없습니다.</li>';

        // 더보기 버튼 숨기기
        const $btnContainer = $container.querySelector('.btn_view_more_container');
        if ($btnContainer) {
            $btnContainer.style.display = 'none';
        }
    };

    // 제목 렌더링
    const renderTitle = (title, $container) => {
        const $title = $container.querySelector('.title_container .title');
        if ($title) {
            $title.innerHTML = title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>') || '';
        }

    };

    // 콘텐츠 아이템 렌더링
    const renderContentItems = (items = [], $container) => {
        const $list = $container.querySelector('.list_contents');
        if (!$list) return;

        const contents = items.map(item => cardTemplates.contentCard(item, 'full')).join('');

        $list.innerHTML = contents;
        state.lazy.refresh($list);
    };

    // 시리즈 아이템 렌더링
    const renderSeriesContent = (items = [], $container) => {
        const $list = $container.querySelector('.list_contents');
        if (!$list) return;

        const contents = items.map((item) => `
          <li class="series_card full">
                <div class="thumbnail">
                  <a href="${item.detail_url || '#'}">
                  <picture class="lazy_loading_container">
                    <img
                      data-src="${item.thumbnail || ''}"
                      alt="${escapeHtml(item.title || '')}"
                      width="361"
                      height="481"
                      loading="lazy"
                    >
                  </picture>
                  <div class="card_top_marker">
                    ${renderCategory(item.category || '')}
                  </div>
                  <div class="component_information_container">
                      <p class="card_title text_ellipsis_2">${escapeHtml(item.title || '')}</p>
                      <p class="card_description text_ellipsis_2">${escapeHtml(item.description || '')}</p>
                      <div class="card_tag_container">${renderTag(item.tag || [])}</div>
                      <div class="card_count_posts">총 콘텐츠 <b>${item.contents_cnt || 0}</b>개</div>
                  </div>
                </a>
                <button type="button"
                      class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                      data-post-id="${item.id || ''}"
                      data-board-type="${item.board_type || ''}"
                      data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                      aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}"
                >
                    <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                </button>
            </div>
          </li>
        `).join('');

        $list.innerHTML = contents;
        state.lazy.refresh($list);
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
            //console.log(`상품 로드: ${url} (그룹모드: ${state.isGroupMode})`);
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


            document.querySelector('.bombom_contents_new_container').style.display = 'block';

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
        getContainer: () => document.querySelector('.list_contents.list_newest'),

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
            const html = items.map(item => cardTemplates.contentCard(item, 'full')).join('');
            container.innerHTML = html;
            // 직접 templates 객체 사용도 가능

            // 레이지 로더 새로고침 - dewbian
            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        // 콘텐츠 추가 (무한 스크롤용) - dewbian
        append: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 상품 카드 템플릿 사용하여 HTML 생성 - dewbian
            const html = items.map(item => cardTemplates.contentCard(item, 'full')).join('');
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
                button.textContent = '콘텐츠 더 보기';
            }
        },
        // 로딩 상태 토글 - dewbian
        toggleLoadingState: (loading) => {
            const button = document.querySelector('.btn_view_more.list_newest');
            if (!button) return;

            if (loading && state.currentPage === 1) {
                button.disabled = true;
                button.textContent = '로딩 중...';
            } else if (!loading && state.currentPage === 1) {
                button.disabled = false;
                button.textContent = '콘텐츠 더 보기';
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

                        //console.log(`무한 스크롤 트리거: ${state.currentPage + 1}페이지 로드`);
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
        countVisualSlider();
        lazyLoader();
        showInformation();

        // 배너 렌더링
        renderBannerBCM();
        renderBannerBCB();

        // 통합된 콘텐츠 로딩
        loadUnifiedContent();


        // S : dewbian 무한스크롤페이지
        api.loadContent();
        scroll.initViewMoreButton();
        // E : dewbian 무한스크롤페이지


        bindCaptureToast({

            bindClick: false,
            listen: true,
            getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
        });
        bindCaptureToggle({
            endpoint: '/api/capture',
            //dewbian 로그인 포함
            goLogin: goLogin, // 로그인 함수 전달
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error('Login required');
                }
            },
        });

        allmenu();
        initSearchHandler();
    }

    return {
        init : initialize,
    }

})();

document.addEventListener('DOMContentLoaded', bombomController.init);
