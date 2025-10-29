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

const bombomController = (()=>{
    let lazy;
    const lazyLoader = ()=>{
        lazy = createLazyLoader({
            selector: '.lazy_loading_container img[data-src]',
            root: null,
            rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad:  (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        lazy.init();
    }
    const latestContent = () => {
        const DATA_URL = '/data/bombom/bombom_contents_1.json';
        const $container = document.querySelector('.bombom_contents_container');
        if (!$container) return;

        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderTitle(data?.title || '');
                    methods.renderContent(data?.posts || []);
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },
            renderTitle: (_title) => {
                const $title = $container.querySelector('.title_container .title');
                if ($title) $title.innerHTML = _title;
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.list_contents');
                if (!$list) return;

                const contents = items.map((item) => `
                  <li class="component_card card_361_361">
                    <div class="thumbnail">
                      <a href="${item.detail_url}">
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="361"
                              height="361"
                              loading="lazy"
                            >
                          </picture>
                      </a>
                      <div class="card_top_marker">
                        ${renderCategory(item.category)}
                      </div>
                      <button type="button"
                              class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                              data-post-id="${item.id}"
                              data-board-type = "${item.board_type}"
                              data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                              aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}"
                      >
                          <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                        </button>
                      <div class="card_tag_container">${renderTag(item.tag)}</div>
                    </div>
                    <div class="component_information_container">
                        <a href="${item.detail_url}">
                            <p class="card_title">${escapeHtml(item.title)}</p>
                            <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                        </a>
                    </div>
                  </li>
                `).join('');

                $list.innerHTML = contents;
                lazy.refresh($list);
            },
        };

        methods.requestAPI();
    };
    const latestSeries = ()=>{
        const DATA_URL = '/data/bombom/bombom_series.json';
        const $container = document.querySelector('.bombom_series_container');
        const methods = {
            requestAPI : async ()=>{
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderTitle(data?.title || "");
                    methods.renderContent(data?.posts || []);
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },
            renderTitle : (_title)=>{
                const $title = $container.querySelector('.title_container .title');
                $title.innerHTML = _title;
            },
            renderContent :  (items = []) => {
                const $list = $container.querySelector('.list_contents');

                if (!$list) return;

                const contents = items.map((item) => `
                  <li class="component_card card_361_481">                   
                        <div class="thumbnail">
                          <a href=${item.detail_url}>
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="361"
                              height="481"
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
                              <div class="card_count_posts">총 콘텐츠 <b>${item.posts_count}</b>개</div>
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
                `).join('');

                $list.innerHTML = contents;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const latestCustomContent = () => {
        const DATA_URL = '/data/bombom/bombom_contents_2.json';
        const $container = document.querySelector('.bombom_contents_custom_container');
        if (!$container) return;

        const methods = {
            requestAPI: async () => {
                try {
                    const data = await requestJson(DATA_URL);
                    methods.renderTitle(data?.title || '');
                    methods.renderContent(data?.posts || []);
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },
            renderTitle: (_title) => {
                const $title = $container.querySelector('.title_container .title');
                if ($title) $title.innerHTML = _title;
            },
            renderContent: (items = []) => {
                const $list = $container.querySelector('.list_contents');
                if (!$list) return;

                const contents = items.map((item) => `
                  <li class="component_card card_361_361">
                    <div class="thumbnail">
                      <a href="${item.detail_url}">
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="361"
                              height="361"
                              loading="lazy"
                            >
                          </picture>
                      </a>
                      <div class="card_top_marker">
                        ${renderCategory(item.category)}
                      </div>
                      <button type="button"
                              class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                              data-post-id="${item.id}"
                              data-board-type = "${item.board_type}"
                              data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                              aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}"
                      >
                          <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                        </button>
                      <div class="card_tag_container">${renderTag(item.tag)}</div>
                    </div>
                    <div class="component_information_container">
                        <a href="${item.detail_url}">
                            <p class="card_title">${escapeHtml(item.title)}</p>
                            <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                        </a>
                    </div>
                  </li>
                `).join('');

                $list.innerHTML = contents;
                lazy.refresh($list);
            },
        };

        methods.requestAPI();
    };

    const initialize = ()=>{
        countVisualSlider();
        lazyLoader();
        showInformation();
        latestContent();
        latestSeries();
        latestCustomContent();
        bindCaptureToast({
            bindClick: false,
            listen: true,
            getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
        });
        bindCaptureToggle({
            endpoint: '/api/capture', // 서버 주소만 바꾸면 됨
        });
        allmenu();
        initSearchHandler();
    }
    return {
        init : initialize,
    }

})();

document.addEventListener('DOMContentLoaded',bombomController.init);