export const escapeHtml = (str = '') => {
    if (str == null) return '';
    const BR = '___BR___';
    const normalized = String(str).replace(/<\s*br\s*\/?\s*>/gi, BR);
    const escaped = normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return escaped.replaceAll(BR, '<br>');
}