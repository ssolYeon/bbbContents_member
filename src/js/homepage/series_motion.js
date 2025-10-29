gsap.registerPlugin(ScrollTrigger);

/**
 * - 렌더 직후 2프레임 대기 → 레이아웃 확정
 * - scroller가 없으면 window로 폴백
 * - 매 재호출 시 기존 트리거/트윈 정리
 * - 이미지/동적 높이 변경시에도 자동 보정
 */
export const seriesMotion = () => {
    const container = document.querySelector(".homepage_series_container");
    if (!container) return;

    const scrollerEl = document.querySelector("#app_wrapper") || window;

    ScrollTrigger.getAll().forEach(st => {
        const trg = st.trigger;
        if (trg && container.contains(trg)) st.kill(true);
    });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const cards = container.querySelectorAll(".series_list .component_card");
            if (!cards.length) {
                return;
            }

            cards.forEach(el => { void el.getBoundingClientRect(); });

            cards.forEach((el, i) => {
                if (i === cards.length - 1) return;

                const tween = gsap.fromTo(
                    el,
                    { filter: "brightness(1)", scale: 1 },
                    {
                        filter: "brightness(0.2)",
                        scale: 0.8,
                        ease: "none",
                        immediateRender: false,
                        scrollTrigger: {
                            trigger: el,
                            scroller: scrollerEl,
                            start: "center center",
                            end: "bottom top",
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    }
                );

                el._seriesTween = tween;
            });

            const imgs = container.querySelectorAll("img");
            let pending = imgs.length;
            if (pending > 0) {
                const once = () => {
                    pending--;
                    if (pending === 0) ScrollTrigger.refresh();
                };
                imgs.forEach(img => {
                    if (img.complete) {
                        once();
                    } else {
                        img.addEventListener("load", once, { once: true });
                        img.addEventListener("error", once, { once: true });
                    }
                });
            }

            ScrollTrigger.refresh();
        });
    });
    
    if (!container._seriesRO) {
        const ro = new ResizeObserver(() => ScrollTrigger.refresh());
        ro.observe(container);
        container._seriesRO = ro;
    }
};
