export const wheelCustom = (root = document) => {
    const SELECTOR = '.list_horizontal, .row_scroll_box';

    const handler = (e) => {
        if (e.shiftKey) return;

        const el = e.target.closest(SELECTOR);
        if (!el) return;

        const max = el.scrollWidth - el.clientWidth;
        if (max <= 0) return;

        let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

        if (e.deltaMode === 1)       delta *= 16;
        else if (e.deltaMode === 2)  delta *= el.clientWidth;

        const next = Math.max(0, Math.min(el.scrollLeft + delta, max));
        if (next !== el.scrollLeft) {
            e.preventDefault();
            el.scrollLeft = next;
        }
    };

    root.addEventListener('wheel', handler, { passive: false });
};
