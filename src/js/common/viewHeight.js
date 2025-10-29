export const setViewHeight = () => {
    const method = {
        setHeight: () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        },
        onResize: () => {
            method.setHeight();
        }
    };

    const bindEvent = () => {
        window.addEventListener("resize", method.onResize);
    };

    const initialize = () => {
        method.setHeight();
        bindEvent();
    };

    return {
        init: initialize
    };
};