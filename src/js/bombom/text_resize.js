export const textResize = (options = {}) => {
    const controlsSel = options.controlsSel || '.resize_container';
    const containerSel = options.containerSel || '.post_content_container';
    const scaleSteps   = options.scaleSteps  || [1, 1.2, 1.5, 1.8, 2];
    const lhFactor     = options.lhFactor    || 0.4;
    const baseSize     = options.baseSize    || '1.6rem';

    const controls  = document.querySelector(controlsSel);
    const container = document.querySelector(containerSel);
    if (!controls || !container) return;

    const btns     = controls.querySelectorAll('button');
    if (btns.length < 2) return;
    const minusBtn = btns[0];
    const plusBtn  = btns[btns.length - 1];

    const LS_KEY = 'readerScaleLevel';
    let level = Number(localStorage.getItem(LS_KEY) || 0) || 0;
    level = Math.max(0, Math.min(scaleSteps.length - 1, level));

    container.style.fontSize = baseSize;

    function applyScale() {
        const scale   = scaleSteps[level];
        const lhScale = 1 + (scale - 1) * lhFactor;

        container.style.setProperty('--reader-scale', String(scale));
        container.style.setProperty('--reader-lh-scale', String(lhScale));

        minusBtn.disabled = (level === 0);
        plusBtn.disabled  = (level === scaleSteps.length - 1);

        localStorage.setItem(LS_KEY, String(level));
    }
    applyScale();

    plusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (level < scaleSteps.length - 1) {
            level += 1;
            applyScale();
        }
    });

    minusBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (level > 0) {
            level -= 1;
            applyScale();
        }
    });

    return {
        get level() { return level; },
        set level(v) {
            level = Math.max(0, Math.min(scaleSteps.length - 1, v|0));
            applyScale();
        },
        reset() {
            level = 0;
            applyScale();
        },
        setBaseSize(sz = '1.6rem') {
            container.style.fontSize = sz;
            applyScale();
        }
    };
};
