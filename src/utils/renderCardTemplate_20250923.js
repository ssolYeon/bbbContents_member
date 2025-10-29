import {escapeHtml} from "./escapeHtml.js";
import {renderCategory, renderTag, getCaptureIconSrc} from "./renderCardMeta.js";

/**
 * 할인율 계산 함수
 */
export const calculateDiscountRate = (originalPrice, discountPrice) => {
    if (!originalPrice || !discountPrice) return 0;

    const original = parseInt(originalPrice.replace(/,/g, ''));
    const discount = parseInt(discountPrice.replace(/,/g, ''));

    if (original <= discount) return 0;

    return Math.ceil(((original - discount) / original) * 100);
};

/**
 * 공통 템플릿 모음
 */
export const cardTemplates = {
    /**
     * 상품 카드 템플릿
     */
    haebomCard: (item, card_type='card_174_174') => {
        const discountRate = calculateDiscountRate(item.origin_price, item.discount_price || item.price);
        const hasDiscount = discountRate > 0;
        const displayPrice = item.discount_price || item.price;
        return `
            <li class="component_card ${card_type}"  style="border:0px solid blue">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img
                              data-src="${item.thumbnail}"
                              alt="${escapeHtml(item.title)}"
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
                          data-board-type = "${item.board_type || 'hb'}"
                          data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                          aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}"
                       >
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                      </button>
                </div>
                <div class="component_information_container">
                    <a href="${item.detail_url}">
                        <div class="card_place">
                            <img src="/src/assets/images/icons/icon_place_black@x3.png" alt="위치">
                            <span>${item.place}</span>
                        </div>
                        <p class="card_title text_ellipsis_2">${item.title}</p>
                        <div class="price_container">
                            <!-- 원가 표시 (할인이 있을 때만) -->
                            <span class="origin_price ${hasDiscount ? "" : "visible_hidden"}">${hasDiscount ? item.origin_price + item.unit : ''}</span>
                            <div>
                                <!-- 할인율 표시 (할인이 있을 때만) -->
                                <span class="discount ${hasDiscount ? "" : "visible_hidden"}">
                                    <i>${hasDiscount ? discountRate : ''}</i>${hasDiscount ? '%' : ''}
                                </span>
                                <b>${displayPrice}</b>
                                <span class="unit">${item.unit}</span>
                            </div>
                        </div>
                        ${item?.sub_info_desc?.["유효기간"] ?
                            `<div class="card_date_container">
                                                <span class="start_date">${item.sub_info_desc["유효기간"]}</span>
                                        </div>` :    ``
                        }
                        ${item?.sub_info_desc?.["최대인원"] ?
                            `<div class="card_tag_container"><span>최대인원 : ${item.sub_info_desc["최대인원"]}</span></div>` :    ``
                        }
                    </a>
                </div>
            </li>
        `;
    },
    haebomCard_home: (item, card_type='card_174_174') => {
        const discountRate = calculateDiscountRate(item.origin_price, item.discount_price || item.price);
        const hasDiscount = discountRate > 0;
        const displayPrice = item.discount_price || item.price;
        return `
            <li role="listitem" class="component_card ${card_type}" style="border:0px solid deepskyblue">
                    <div class="thumbnail">
                        <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img alt="${item.title}"
                                 loading="lazy"
                                 data-src="${item.thumbnail}"
                                 onerror="this.src='/src/assets/images/components/sample_140x140@x3.jpg'">
                        </picture>
                        <div class="card_top_marker">
                        ${renderCategory(item.category)}
                        </div>
                        </a>
                        <button type="button"
                          class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                          data-post-id="${item.id}"
                          data-board-type = "${item.board_type || 'hb'}"
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
                            ${item.place}
                        </div>
                        <p class="card_title text_ellipsis_2">
                           ${item.title}
                        </p>
                        <div class="price_container">
                            <!-- 원가 표시 (할인이 있을 때만) -->
                            <span class="origin_price ${hasDiscount ? "" : "visible_hidden"}">${hasDiscount ? item.origin_price + item.unit : ''}</span>
                            <div>
                                <!-- 할인율 표시 (할인이 있을 때만) -->
                                <span class="discount ${hasDiscount ? "" : "visible_hidden"}">
                                    <i>${hasDiscount ? discountRate : ''}</i>${hasDiscount ? '%' : ''}
                                </span>
                                <b>${displayPrice}</b>
                                <span class="unit">${item.unit}</span>
                            </div>
                        </div>
                        ${item?.sub_info_desc?.["유효기간"] ?
                            `<div class="card_date_container">
                                    <span class="start_date">${item.sub_info_desc["유효기간"]}</span>
                            </div>` :    ``
                        }
                        ${item?.sub_info_desc?.["최대인원"] ?
                            `<div class="card_tag_container"><span>최대인원 : ${item.sub_info_desc["최대인원"]}</span></div>` :    ``
                        }
                        </a>
                    </div>

            </li>
        `;
    },
    gabomCard: (item, card_type='card_174_174') => {
        const discountRate = calculateDiscountRate(item.origin_price, item.discount_price || item.price);
        const hasDiscount = discountRate > 0;
        const displayPrice = item.discount_price || item.price;
        const discountText = hasDiscount ? `${discountRate}%` : '';
        return `
            <li class="component_card ${card_type}" style="border:0px solid red">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img data-src="${item.thumbnail}"
                             alt="${escapeHtml(item.title)}"
                             loading="lazy">
                        </picture>
                    </a>
                    <div class="card_top_marker">${renderCategory(item.category)}</div>
                    <button type="button"
                            class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                            data-post-id="${item.id}" data-board-type="${item.board_type || 'gb'}"
                            data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                            aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                    </button>
                    <div class="card_bottom_marker">
                        <div class="card_place">
                            <img src="/src/assets/images/icons/icon_place_white@x3.png" alt="">
                            <span>${item.place}</span>
                        </div>
                            ${item?.sub_info_desc?.["최대인원"] ?
                        `<div class="card_tag_container"><span>최대인원 : ${item.sub_info_desc["최대인원"]}</span></div>` :    ``
                        }
                    </div>
                </div>
                <div class="component_information_container">
                    <a href="${item.detail_url}">
                        <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                        <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                        <div class="price_container">
                            <!-- 원가 표시 (할인이 있을 때만) - dewbian -->
                            <span class="origin_price ${hasDiscount ? "" : "visible_hidden"}">${hasDiscount ? item.origin_price + item.unit : ''}</span>
                            <div>
                                <!-- 할인율 표시 (할인이 있을 때만) - dewbian -->
                                <span class="discount ${hasDiscount ? "" : "visible_hidden"}">
                                    <i>${discountText.replace('%', '')}</i>${hasDiscount ? '%' : ''}
                                </span>
                                <b>${item.price}</b>
                                <span class="unit">${item.unit}</span>
                            </div>
                        </div>
                        ${item?.sub_info_desc?.["유효기간"] ?
            `<div class="card_date_container">
                                    <span class="start_date">${item.sub_info_desc["유효기간"]}</span>
                            </div>` :    ``
        }
                    </a>
                </div>
            </li>
        `;
    },
    gabomCard_02: (item, card_type='card_174_174') => {
        const discountRate = calculateDiscountRate(item.origin_price, item.discount_price || item.price);
        const hasDiscount = discountRate > 0;
        const displayPrice = item.discount_price || item.price;
        const discountText = hasDiscount ? `${discountRate}%` : '';

        return `
            <li class="component_card ${card_type}" style="border:0px solid deeppink">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                        <picture class="lazy_loading_container">
                            <img data-src="${item.thumbnail}"
                             alt="${escapeHtml(item.title)}"
                             loading="lazy">
                        </picture>
                    </a>
                    <div class="card_top_marker">${renderCategory(item.category)}</div>
                    <button type="button"
                            class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                            data-post-id="${item.id}" data-board-type="${item.board_type || 'gb'}"
                            data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                            aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                    </button>
                </div>
                <div class="component_information_container">
                    <a href="${item.detail_url}">
                        <div class="card_place">
                            <img src="/src/assets/images/icons/icon_place_white@x3.png" alt="">
                            <span>${item.place}</span>
                        </div>
                        <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                        <div class="price_container">
                            <!-- 원가 표시 (할인이 있을 때만) - dewbian -->
                            <span class="origin_price ${hasDiscount ? "" : "visible_hidden"}">${hasDiscount ? item.origin_price + item.unit : ''}</span>
                            <div>
                                <!-- 할인율 표시 (할인이 있을 때만) - dewbian -->
                                <span class="discount ${hasDiscount ? "" : "visible_hidden"}">
                                    <i>${discountText.replace('%', '')}</i>${hasDiscount ? '%' : ''}
                                </span>
                                <b>${item.price}</b>
                                <span class="unit">${item.unit}</span>
                            </div>
                        </div>
                        ${item?.sub_info_desc?.["최대인원"] ?
            `<div class="card_tag_container"><span>최대인원 : ${item.sub_info_desc["최대인원"]}</span></div>` : ``
        }
                        ${item?.sub_info_desc?.["유효기간"] ?
            `<div class="card_date_container">
                                    <span class="start_date">${item.sub_info_desc["유효기간"]}</span>
                            </div>` : ``
        }
                    </a>
                </div>
            </li>
        `;
    },
    sabomCard : (item,card_type)=>{
        const discountRate = calculateDiscountRate(item.origin_price, item.discount_price || item.price);
        const hasDiscount = discountRate > 0;
        const displayPrice = item.discount_price || item.price;
        // 할인 표시용 텍스트 생성 - dewbian
        const discountText = hasDiscount ? `${discountRate}%` : '';
        // <li role="listitem" class="component_card shop_174_174"">
        return `
        <li  class="component_card ${card_type}" style="border:0px solid yellow">
            <div class="thumbnail">
                <a href="${item.detail_url}">
                  <picture class="lazy_loading_container">
                    <img
                      data-src="${item.thumbnail}"
                      alt="${escapeHtml(item.title)}"
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
                    <span class="card_seller">${item.brand_title}</span>
                    <p class="card_title text_ellipsis_2">${item.title}</p>
                    <p class="card_description  text_ellipsis_2">${item.description}</p>
                    <div class="price_container">
                        <!-- 원가 표시 (할인이 있을 때만) - dewbian -->
                        <span class="origin_price ${hasDiscount ? "" : "visible_hidden"}">${hasDiscount ? item.origin_price + item.unit : ''}</span>
                        <div>
                            <!-- 할인율 표시 (할인이 있을 때만) - dewbian -->
                            <span class="discount ${hasDiscount ? "" : "visible_hidden"}">
                                <i>${discountText.replace('%', '')}</i>${hasDiscount ? '%' : ''}
                            </span>
                            <b>${item.price}</b>
                            <span class="unit">${item.unit}</span>
                        </div>
                    </div>
                    <div class="review_counter">리뷰 <b>${item.review_count}</b></div>
                </a>
            </div>
          </li>
        `
    },

    /**
     * 컨텐츠 카드 템플릿
     */
    contentCard_home: (item, cardType = 'content_card') => {
        return `
        <li class="component_card ${cardType}"  style="border:0px solid green">
            <div class="thumbnail">
                <a href="${item.detail_url}">
                  <picture class="lazy_loading_container">
                    <img
                      data-src="${item.thumbnail}"
                      alt="${escapeHtml(item.title)}"
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
                    <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                    <p class="card_description text_ellipsis_2">${escapeHtml(item.description)} </p>
                    <div class="card_tag_container">${renderTag(item.tag)}</div>
                </a>
            </div>
        </li>
    `;
    },
    contentCard: (item, cardType = 'content_card') => {
        return `
        <li class="component_card ${cardType}"  style="border:0px solid darkolivegreen">
            <div class="thumbnail">
                <a href="${item.detail_url}">
                  <picture class="lazy_loading_container">
                    <img
                      data-src="${item.thumbnail}"
                      alt="${escapeHtml(item.title)}"
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
                    <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                    <p class="card_description text_ellipsis_2">${escapeHtml(item.description)} </p>
                </a>
            </div>
        </li>
    `;
    },
    /**
     * 시리즈 카드 템플릿
     */
    seriesCard_home: (item, cardType = 'content_card') => {
        return `
        <li class="component_card ${cardType}" style="border:0px solid violet">
            <div class="thumbnail">
                <a href="${item.detail_url}">
                    <picture class="lazy_loading_container">
                        <img alt="${item.title}" loading="lazy" data-src="${item.thumbnail}">
                    </picture>
                </a>
                <div class="card_top_marker">
                    ${renderCategory(item.category)}
                </div>
                <button type="button"
                        class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                        data-post-id="${item.id}" data-board-type="${item.board_type}"
                        data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                        aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                    <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                </button>
                <div class="card_tag_container">${renderTag(item.tag)}</div>
            </div>
            <div class="component_information_container">
                <a href="${item.detail_url}">
                    <p class="card_title white">${escapeHtml(item.title)}</p>
                    <p class="card_description white text_ellipsis_2">${escapeHtml(item.description)}</p>
                </a>
            </div>
        </li>
        `;
    },
    seriesCard: (item, cardType = 'content_card') => {
        return `
            <li class="component_card ${cardType}" style="border:0px solid darkviolet">
                <div class="thumbnail">
                    <a href="${item.detail_url}">
                    <picture class="lazy_loading_container">
                        <img
                          data-src="${item.thumbnail}"
                          alt="${escapeHtml(item.title)}"
                          loading="lazy"
                        >
                    </picture>
                    <div class="card_top_marker">${renderCategory(item.category)}</div>
                    <div class="component_information_container">
                        <p class="card_title text_ellipsis_2">${escapeHtml(item.title)}</p>
                        <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                        <div class="card_tag_container">${renderTag(item.tag)}</div>
                        <span class="card_count_posts">총 콘텐츠 <b>${item.contents_cnt}</b></span>
                    </div>
                    </a>
                    <button type="button"
                            class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                            data-post-id="${item.id}" data-board-type="${item.board_type}"
                            data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                            aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                        <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
                    </button>
                </div>
            </li>
        `;
    },

    /**
     * 빈 상태 템플릿
     */
    emptyState: (message = '데이터가 없습니다.') => {
        return `<li class="nodata">${message}</li>`;
    },

    /**
     * 로딩 상태 템플릿
     */
    loadingState: () => {
        return `<li class="loading">로딩 중...</li>`;
    }
};
