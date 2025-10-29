export const commonModal = (() => {
    const $host = document.querySelector('.common_modal_components');
    if ($host) $host.classList.remove('active'); // 초기엔 닫아두기

    const setMessage = (msg) => {
        const box = $host?.querySelector('.common_modal_box');
        const area = box?.querySelector('.modal_contents p');
        if (area) area.textContent = msg;
    };

    const open = (msg) => {
        if (!$host) return;
        setMessage(msg);
        $host.style.zIndex = '101';
        $host.classList.add('active');
    };

    const close = () => {
        if (!$host) return;
        $host.classList.remove('active');
        $host.style.zIndex = '';
    };

    $host?.querySelector('.btn_confirm')?.addEventListener('click', close);

    return { open, close, host: $host };
})();