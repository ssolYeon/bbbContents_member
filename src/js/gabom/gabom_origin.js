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

const heabomController = (()=>{
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
    const renderCarousel = ()=>{
        const DATA_URL = '/data/gabom/sub_visual.json';
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

                const contents = items.map((item) => `
                    <div class="swiper-slide slider">
                        <a href="${item.detail_url}">
                            <div class="slider_thumbnail_container">
                                <img src="${item.image}" alt="">
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
        const DATA_URL = '/data/gabom/sub_visual.json';
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

                const contents = items.map((item) => `
                    <div class="swiper-slide slider">
                        <a href="${item.detail_url}">
                            <div class="slider_thumbnail_container">
                                <img src="${item.image}" alt="">
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
    const renderSlot01 = () =>{
        const DATA_URL = '/data/gabom/gabom_1.json';
        const $container = document.querySelectorAll('.list_container')[0];
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
                const $list = $container.querySelector('.list_horizontal');

                if (!$list) return;

                const contents = items.map((item) => `
                 <li role="listitem" class="component_card shop_340_221">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="340"
                                  height="221"
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
                           <div class="card_bottom_marker">
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_white@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </div>
                        </div>
                        <div class="component_information_container">
                            <a href="${item.detail_url}">
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                  </li>
                `).join('');

                $list.innerHTML = contents;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderSlot02 = () =>{
        const DATA_URL = '/data/gabom/gabom_2.json';
        const $container = document.querySelectorAll('.list_container')[1];
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
                const $list = $container.querySelector('.list_double_row');

                if (!$list) return;

                const topRows =  items.slice(0,items.length / 2 );
                const bottomRows =  items.slice(items.length / 2 ,items.length);

                const topRowRender = topRows.map( item => `
                    <li class="component_card shop_164_123">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="165"
                                  height="123"
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
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </a>
                        </div>
                    </li>
                `).join('');

                const bottomRowRender = bottomRows.map( item => `
                <li class="component_card shop_164_123">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="165"
                                  height="124"
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
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </a>
                        </div>
                    </li>
                `).join('');
                $list.innerHTML = `
                    <div class="row">${topRowRender}</div>
                    <div class="row">${bottomRowRender}</div>
                `;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderSlot03 = () =>{
        const DATA_URL = '/data/gabom/gabom_3.json';
        const $container = document.querySelectorAll('.list_container')[2];
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
                const $list = $container.querySelector('.list_double_row');

                if (!$list) return;

                const topRows =  items.slice(0,items.length / 2 );
                const bottomRows =  items.slice(items.length / 2 ,items.length);

                const topRowRender = topRows.map( item => `
                    <li class="component_card shop_164_123">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="165"
                                  height="123"
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
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </a>
                        </div>
                    </li>
                `).join('');

                const bottomRowRender = bottomRows.map( item => `
                <li class="component_card shop_164_123">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="165"
                                  height="124"
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
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </a>
                        </div>
                    </li>
                `).join('');
                $list.innerHTML = `
                    <div class="row">${topRowRender}</div>
                    <div class="row">${bottomRowRender}</div>
                `;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderSlot04 = () =>{
        const DATA_URL = '/data/gabom/gabom_4.json';
        const $container = document.querySelectorAll('.list_container')[3];
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

                const contents = items.map( item => `
                    <li role="listitem" class="component_card card_361_270">
                    <div class="thumbnail">
                        <a href="${item.detail_url}">
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="361"
                              height="270"
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
                        <div class="card_bottom_marker">
                            <div class="card_place">
                                <img src="/src/assets/images/icons/icon_place_white@x3.png" alt="">
                                <span>${item.place}</span>
                            </div>
                            <div class="card_tag_container">
                                ${renderTag(item.tag)}
                            </div>
                        </div>

                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            <p class="card_title text_ellipsis_2">
                                ${item.title}
                            </p>
                            <p class="card_description text_ellipsis_2">
                                ${item.description}
                            </p>
                            <div class="price_container">
                                <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                <div>
                                    <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                    <b>${item.price}</b>
                                    <span class="unit">${item.unit}</span>
                                </div>
                            </div>
                        </a>
                    </div>
            </li>
                `).join('');
                $list.innerHTML = contents;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderSlot05 = () =>{
        const DATA_URL = '/data/gabom/gabom_5.json';
        const $container = document.querySelectorAll('.list_container')[4];
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
                const $list = $container.querySelector('.list_horizontal');

                if (!$list) return;

                const contents = items.map( item => `
                <li class="component_card shop_164_123">
                        <div class="thumbnail">
                          <a href="${item.detail_url}">
                              <picture class="lazy_loading_container">
                                <img
                                  data-src="${item.thumbnail}"
                                  alt="${escapeHtml(item.title)}"
                                  width="165"
                                  height="124"
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
                                <div class="card_place">
                                    <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="">
                                    <span>${item.place}</span>
                                </div>
                                <p class="card_title text_ellipsis_2">${item.title}</p>
                                <div class="price_container">
                                    <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                    <div>
                                        <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                        <b>${item.price}</b>
                                        <span class="unit">${item.unit}</span>
                                    </div>
                                </div>
                                <div class="card_tag_container">
                                    ${renderTag(item.tag)}
                                </div>
                            </a>
                        </div>
                    </li>
                `).join('');
                $list.innerHTML = contents;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderSlot06 = () =>{
        const DATA_URL = '/data/gabom/gabom_6.json';
        const $container = document.querySelectorAll('.list_container')[5];
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

                const contents = items.map( item => `
                    <li role="listitem" class="component_card card_361_270">
                    <div class="thumbnail">
                        <a href="${item.detail_url}">
                          <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
                              width="361"
                              height="270"
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
                        <div class="card_bottom_marker">
                            <div class="card_place">
                                <img src="/src/assets/images/icons/icon_place_white@x3.png" alt="">
                                <span>${item.place}</span>
                            </div>
                            <div class="card_tag_container">
                                ${renderTag(item.tag)}
                            </div>
                        </div>
                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            <p class="card_title text_ellipsis_2">
                                ${item.title}
                            </p>
                            <p class="card_description text_ellipsis_2">
                                ${item.description}
                            </p>
                            <div class="price_container">
                                <span class="origin_price ${item.origin_price ? "" : "visible_hidden"}">${item.origin_price}${item.unit}</span>
                                <div>
                                    <span class="discount ${item.discount_percent ? "" : "visible_hidden"}">${discountPercent(item.discount_percent)}</span>
                                    <b>${item.price}</b>
                                    <span class="unit">${item.unit}</span>
                                </div>
                            </div>
                        </a>
                    </div>
                </li>
                `).join('');

                $list.innerHTML = contents;
                lazy.refresh($list);
            }
        }
        methods.requestAPI();
    }
    const renderAllSlots = [renderSlot01,renderSlot02,renderSlot03,renderSlot04,renderSlot05, renderSlot06]
    const initialize = ()=>{
        renderCategoryNavigation('/data/category/gabom.json');
        renderCarousel();
        renderBanner();
        lazyLoader();
        bindCaptureToast();
        showInformation();
        bindCaptureToast();
        bindCaptureToggle({
            endpoint: '/api/capture', // 서버 주소만 바꾸면 됨
        });
        allmenu();
        initSearchHandler();
        initCategoryToggleNav({dataUrl:"/data/category/gabom.json"})
        renderAllSlots.forEach(fn=> fn())
        wheelCustom();
    }
    return {
        init : initialize,
    }

})();

document.addEventListener('DOMContentLoaded', heabomController.init);
