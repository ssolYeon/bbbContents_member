import {escapeHtml} from "./escapeHtml.js";
export const renderCategory = (category)=>{
    const list = Array.from(new Set(Array.isArray(category) ? category : [category]));
    return list
        .filter(Boolean)
        .map(c => `<span>${escapeHtml(String(c))}</span>`)
        .join('');
}

export const renderTag = (tag)=>{
    const list = Array.from(new Set(Array.isArray(tag) ? tag : [tag]));
    return list
        .filter(Boolean)
        .map(c => `<span>#${escapeHtml(String(c))}</span>`)
        .join('');
}

export const getCaptureIconSrc = (capture) => {
    const filled = capture === 1 || capture === '1' || capture === true;
    return filled
        ? '/src/assets/images/icons/icon_btn_bookmark_fill@x3.png'
        : '/src/assets/images/icons/icon_btn_bookmark_white@x3.png';
}

export const discountPercent = (percent) => {
    const filled = percent === 0 || percent === "0" || percent === false;
    return filled ? `<i>최저</i>` : `<i>${percent}</i>%`;
}

