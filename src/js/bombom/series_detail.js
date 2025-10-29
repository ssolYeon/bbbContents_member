import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {showInformation} from "../common/footer.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {initSearchHandler} from "../../utils/searchHandler.js";

const seriesDetailController = (() => {
    let lazy;

    const lazyLoader = () => {
        lazy = createLazyLoader({
            selector: '.lazy_loading_container img[data-src]',
            root: null,
            rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad: (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        lazy.init();
    }

    const seriesList = () => {
        const $container = document.querySelector('.series_detail_container');
        const $moreBtn = document.querySelector('.btn_view_more');
        const $moreBtnContainer = document.querySelector('.btn_view_more_container');

        let currentPage = 1;
        let isLoading = false;
        let hasMoreData = true;
        let observer = null;

        const methods = {
            requestAPI: async (page = 1) => {
                if (isLoading || !hasMoreData) return;

                isLoading = true;
                methods.setLoadingState(true);

                try {
                    // URL에서 시리즈 ID 추출
                    const pathSegments = window.location.pathname.split('/');
                    const seriesId = pathSegments[pathSegments.length - 1];

                    if (!seriesId || isNaN(seriesId)) {
                        // console.error('유효하지 않은 시리즈 ID:', seriesId);
                        return;
                    }

                    // console.log(`API 요청: /api/series-contents?cidx=${seriesId}&page=${page}`);
                    const response = await requestJson(`/api/series-contents?cidx=${seriesId}&page=${page}`);

                    // 응답 구조 확인
                    // console.log('API 응답:', response);

                    // 응답에서 data 속성 확인
                    const data = response?.data || response || [];

                    if (page === 1) {
                        methods.renderContent(data);
                    } else {
                        methods.appendContent(data);
                    }

                    // 페이지네이션 정보 확인
                    const pagination = response?.pagination;
                    const hasMore = pagination?.has_more ?? (Array.isArray(data) && data.length >= 10);

                    if (!hasMore) {
                        hasMoreData = false;
                        methods.hideMoreButton();
                        methods.destroyObserver();
                    } else {
                        currentPage++;
                        methods.setupInfiniteScroll();
                    }

                } catch (err) {
                    // console.error('시리즈 콘텐츠 로드 실패:', err);
                    hasMoreData = false;
                    methods.hideMoreButton();
                } finally {
                    isLoading = false;
                    methods.setLoadingState(false);
                }
            },

            renderContent: (items = []) => {
                const $list = $container.querySelector('.list_container');
                if (!$list) {
                    // console.error('list_container를 찾을 수 없습니다.');
                    return;
                }

                // console.log('renderContent 호출됨, items:', items);

                if (!Array.isArray(items) || items.length === 0) {
                    $list.innerHTML = '<li class="no-data">등록된 콘텐츠가 없습니다.</li>';
                    methods.hideMoreButton();
                    return;
                }

                const contents = methods.generateItemsHTML(items);
                // console.log('생성된 HTML:', contents.substring(0, 200) + '...');

                $list.innerHTML = contents;

                // lazy 로더 갱신
                if (lazy) {
                    lazy.refresh($list);
                } else {
                    console.warn('lazy loader가 초기화되지 않았습니다.');
                }
            },

            appendContent: (items = []) => {
                const $list = $container.querySelector('.list_container');
                if (!$list || !Array.isArray(items) || items.length === 0) return;

                const contents = methods.generateItemsHTML(items);
                $list.insertAdjacentHTML('beforeend', contents);

                if (lazy) {
                    lazy.refresh($list);
                }
            },

            generateItemsHTML: (items) => {
                // console.log('generateItemsHTML 호출됨, items:', items);

                if (!Array.isArray(items)) {
                    // console.error('items가 배열이 아닙니다:', typeof items, items);
                    return '';
                }

                const html = items.map((item) => {
                    // console.log('개별 아이템 처리:', item);

                    // 안전한 데이터 처리
                    const categories = Array.isArray(item.category) ? item.category : [];
                    const tags = Array.isArray(item.tag) ? item.tag : [];
                    const title = item.title || '제목 없음';
                    const description = item.description || '설명 없음';
                    const thumbnail = item.thumbnail || '/src/assets/images/components/sample_360x480@x3.jpg';
                    const detailUrl = item.detail_url || 'javascript:void(0)';
                    const captureStatus = Number(item.capture) === 1;

                    return `
                        <li class="contents_card full">
                            <div class="thumbnail">
                                <a href="${detailUrl}">
                                    <picture class="lazy_loading_container">
                                        <img
                                            data-src="${thumbnail}"
                                            alt="${escapeHtml(title)}"
                                            width="361"
                                            height="270"
                                            loading="lazy"
                                        >
                                    </picture>
                                </a>
                                <div class="card_top_marker">
                                    ${categories.filter(cat => cat && cat.trim()).map(cat => `<span>${escapeHtml(cat)}</span>`).join('')}
                                </div>
                                <button type="button"
                                    class="btn_capture ${captureStatus ? 'active' : ''}"
                                    data-post-id="${item.id || ''}"
                                    data-board-type="${item.board_type || 'bc'}"
                                    data-capture="${captureStatus ? '1' : '0'}"
                                    aria-pressed="${captureStatus ? 'true' : 'false'}"
                                >
                                    <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                                </button>
                                <div class="card_tag_container">
                                    ${tags.filter(tag => tag && tag.trim()).map(tag => `<span>#${escapeHtml(tag)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="component_information_container">
                                <a href="${detailUrl}">
                                    <p class="card_title text_ellipsis_2">${escapeHtml(title)}</p>
                                    <p class="card_description text_ellipsis_2">${escapeHtml(description)}</p>
                                </a>
                            </div>
                        </li>
                    `;
                }).join('');

                // console.log('생성된 HTML 길이:', html.length);
                return html;
            },

            setLoadingState: (loading) => {
                if (!$moreBtn) return;

                if (loading) {
                    $moreBtn.disabled = true;
                    $moreBtn.textContent = '로딩 중...';
                } else {
                    $moreBtn.disabled = false;
                    $moreBtn.textContent = '콘텐츠 더 보기';
                }
            },

            hideMoreButton: () => {
                if ($moreBtnContainer) {
                    $moreBtnContainer.style.display = 'none';
                }
            },

            setupInfiniteScroll: () => {
                // 기존 observer가 있으면 제거
                methods.destroyObserver();

                // 두 번째 페이지부터 무한 스크롤 활성화
                if (currentPage > 2 && hasMoreData) {
                    observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting && !isLoading && hasMoreData) {
                                methods.requestAPI(currentPage);
                            }
                        });
                    }, {
                        root: null,
                        rootMargin: '100px',
                        threshold: 0
                    });

                    if ($moreBtnContainer) {
                        observer.observe($moreBtnContainer);
                    }
                }
            },

            destroyObserver: () => {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
            },

            bindEvents: () => {
                // 더보기 버튼 클릭 이벤트
                if ($moreBtn) {
                    $moreBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        // console.log('더보기 버튼 클릭, 현재 페이지:', currentPage);
                        methods.requestAPI(currentPage);
                    });
                }
            }
        }

        // 초기화 전 요소 존재 확인
        if (!$container) {
            // console.error('series_detail_container를 찾을 수 없습니다.');
            return;
        }

        // 초기화
        methods.bindEvents();

        // 첫 페이지 로드
        // console.log('첫 페이지 로드 시작');
        methods.requestAPI(1);

        // 페이지 언로드 시 observer 정리
        window.addEventListener('beforeunload', methods.destroyObserver);
    }

    const initialize = () => {
        // console.log('시리즈 상세 페이지 초기화 시작');

        lazyLoader();
        seriesList();
        showInformation();
        bindCaptureToast({
            //getText: (_btn, next) => next ? '스크랩 되었습니다.' : '취소되었습니다.',
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
        initSearchHandler();

        // console.log('시리즈 상세 페이지 초기화 완료');
    }

    return {
        init: initialize,
    }
})();

document.addEventListener('DOMContentLoaded', seriesDetailController.init);
