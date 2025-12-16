import { cardTemplates } from "../../utils/renderCardTemplate.js";
import { bindCaptureToast } from "../../utils/captureToast.js";
import { bindCaptureToggle } from "../../utils/bindCaptureToggle.js";
import { createLazyLoader } from "../../utils/lazyLoader.js";

const contentsRecommendController = (() => {
    let lazy;
    const initialize = (cidx, hasSeries, seriesIdx, recomCount) => {
        loadRecommendContents(cidx, hasSeries, seriesIdx, recomCount);
    };

    async function loadRecommendContents(cidx, hasSeries, seriesIdx, recomCount) {
        try {
            // 시리즈가 있을 경우 연관 콘텐츠 먼저 로드
            if (hasSeries && seriesIdx > 0) {
                await loadRelatedContents(seriesIdx);
            }
            if (!hasSeries && recomCount == 0) {
                await loadLatestContents(cidx);
            }
            // 추천 그룹 로드
            await loadAdditionalContents(cidx);
        } catch (error) {
            console.error('추천 콘텐츠 로드 실패:', error);
        }
    }

    async function loadRelatedContents(seriesIdx) {
        try {
            const response = await fetch(`/api/recommend-contents/bsc/${seriesIdx}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const container = document.getElementById('related-contents-container');
                container.innerHTML = generateContentHTML('연관 콘텐츠', 'bc', data);
                bindCaptureEvents();
            }
        } catch (error) {
            console.error('연관 콘텐츠 로드 실패:', error);
        }
    }

    async function loadLatestContents(cidx) {
        try {
            const response = await fetch(`/api/lastest-contents/${cidx}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const container = document.getElementById('related-contents-container');
                container.innerHTML = generateContentHTML('연관 콘텐츠', 'bc', data);
                bindCaptureEvents();
            }
        } catch (error) {
            console.error('연관 콘텐츠 로드 실패:', error);
        }
    }

    async function loadAdditionalContents(cidx) {
        try {
            const groupResponse = await fetch(`/api/recommend-groups/${cidx}`);
            const groupData = await groupResponse.json();

            if (!groupData.success || !groupData.data.length) {
                return;
            }

            const container = document.getElementById('additional-contents-container');
            let html = '';

            for (const group of groupData.data) {
                try {
                    const contentResponse = await fetch(`/api/recommend-contents/${group.ctype}/${group.idx}`);
                    const contentData = await contentResponse.json();

                    if (contentData && contentData.length > 0) {
                        html += generateContentHTML(group.title, group.ctype, contentData);
                    }
                } catch (error) {
                    console.error(`그룹 ${group.idx} 콘텐츠 로드 실패:`, error);
                }
            }

            container.innerHTML = html;
            bindCaptureEvents();
        } catch (error) {
            console.error('추가 콘텐츠 로드 실패:', error);
        }
    }

    function generateContentHTML(title, ctype, items) {
        if (!items || items.length === 0) return '';

        let html = '';
        let listItems = '';
        let ul_style = '';

        if (items.length < 3) {
            ul_style = 'list_contents';
        } else {
            ul_style = 'list_horizontal';
        }

        items.forEach(item => {
            if (ctype === 'bc') {
                listItems += cardTemplates.contentCard_home(item, 'half');
            } else if (ctype === 'bs') {
                listItems += cardTemplates.seriesCard(item, 'full');
            } else if (ctype === 'hb') {
                listItems += cardTemplates.haebomCard(item, 'half');
            } else if (ctype === 'gb') {
                listItems += cardTemplates.gabomCard(item, 'half');
            } else if (ctype === 'sb') {
                listItems += cardTemplates.sabomCard(item, 'half');
            }
        });

        if (ctype === 'bc') {
            html = `
                <section class="related_contents_container related">
                    <h2 class="sub_title">${title}</h2>
                    <ul class="${ul_style}">
                        ${listItems}
                    </ul>
                </section>
            `;
        } else if (ctype === 'bs') {
            html = `
                <section class="bb_recommend_container recommend">
                    <h2 class="sub_title">${title}</h2>
                    <ul class="${ul_style}">
                        ${listItems}
                    </ul>
                </section>
            `;
        } else if (ctype === 'hb' || ctype === 'gb') {
            html = `
                <section class="hb_recommend_container recommend">
                    <h2 class="sub_title">${title}</h2>
                    <ul class="${ul_style}">
                        ${listItems}
                    </ul>
                </section>
            `;
        } else if (ctype === 'sb') {
            html = `
                <section class="gb_recommend_container recommend">
                    <h2 class="sub_title">${title}</h2>
                    <ul class="${ul_style}">
                        ${listItems}
                    </ul>
                </section>
            `;
        }

        return html;
    }

    function initLazyLoader() {
        lazy = createLazyLoader({
            selector: "img[data-src]",
            root: null,
            rootMargin: "0px 0px",
            onEnter: (img) => img.classList.add("is-loading"),
            onLoad: (img) => {
                img.classList.remove("is-loading");
                img.classList.add("is-loaded");
            },
        });
        lazy.init();
    }

    function bindCaptureEvents() {
        // 이미지 Lazy Loading 초기화
        initLazyLoader();

        // 추천 콘텐츠의 캡처 버튼 이벤트 바인딩
        bindCaptureToast({
            delegateRoot: document,
            buttonSelector: '.thumbnail .btn_capture',
            hostSelector: '.btn_capture_container',
            bindClick: false,
            listen: true,
            duration: 500,
        });

        bindCaptureToggle({
            delegateRoot: document,
            buttonSelector: '.thumbnail .btn_capture',
            endpoint: '/api/capture',
            getIconSrc: (state) =>
                state
                    ? '/src/assets/images/icons/icon_btn_bookmark_fill@x3.png'
                    : '/src/assets/images/icons/icon_btn_bookmark_white@x3.png',
            goLogin: typeof goLogin !== 'undefined' ? goLogin : null,
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (typeof isLogin !== 'undefined' && !isLogin) {
                    throw new Error('Login required');
                }
            },
        });
    }

    return {
        init: initialize,
    };
})();

export default contentsRecommendController;
