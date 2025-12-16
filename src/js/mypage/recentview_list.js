import { escapeHtml } from "../../utils/escapeHtml.js";
import { countVisualSlider } from "../../utils/sliderController.js";
import { createLazyLoader } from "../../utils/lazyLoader.js";
import { getCaptureIconSrc } from "../../utils/renderCardMeta.js";
import { bindCaptureToast } from "../../utils/captureToast.js";
import { showInformation } from "../common/footer.js";
import { bindCaptureToggle } from "../../utils/bindCaptureToggle.js";
import { allmenu } from "../common/allmenu.js";
import { initSearchHandler } from "../../utils/searchHandler.js";
import { cardTemplates } from "../../utils/renderCardTemplate.js";

const recentviewListController = (() => {
    // 전역 상태 관리
    const state = {
        lazy: null,
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        isInfiniteScrollActive: false,
        observer: null,
        sentinel: null,
    };

    const config = {
        API_BASE: "/api/recentviewList",
    };

    // 유틸리티 함수들
    const utils = {
        buildApiUrl: (page = 1) => {
            const params = new URLSearchParams();
            if (page > 1) params.set("page", page);
            return params.toString()
                ? `${config.API_BASE}?${params.toString()}`
                : config.API_BASE;
        },

        resetState: () => {
            state.currentPage = 1;
            state.totalPages = 1;
            state.isLoading = false;
            state.isInfiniteScrollActive = false;
            utils.cleanupObserver();
        },

        cleanupObserver: () => {
            if (state.observer) {
                state.observer.disconnect();
                state.observer = null;
            }
            if (state.sentinel?.parentElement) {
                state.sentinel.parentElement.removeChild(state.sentinel);
                state.sentinel = null;
            }
        },
    };

    // 레이지 로더 초기화
    const initLazyLoader = () => {
        state.lazy = createLazyLoader({
            onEnter: (img) => img.classList.add("is-loading"),
            onLoad: (img) => {
                img.classList.remove("is-loading");
                img.classList.add("is-loaded");
            },
        });
        state.lazy.init();
    };

    function updateResultsCount(count) {
        const resultsCount = document.getElementById("resultTotal");
        if (!resultsCount) return;
        resultsCount.textContent = count || 0;
    }

    // API 관련 함수들
    const api = {
        fetchData: async (url) => {
            if (state.isLoading) return null;

            try {
                state.isLoading = true;
                ui.toggleLoadingState(true);

                const response = await fetch(url, {
                    method: "GET",
                    credentials: "include",
                    headers: { Accept: "application/json" },
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                return data;
            } catch (error) {
                console.error("API 요청 실패:", error);
                ui.showError("데이터를 불러오는데 실패했습니다.");
                return null;
            } finally {
                state.isLoading = false;
                ui.toggleLoadingState(false);
            }
        },

        loadContent: async (resetPage = false) => {
            if (resetPage) utils.resetState();

            const url = utils.buildApiUrl(state.currentPage);
            const data = await api.fetchData(url);

            if (!data) return;

            // 다양한 응답 구조 지원
            const items =
                data?.data?.items || data?.items || data?.posts || data || [];
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
            if (state.currentPage >= state.totalPages || state.isLoading)
                return;

            state.currentPage += 1;
            api.loadContent();
        },
    };

    // 콘텐츠 렌더링
    const content = {
        getContainer: () =>
            document.querySelector(".myp_contents_wrap .list_contents"),

        render: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            // 빈 데이터 처리
            if (!items || items.length === 0) {
                content.showEmptyState();
                return;
            }

            const html = items
                .map((item) => cardTemplates.contentCard_like(item, "half"))
                .join("");
            container.innerHTML = html;

            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        append: (items = []) => {
            const container = content.getContainer();
            if (!container) return;

            const html = items
                .map((item) => cardTemplates.contentCard_like(item, "half"))
                .join("");
            container.insertAdjacentHTML("beforeend", html);

            if (state.lazy?.refresh) state.lazy.refresh(container);
        },

        showEmptyState: () => {
            const container = content.getContainer();
            if (!container) return;

            document.querySelector(".myp_container_empty").style.display =
                "flex";
            document.querySelector(".myp_container").style.display = "none";
        },
    };

    // UI 관련 함수들
    const ui = {
        updateViewMoreButton: (pagination) => {
            const container = document.querySelector(
                ".btn_view_more_container"
            );
            const button = document.querySelector(".btn_view_more");

            if (!container || !button) return;

            if (state.currentPage >= 2 || !pagination.has_more_pages) {
                container.style.display = "none";
            } else {
                container.style.display = "flex";
                button.disabled = false;
                button.textContent = "더 보기";
            }
        },

        toggleLoadingState: (loading) => {
            const button = document.querySelector(".btn_view_more");
            if (!button) return;

            if (loading && state.currentPage === 1) {
                button.disabled = true;
                button.textContent = "로딩 중...";
            } else if (!loading && state.currentPage === 1) {
                button.disabled = false;
                button.textContent = "더 보기";
            }
        },

        showError: (message) => {
            console.error(message);
        },
    };

    // 스크롤 관련 기능
    const scroll = {
        initViewMoreButton: () => {
            const button = document.querySelector(".btn_view_more");
            if (!button) return;

            button.addEventListener("click", (e) => {
                e.preventDefault();
                api.loadNextPage();
            });
        },

        initIntersectionObserver: () => {
            // 기존 observer 정리
            utils.cleanupObserver();

            // 센티넬 엘리먼트 생성
            const sentinel = document.createElement("div");
            sentinel.className = "scroll-sentinel";
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

                if (window.getComputedStyle(parent).position === "static") {
                    parent.style.position = "relative";
                }

                parent.appendChild(sentinel);
                state.sentinel = sentinel;
            }

            // Intersection Observer 설정
            state.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (
                            entry.isIntersecting &&
                            state.currentPage < state.totalPages &&
                            !state.isLoading &&
                            state.isInfiniteScrollActive
                        ) {
                            console.log(
                                `무한 스크롤 트리거: ${
                                    state.currentPage + 1
                                }페이지 로드`
                            );
                            api.loadNextPage();
                        }
                    });
                },
                {
                    root: null,
                    rootMargin: "0px",
                    threshold: 0,
                }
            );

            if (state.sentinel) {
                state.observer.observe(state.sentinel);
            }
        },
    };

    // 초기화 함수
    const initialize = async () => {
        countVisualSlider();
        initLazyLoader();
        showInformation();

        // 메인 콘텐츠 로드
        api.loadContent();

        // 기능들 초기화
        scroll.initViewMoreButton();

        bindCaptureToast({
            bindClick: false,
            listen: true,
        });

        bindCaptureToggle({
            endpoint: "/api/capture",
            goLogin: goLogin,
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error("Login required");
                }
            },
        });

        allmenu();
        initSearchHandler();
    };

    return {
        init: initialize,
        destroy: utils.cleanupObserver,
        loadContent: api.loadContent,
    };
})();

document.addEventListener("DOMContentLoaded", recentviewListController.init);
