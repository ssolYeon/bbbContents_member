export const gnbHandler = () => {
    const body = document.querySelector('body');
    const header = document.querySelector('header');
    const gnb = header?.querySelector('.gnb');
    const gnbWrap = header?.querySelector('.header_lnb');
    const gnbOpenBtn = header?.querySelector('.gnb_btn')

    gnbOpenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = header.classList.contains('open');

        if (isOpen) {
            header.classList.remove('open');
            body.classList.remove('gnb_open');
            
        } else {
            header.classList.add('open');
            body.classList.add('gnb_open');
        }
    });


    gnb.addEventListener('click', (e) => {
        const btn = e.target.closest('.js_gnb_open_button');
        if (!btn) return;

        const targetItem = btn.closest('.gnb_1depth');
        if (!targetItem) return;

        const allItems = gnb.querySelectorAll('.gnb_1depth');
        allItems.forEach(item => item.classList.remove('on'));
        targetItem.classList.add('on');
    });

    document.addEventListener('click', (e)=> {
        const isInside = gnbWrap.contains(e.target);
        if (!isInside) {
            header.classList.remove('open');
            body.classList.remove('gnb_open');
        }
    })

    window.addEventListener('resize', ()=> {
        if (window.innerWidth >= 820) {
            header.classList.remove('open');
        }
    })
};