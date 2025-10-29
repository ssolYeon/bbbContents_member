export function centerActiveNav({
         navSelector = '.category_navigation',
         activeSelector = 'a.active, a[aria-current="page"]',
         behavior = 'instant',
         timeout = 2000, 
         interval = 50,
} = {}) {
    return new Promise((resolve) => {
        const t0 = performance.now();

        const tryCenter = () => {
            const nav = document.querySelector(navSelector);
            const active = nav?.querySelector(activeSelector) || nav?.querySelector('a');
            if (nav && active) {

                const navRect = nav.getBoundingClientRect();
                const itemRect = active.getBoundingClientRect();
                const next = nav.scrollLeft + (itemRect.left + itemRect.width / 2) - (navRect.left + navRect.width / 2);
                nav.scrollTo({ left: next, behavior });
                return resolve(true);
            }
            if (performance.now() - t0 > timeout) return resolve(false);
            setTimeout(tryCenter, interval);
        };

        tryCenter();
    });
}
