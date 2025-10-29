export const showInformation = ()=>{
    const $btnToggle = document.querySelector('.btn_business_toggle');
    const $informationContainer = document.querySelector('.footer_business_information_container');

    if($btnToggle && $informationContainer){
        $btnToggle.addEventListener('click', ()=>{
            $btnToggle.classList.toggle('active');
            $informationContainer.classList.toggle('active');
        })
    }
}