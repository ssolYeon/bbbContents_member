import {createLazyLoader} from "../../utils/lazyLoader.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {showInformation} from "../common/footer.js";
import {initSearchHandler} from "../../utils/searchHandler.js";

const wishlistController = (() => {
    let lazy;
    const lazyLoader = ()=>{
        lazy = createLazyLoader({
            selector: '.lazy_loading_container img[data-src]',
            root: null,
            rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad:  (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        lazy.init();
    }
    const initialize = async() => {
        lazyLoader();
        showInformation();
        bindCaptureToast({
            bindClick: false,
            listen: true,
            //getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
            //getText: (_btn, next) => next ? '스크랩 되었습니다.' : '취소되었습니다.',
        });
        bindCaptureToggle({
            endpoint: '/api/capture',
            //dewbian 로그인 포함
            goLogin: goLogin, // 로그인 함수 전달
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error('Login required');
                }
            },
            // 스크랩 취소 시 아이템 삭제 처리
            onToggleEnd: (btn, { prev, next, postId, success }) => {
                if (success && prev === 1 && next === 0) {
                    const postRemove = btn.closest('[data-remove]')?.getAttribute('data-remove');
                    if (postRemove === '1') {
                        const liElement = btn.closest('li');
                        if (liElement && liElement.closest('.wishlist_list_container')) {
                            liElement.style.transition = 'opacity 0.3s ease';
                            liElement.style.opacity = '0';

                            setTimeout(() => {
                                liElement.remove();

                                const totalCountElement = document.querySelector('.total_posts b');
                                const currentCount = parseInt(totalCountElement.textContent.replace(/,/g, ''),10);
                                const newCount = Math.max(0, currentCount - 1);
                                totalCountElement.textContent = newCount.toLocaleString();

                                // 댓글이 모두 삭제된 경우 빈 데이터 메시지 표시
                                if (newCount === 0) {
                                    const listContainer = document.querySelector('.wishlist_list_container');
                                    if (contentType === 'bs') {
                                        var contentName = "시리즈";
                                        var contentLink = "/bs";
                                    } else {
                                        var contentName = "콘텐츠";
                                        var contentLink = "/bc";
                                    }
                                    listContainer.innerHTML =
                                        '<div class="bbb_empty_container">\n' +
                                        '                <img src="/src/assets/images/icons/icon_cart_empty@x3.png" alt="">\n' +
                                        '                <p>찜 내역이 없습니다.</p>\n' +
                                        '                <div class="button_container">\n' +
                                        '                    <a href="' + contentLink + '">' + contentName + ' 보기</a>\n' +
                                        '                </div>\n' +
                                        '            </div>';
                                }

                            }, 300);
                        }
                    }
                }
            }
        });
        initSearchHandler();
    };
    return { init: initialize };
})();

document.addEventListener('DOMContentLoaded', wishlistController.init);
