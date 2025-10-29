// utils/autoHideHeader.js
// 스크롤 방향에 따라 header를 자동으로 숨김/노출
// - header에 classHidden(기본: 'is-hidden') 클래스 토글
// - 스크롤 컨테이너 기본값은 #app_wrapper, 없으면 window를 사용

export const bindAutoHideHeader = ({
       scrollRootSelector = '#app_wrapper', // 스크롤 컨테이너
       headerSelector = 'header',            // 헤더
       classHidden = 'is-hidden',            // 숨김 클래스명
       downHideThreshold = 10,               // 이 값 이상 아래로 스크롤하면 숨기기
       upShowThreshold = 5,                  // 이 값 이상 위로 스크롤하면 보이기
       revealAtTop = true,                   // 최상단 근처면 항상 보이기
   } = {}) => {
    const header = document.querySelector(headerSelector);
    if (!header) return () => {};

    const rootEl = document.querySelector(scrollRootSelector);
    const usingWindow = !rootEl;
    const getScrollTop = () => usingWindow
        ? (window.pageYOffset || document.documentElement.scrollTop || 0)
        : (rootEl.scrollTop || 0);

    let lastY = getScrollTop();
    let ticking = false;

    // 현재 보여짐 여부
    const isHidden = () => header.classList.contains(classHidden);
    const hide = () => header.classList.add(classHidden);
    const show = () => header.classList.remove(classHidden);

    const onScroll = () => {
        const currentY = getScrollTop();
        const delta = currentY - lastY;

        const apply = () => {
            if (revealAtTop && currentY <= 0) {
                show();
                lastY = currentY;
                ticking = false;
                return;
            }

            if (delta > downHideThreshold) {
                if (!isHidden()) hide();
            } else if (delta < -upShowThreshold) {
                if (isHidden()) show();
            }

            lastY = currentY;
            ticking = false;
        };

        if (!ticking) {
            ticking = true;
            requestAnimationFrame(apply);
        }
    };

    const target = usingWindow ? window : rootEl;
    target.addEventListener('scroll', onScroll, { passive: true });

    return () => target.removeEventListener('scroll', onScroll);
}
