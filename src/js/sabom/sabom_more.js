import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {countVisualSlider} from "../../utils/sliderController.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc, discountPercent} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {showInformation} from "../common/footer.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {allmenu} from "../common/allmenu.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {initCategoryToggleNav} from "../../utils/contentsCategory.js";

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

        const $container = document.querySelector('.more_container');

        if (!$container) return;

        const methods = {
            requestAPI: async (url) => {
                try {
                    const data = await requestJson(url);
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
                   <li role="listitem" class="component_card shop_164_164"">                    
                    <div class="thumbnail">
                        <a href="${item.detail_url}">
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="164"
                              height="164"
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
                  `).join('');


                $list.innerHTML = contents;
                lazy.refresh($list);
            },
        };

        methods.requestAPI("/data/homepage/homepage_sabom.json");
    };

    const initialize = ()=>{
        countVisualSlider();
        lazyLoader();
        showInformation();
        bindCaptureToast();
        renderCategory();
        latestContent();
        bindCaptureToggle({
            endpoint: '/api/capture', // 서버 주소만 바꾸면 됨
        });
        allmenu();
        initSearchHandler();
        initCategoryToggleNav({dataUrl:"/data/category/bombom_contents.json"});
    }
    return {
        init : initialize,
    }

})();

document.addEventListener('DOMContentLoaded',bombomController.init);