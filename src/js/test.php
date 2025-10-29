
function renderBSCard(item) {
return `
<li role="listitem" class="component_card card_175_262" >
    <a href="${item.detail_url}">
        <div class="thumbnail">
            <picture class="lazy_loading_container">
                <img data-src="${item.thumbnail}" alt="${escapeHtml(item.title)}" loading="lazy">
            </picture>
            <div class="card_top_marker">${renderCategory(item.category)}</div>
            <button type="button"
                    class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                    data-post-id="${item.id}" data-board-type="${item.board_type}"
                    data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                    aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
                <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
            </button>
            <div class="component_information_container">
                <p class="card_title text_ellipsis_2">여기지? ::${escapeHtml(item.title)}</p>
                <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                <div class="card_tag_container">${renderTag(item.tag)}</div>
                <span class="card_count_posts">총 콘텐츠 <b>${item.contents_count}</b></span>
            </div>
        </div>
    </a>
</li>
`;
}
function renderBBCard(item) {
//check
return `
<li role="listitem" class="component_card card_174_261" >
    <div class="thumbnail">
        <a href="${item.detail_url}">
            <picture class="lazy_loading_container">
                <img data-src="${item.thumbnail}" alt="${escapeHtml(item.title)}" loading="lazy">
            </picture>
        </a>
        <div class="card_top_marker">${renderCategory(item.category)}</div>
        <button type="button"
                class="btn_capture ${Number(item.capture) === 1 ? 'active' : ''}"
                data-post-id="${item.id}" data-board-type="${item.board_type}"
                data-capture="${Number(item.capture) === 1 ? '1' : '0'}"
                aria-pressed="${Number(item.capture) === 1 ? 'true' : 'false'}">
            <img src="${getCaptureIconSrc(item.capture)}" alt="캡쳐버튼">
        </button>
        <div class="component_information_container">
            <a href="${item.detail_url}">
                <p class="card_title text_ellipsis_2">여기는 아닐껄?::${escapeHtml(item.title)}</p>
                <p class="card_description text_ellipsis_2">${escapeHtml(item.description)}</p>
                <div class="card_tag_container">${renderTag(item.tag)}</div>
            </a>
        </div>
    </div>
</li>
`;
}

function renderSBCard(item) {
const discountRate = utils.calculateDiscountRate(item.origin_price, item.discount_price || item.price);
const hasDiscount = discountRate > 0;
const displayPrice = item.discount_price || item.price;

return `
<li class="component_card card_174_174">
    <div class="thumbnail">
        <a href="${item.detail_url}">
            <picture class="lazy_loading_container">
                <img
                    data-src="${item.thumbnail}"
                    alt="${escapeHtml(item.title)}"
                    width="174"
                    height="174"
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
            <div class="card_tag_container">${renderTag(item.tag)}</div>
        </a>
    </div>
</li>
`;
}

function renderGBCard(item) {
const discountRate = utils.calculateDiscountRate(item.origin_price, item.discount_price || item.price);
const hasDiscount = discountRate > 0;
const displayPrice = item.discount_price || item.price;

return `
<li role="listitem" class="component_card ${config.CARD_TYPES.CONTENT}">
    <div class="thumbnail">
        <a href="${item.detail_url}">
            <picture class="lazy_loading_container">
                <img data-src="${item.thumbnail}" alt="${escapeHtml(item.title)}"
                     width="361" height="270" loading="lazy">
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
            <div class="card_tag_container">${renderTag(item.tag)}</div>
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
                    <i>${hasDiscount ? discountRate : ''}</i>
                    </span>
                    <b>${item.price}</b>
                    <span class="unit">${item.unit}</span>
                </div>
            </div>
        </a>
    </div>
</li>
`;
}
function renderGBCard(item) {
const discountRate = utils.calculateDiscountRate(item.origin_price, item.discount_price || item.price);
const hasDiscount = discountRate > 0;
const displayPrice = item.discount_price || item.price;

return `
<li class="component_card card_174_174">
    <div class="thumbnail">
        <a href="${item.detail_url}">
            <picture class="lazy_loading_container">
                <img
                    data-src="${item.thumbnail}"
                    alt="${escapeHtml(item.title)}"
                    width="174"
                    height="174"
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
            <div class="card_tag_container">${renderTag(item.tag)}</div>
        </a>
    </div>
</li>
`;
}
