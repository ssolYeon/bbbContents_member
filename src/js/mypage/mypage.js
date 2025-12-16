import {createLazyLoader} from "../../utils/lazyLoader.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {showInformation} from "../common/footer.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {commonModal} from "../../utils/commonModal.js";
import {allmenu} from "../common/allmenu.js";
import {wheelCustom} from "../../utils/horizontalScroll.js";

const mypageController = (() => {
    let lazy;

    const lazyLoader = ()=>{
        lazy = createLazyLoader({
            // selector: '.lazy_loading_container img[data-src]',
            // root: null,
            // rootMargin: '0px 0px',
            onEnter: (img) => img.classList.add('is-loading'),
            onLoad:  (img) => {
                img.classList.remove('is-loading');
                img.classList.add('is-loaded');
            },
        });
        lazy.init();
    };

    const bindModalHandlers = () => {
        //const openButtons = document.querySelectorAll(".degree dt button, .point dt button, .btn_rank_info");
        const openButtons = document.querySelectorAll(".degree dt button, .point dt button");
        openButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const container = btn.closest("div"); // .degree 또는 .point 또는 .profile_name
                const modal = container.querySelector(".modal_container");
                modal?.classList.add("active");
            });
        });

        const closeButtons = document.querySelectorAll(".modal_container .btn_closed");
        closeButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const modal = btn.closest(".modal_container");
                modal?.classList.remove("active");
            });
        });
    };

    const historyNavigationHandler = () =>{
        const btnToggle = document.querySelector(".btn_toggle");
        const container = document.querySelector(".user_information_container .account_history_container + .navigation_container .navigation");
        if (!btnToggle || !container) return;
        btnToggle.addEventListener('click',()=> container.classList.toggle('active'));
    };

    /** 뉴스레터 구독: 셀렉트 ↔ 직접입력 토글 + 유효성 + 모달 */
    /** 프로필 이미지 업로드 */
    const bindProfileUpload = () => {
        const profileInput = document.getElementById('profileInput');
        const profilePreview = document.getElementById('profilePreview');

        if (!profileInput || !profilePreview) {
            console.warn('프로필 업로드 요소를 찾을 수 없습니다.');
            return;
        }

        profileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];

            if (!file) return;

            // 파일 타입 검증
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }

            // 파일 크기 검증 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기는 5MB를 초과할 수 없습니다.');
                return;
            }

            // 미리보기
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // 서버에 업로드
            const formData = new FormData();
            formData.append('profile_img', file);

            try {
                const response = await fetch('/api/profile/upload', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    console.log('프로필 이미지 업로드 성공:', result.file_path);
                } else {
                    alert(result.message || '프로필 이미지 업로드에 실패했습니다.');
                    // 실패 시 원래 이미지로 복원
                    if (result.original_img) {
                        profilePreview.src = result.original_img;
                    }
                }
            } catch (error) {
                console.error('프로필 업로드 에러:', error);
                alert('네트워크 오류가 발생했습니다.');
            }
        });
    };

    /** Swiper 초기화 */
    const initSwiper = () => {
        const swiperElement = document.querySelector('.mySwiper');

        if (!swiperElement) {
            console.warn('Swiper 요소를 찾을 수 없습니다.');
            return;
        }

        // 예약 구매 상품 스와이퍼
        const swiper = new Swiper('.mySwiper', {
            slidesPerView: 'auto',
        });
    };

    const bindNewsletterSubscribe = () => {
        const emailId = document.getElementById('email_id');
        const emailDomain = document.getElementById('email_domain');
        const domainSelect = document.getElementById('domain_select');
        const agreeCheck = document.getElementById('agree');
        const btnSubscribe = document.getElementById('btn_subscribe');
        const btnUnsubscribe = document.getElementById('btn_unsubscribe');

        const modalSubscribe = document.getElementById('modal_subscribe');
        const modalUnsubscribe = document.getElementById('modal_unsubscribe');
        const modalError = document.getElementById('modal_error');
        const errorMessage = document.getElementById('error_message');

        // 요소 존재 확인
        if (!emailId || !emailDomain || !domainSelect || !btnSubscribe) {
            console.warn('뉴스레터 구독 요소를 찾을 수 없습니다.');
            return;
        }

        console.log('뉴스레터 구독 초기화 완료');

        // 도메인 선택 처리
        domainSelect.addEventListener('change', function() {
            console.log('도메인 선택:', this.value);
            if (this.value === 'direct' || this.value === '') {
                emailDomain.value = '';
                emailDomain.readOnly = false;
                emailDomain.style.display = 'inline-block';
                domainSelect.style.display = 'none';
                emailDomain.focus();
            } else {
                emailDomain.value = this.value;
                emailDomain.readOnly = true;
            }
        });

        // 구독 신청
        btnSubscribe.addEventListener('click', async function() {

            console.log('구독 버튼 클릭됨');
            if (!validateForm()) return;

            const email = `${emailId.value}@${emailDomain.value}`;
            console.log('구독 요청 이메일:', email);

            try {
                const response = await fetch('/api/newsletter/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        email: email,
                        name: 'guest',
                        marketing_allowed: true
                    })
                });

                const result = await response.json();
                console.log('구독 응답:', result);

                if (response.ok) {
                    showModal(modalSubscribe);
                } else {
                    showError(result.message || '구독 신청에 실패했습니다.');
                }
            } catch (error) {
                console.error('구독 에러:', error);
                showError('네트워크 오류가 발생했습니다.');
            }
        });

        // 구독 취소
        if (btnUnsubscribe) {
            btnUnsubscribe.addEventListener('click', async function() {
                if (!emailId.value || !emailDomain.value) {
                    showError('이메일을 입력해주세요.');
                    return;
                }

                if (!confirm('정말 구독을 취소하시겠습니까?')) return;

                const email = `${emailId.value}@${emailDomain.value}`;

                try {
                    const response = await fetch('/api/newsletter/unsubscribe', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                        },
                        body: JSON.stringify({
                            email: email
                        })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        showModal(modalUnsubscribe);
                        clearForm();
                    } else {
                        showError(result.message || '구독 취소에 실패했습니다.');
                    }
                } catch (error) {
                    showError('네트워크 오류가 발생했습니다.');
                }
            });
        }

        // 유효성 검사
        function validateForm() {
               if (!emailId.value.trim()) {
                showError('이메일 아이디를 입력해주세요.');
                return false;
            }
            if (!emailDomain.value.trim()) {
                showError('이메일 도메인을 입력해주세요.');
                return false;
            }

            if (!agreeCheck.checked) {
                showError('개인정보 수집 및 이용약관에 동의해주세요.');
                return false;
            }

            return true;
        }

        // 모달 표시
        function showModal(modal) {
            if (modal) {
                modal.style.display = 'block';
            }
        }

        // 에러 표시
        function showError(message) {
            if (errorMessage && modalError) {
                errorMessage.innerHTML = `<strong>${message}</strong>`;
                showModal(modalError);
            } else {
                alert(message);
            }
        }

        // 폼 초기화
        function clearForm() {
            emailId.value = '';
            emailDomain.value = '';
            domainSelect.value = '';
            domainSelect.style.display = 'inline-block';
            emailDomain.style.display = 'inline-block';
            agreeCheck.checked = false;
        }

        // 모달 닫기
        document.querySelectorAll('.btn_close').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.newsletter_modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
    };

    const initialize = async() => {
        lazyLoader();
        showInformation();
        bindCaptureToast({
            bindClick: false,
            listen: true,
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
            // onToggleEnd 훅을 사용해서 성공 시에만 삭제 처리
            onToggleEnd: (btn, { prev, next, postId, success }) => {
                if (success && prev === 1 && next === 0) {
                    const postRemove = btn.closest('[data-remove]')?.getAttribute('data-remove');
                    if (postRemove === '1') {
                        const liElement = btn.closest('li');
                        if (liElement && liElement.closest('.mypage_wish_list_container')) {
                            liElement.style.transition = 'opacity 0.3s ease';
                            liElement.style.opacity = '0';

                            setTimeout(() => {
                                liElement.remove();
                                const remainingItems = document.querySelectorAll('.mypage_wish_list_container li').length;
                                if (remainingItems === 0) {
                                    document.querySelector('.list_horizontal').innerHTML =
                                        '<li class="empty_message">찜한 상품이 없습니다.</li>';
                                }
                            }, 300);
                        }
                    }
                }
            }
        });

        initSearchHandler();
        bindModalHandlers();
        historyNavigationHandler();
        bindProfileUpload();
        initSwiper();
        //bindNewsletterSubscribe();
        allmenu();
        wheelCustom();
    };

    return { init: initialize };
})();

document.addEventListener('DOMContentLoaded', mypageController.init);
