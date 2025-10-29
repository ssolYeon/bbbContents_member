export const visualSliderController = (() => {
    let rafId;
    let timeoutId;
    let currentVideo = null;

    const IMAGE_SLIDE_DURATION_MS = 5000;

    // 실슬라이드 개수(loop=true 지원)
    const getRealCount = (swiper) => {
        const nonDup = swiper.el.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;
        const all = swiper.el.querySelectorAll('.swiper-wrapper .swiper-slide').length;
        return nonDup || all;
    };

    const getCurrentIndex1Based = (swiper) =>
        (typeof swiper.realIndex === 'number' ? swiper.realIndex : swiper.activeIndex) + 1;

    const selectUI = (swiper) => {
        const root = swiper.el;
        return {
            barEl: root.querySelector('.slide_controller .progressbar .bar'),
            currentEl: root.querySelector('.slide_controller .slide_counter .current'),
            totalEl: root.querySelector('.slide_controller .slide_counter .total'),
        };
    };

    const stopTimers = () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeoutId);
    };

    const resetProgress = (barEl) => {
        if (!barEl) return;

        barEl.style.transform = 'scaleX(0)';
    };

    const startProgressAnim = (swiper, durationMs) => {
        const { barEl } = selectUI(swiper);
        if (!barEl) return;

        stopTimers();
        resetProgress(barEl);

        const start = performance.now();
        const tick = (now) => {
            const p = Math.min((now - start) / durationMs, 1);
            barEl.style.transform = `scaleX(${p})`;

            if (p < 1) {
                rafId = requestAnimationFrame(tick);
            }
        };
        rafId = requestAnimationFrame(tick);

        timeoutId = setTimeout(() => {
            swiper.slideNext();
        }, durationMs);
    };

    const updateCounter = (swiper) => {
        const { currentEl, totalEl } = selectUI(swiper);
        if (currentEl) currentEl.textContent = String(getCurrentIndex1Based(swiper));
        if (totalEl) totalEl.textContent = `${getRealCount(swiper)}`;
    };

    const handleSlideStart = (swiper) => {
        if (currentVideo) {
            try {
                currentVideo.pause();
                currentVideo.currentTime = 0;
            } catch {}
            currentVideo = null;
        }

        updateCounter(swiper);

        const slideEl = swiper.slides[swiper.activeIndex];
        const video = slideEl && slideEl.querySelector('video');

        if (video) {
            currentVideo = video;
            const p = video.play();
            if (p && typeof p.then === 'function') p.catch(() => {});

            const begin = () => {
                if (swiper.slides[swiper.activeIndex] !== slideEl) return;
                const d = Number.isFinite(video.duration) && video.duration > 0
                    ? video.duration * 1000
                    : IMAGE_SLIDE_DURATION_MS;

                video.addEventListener('ended', () => swiper.slideNext(), { once: true });
                startProgressAnim(swiper, d);
            };

            if (Number.isFinite(video.duration) && video.duration > 0) {
                begin();
            } else {
                video.addEventListener('loadedmetadata', begin, { once: true });
            }
        } else {
            startProgressAnim(swiper, IMAGE_SLIDE_DURATION_MS);
        }
    };

    const initialize = () => {
        new Swiper('.progress_swiper', {
            loop: true,
            pagination: { el: '.swiper-pagination', clickable: true },
            on: {
                init(swiper) {
                    updateCounter(swiper);
                    handleSlideStart(swiper);
                },
                slideChangeTransitionStart(swiper) {
                    stopTimers();
                    handleSlideStart(swiper);
                },
                slidesLengthChange(swiper) {
                    updateCounter(swiper);
                },
                destroy() {
                    stopTimers();
                },
            },
        });
    };

    return { init: initialize };
})();





export const countVisualSlider = () => {
    document.querySelectorAll('.counter_swiper').forEach((swiperEl) => {
        const $current = swiperEl.querySelector('.counter .current');
        const $total   = swiperEl.querySelector('.counter .total');

        const getRealCount = () => {
            const nonDup = swiperEl.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;
            const all    = swiperEl.querySelectorAll('.swiper-wrapper .swiper-slide').length;
            return nonDup || all;
        };
        const setTotal = () => { if ($total) $total.textContent = `/${getRealCount()}`; };
        const setCurrent = (s) => {
            const idx = (typeof s.realIndex === 'number' ? s.realIndex : s.activeIndex) + 1;
            if ($current) $current.textContent = String(idx);
        };

        new Swiper(swiperEl, {
            loop: true,
            slidesPerView: 1,
            speed: 300,
            on: {
                init(s) {
                    setTotal();
                    setCurrent(s);
                },
                slideChange(s) {
                    setCurrent(s);
                },
                slidesLengthChange() {
                    setTotal();
                },
            },
        });
    });
};