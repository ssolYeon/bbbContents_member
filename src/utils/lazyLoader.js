
export function createLazyLoader({
         selector = '.lazy_loading_container img[data-src]',
         root = null,
        //  root = document.getElementById('app_wrapper'),
         rootMargin = '1800px 0px',
         threshold = 0,
         classLoading = 'is-loading',
         classLoaded = 'is-loaded',
         classError = 'is-error',
         onEnter = null,
         onLoad = null,
         onError = null,
     } = {}) {

    let io;
    let _root = root;
    let _rootMargin = rootMargin;
    let _threshold = threshold;

    async function loadImg(img) {
        const picture = img.closest('picture');

        if (picture) {
            picture.querySelectorAll('source[data-srcset]').forEach(src => {
                src.srcset = src.dataset.srcset;
                src.removeAttribute('data-srcset');
            });
        }

        if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
        }
        if (img.dataset.sizes) {
            img.sizes = img.dataset.sizes;
            img.removeAttribute('data-sizes');
        }

        img.classList.add(classLoading);

        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }

        // 3) decode()로 부드럽게
        try {
            if ('decode' in img) {
                await img.decode();
            } else {
                await new Promise((res, rej) => {
                    if (img.complete && img.naturalWidth > 0) return res();
                    img.addEventListener('load', res, { once: true });
                    img.addEventListener('error', rej, { once: true });
                });
            }
            img.classList.remove(classLoading);
            img.classList.add(classLoaded);
            if (typeof onLoad === 'function') onLoad(img);
        } catch (e) {
            img.classList.remove(classLoading);
            img.classList.add(classError);
            if (typeof onError === 'function') onError(img, e);
        }
    }

    function onIntersect(entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const img = entry.target;
            if (typeof onEnter === 'function') onEnter(img);
            io.unobserve(img);
            loadImg(img);
        });
    }

    function observe(el) {
        if (!el || !io || !io.observe) return;
        io.observe(el);
    }

    function unobserve(el) {
        if (!el || !io || !io.unobserve) return;
        io.unobserve(el);
    }

    function loadNow(target) {
        if (!target) return;
        if (typeof target === 'string') {
            document.querySelectorAll(target).forEach(el => loadNow(el));
            return;
        }
        const el = target;
        if (el.tagName === 'IMG') return loadImg(el);
        if (el.tagName === 'PICTURE') {
            const img = el.querySelector('img');
            if (img) return loadImg(img);
            return;
        }
        const img = el.querySelector && el.querySelector('img[data-src]');
        if (img) return loadImg(img);
    }

    function setRoot(newRoot) {
        _root = newRoot || null;
        if (io && io.disconnect) io.disconnect();
        if ('IntersectionObserver' in window) {
            io = new IntersectionObserver(onIntersect, { root: _root, rootMargin: _rootMargin, threshold: _threshold });
        } else {
            io = { observe: loadImg, unobserve: () => {}, disconnect: () => {} };
        }
        observeAll();
    }

    function observeAll(ctx = document) {
        ctx.querySelectorAll(selector).forEach(el => io.observe(el));
    }

    function init(ctx = document) {
        if ('IntersectionObserver' in window) {
            io = new IntersectionObserver(onIntersect, { root: _root, rootMargin: _rootMargin, threshold: _threshold });
        } else {
            // 폴백: 관찰 없이 즉시 로드
            io = { observe: loadImg, unobserve: () => {}, disconnect: () => {} };
        }
        observeAll(ctx);
    }

    function refresh(ctx = document) {
        observeAll(ctx);
    }

    function disconnect() {
        io && io.disconnect();
    }

    return { init, refresh, disconnect, observe, unobserve, loadNow, setRoot };
}
