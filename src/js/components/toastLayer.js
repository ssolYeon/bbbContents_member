export const toastLayerHandler =(message)=> {
    const $toast = document.createElement('div');
    const $main = document.querySelector('main');
    
    $toast.className = 'toast';
    $toast.textContent = message;

    $main.appendChild($toast);

    requestAnimationFrame(()=> {
        $toast.style.opacity = '1';
        $toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(()=> {
        $toast.style.opacity = '0';
        $toast.style.transform = 'translateX(-50%) translateY(6rem)';
        $toast.addEventListener('transitionend', () => {
            $toast.remove();
        }, { once: true });
    }, 2000);
}