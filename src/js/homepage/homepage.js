import {requestJson} from "../../utils/requestJson.js";
import {escapeHtml} from "../../utils/escapeHtml.js";
import {visualSliderController} from "../../utils/sliderController.js";
import {createLazyLoader} from "../../utils/lazyLoader.js";
import {renderCategory, renderTag, getCaptureIconSrc, discountPercent} from "../../utils/renderCardMeta.js";
import {bindCaptureToast} from "../../utils/captureToast.js";
import {bindCaptureToggle} from "../../utils/bindCaptureToggle.js";
import {showInformation} from "../common/footer.js";
import {initSearchHandler} from "../../utils/searchHandler.js";
import {seriesMotion} from "./series_motion.js";
import {wheelCustom} from "../../utils/horizontalScroll.js";
import {cardTemplates} from "../../utils/renderCardTemplate.js";

const homepageController = (() => {
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
    }

    const renderCarousel = () => {
        const $container = document.querySelector('.homepage_visual_container');

        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0100', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();
                    const items = data?.M0100.groups ?? [];
                    if (items.length > 0) {
                        methods.renderContent(data?.M0100.groups ?? []);

                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.error('홈페이지 데이터 로드 실패:', err);
                }
            },

            renderContent: (groups = []) => {
                if (!groups.length) return;

                // 첫 번째 그룹의 아이템들만 사용
                const items = groups[0]?.items || [];
                const $list = $container.querySelector('.swiper-wrapper');

                if (!$list) return;

                const renderSlider = (item) => {
                    const {type, category, title, description, thumbnail, detail_url} = item;

                    // type이 video인 경우 (thumbnail을 source로 사용)
                    if (type === 'video') {
                        return `
                      <div class="swiper-slide slider" role="group" aria-label="${title}">
                        <a href="${detail_url}">
                          <div class="slider_thumbnail_container">
                            <video playsinline muted autoplay loop>
                              <source src="${thumbnail}" type="video/mp4">
                            </video>
                          </div>
                          <div class="slider_text_container">
                            <span class="category">${category}</span>
                            <span class="title">${title}</span>
                            <p class="description">${description}</p>
                          </div>
                        </a>
                      </div>
                    `;
                    }

                    return `
                    <div class="swiper-slide slider" role="group" aria-label="${title}">
                      <a href="${detail_url}">
                        <div class="slider_thumbnail_container">
                          <img src="${thumbnail}" alt="${title}">
                        </div>
                        <div class="slider_text_container">
                          <span class="category">${category}</span>
                          <span class="title">${title}</span>
                          <p class="description">${description}</p>
                        </div>
                      </a>
                    </div>
                `;
                }

                $list.innerHTML = items.map(renderSlider).join("");

                // 기존 슬라이더 컨트롤러 초기화
                if (typeof visualSliderController !== 'undefined') {
                    visualSliderController.init();
                }
            }
        };

        // API 호출 시작
        methods.requestAPI();
    };
    const latestBomBom = async () => {

        const $container = document.querySelector('.homepage_bombom_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0200', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();

                    let items = [];
                    if(data && data.M0200) {
                        items = data?.M0200.groups ?? [];
                    }
                    if (items.length > 0) {
                        methods.renderContent(data?.M0200.groups ?? []);
                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }

                } catch (err) {
                    console.error('메인 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent([]);
                }
            },

            renderContent: (data = []) => {
                if (!$container) return;
                let groups = [];
                if (Array.isArray(data)) {
                    groups = data;
                } else if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                const groupsHtml = groups.map(group => {
                    const { group_info, items } = group;
                    //const groupTitle = group_info.title;
                    const groupTitle = group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
                    // items 배열을 직접 사용 (현재 데이터 구조)
                    const posts = Array.isArray(items) ? items : [];
                    //console.log(JSON.stringify(posts));
                    const itemsHtml =  posts.map(item => cardTemplates.contentCard_home(item, 'half')).join('');
                    return `
                        <section class="curation">
                            <div class="title_container">
                                <h2 class="title">${groupTitle}</h2>
                                <a href="/bc?group=${group_info.gidx}" class="btn_view_more">
                                    <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                                </a>
                            </div>
                            <ul role="list" class="bombom_list list_contents">
                                ${itemsHtml}
                            </ul>
                        </section>
                    `;
                }).join('');

                $container.innerHTML = groupsHtml;
                lazy.refresh($container);
            }
        };
        methods.requestAPI();
    };
    const latestSeries = async () => {

        const $container = document.querySelector('.homepage_series_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0300', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();
                    if(data && data.M0300){
                        methods.renderContent(data?.M0300.groups ?? []);
                    }
                } catch (err) {
                    console.error('메인 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent([]);
                }
            },
            renderContent: (data = []) => {
                if (!$container) return;

                let groups = [];
                if (Array.isArray(data)) {
                    groups = data;
                } else if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                if (groups.length === 0) {
                    $container.innerHTML = '';
                    return;
                }

                const firstGroup = groups[0];
                const restGroups = groups.slice(1);

                // 첫 번째 그룹 타이틀 처리
                const firstGroupTitle = firstGroup.group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');


                // 첫 번째 그룹 세로 리스트
                const verticalItems =  firstGroup.items.map(item => cardTemplates.seriesCard(item, 'full')).join('');


                const secondGroup = groups[1];
                let secondGroupTitle = '';
                if(secondGroup){
                    secondGroupTitle = secondGroup.group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
                }else{
                }



                // 나머지 그룹들 가로 리스트
                const horizontalItems = restGroups.flatMap(group => {
                    return group.items.map(item => cardTemplates.seriesCard_home(item, 'full')).join('');
                }).join('');

                // 최종 HTML 생성
                const groupsHtml = `
                    <section class="curation">
                            <div class="title_container">
                                <h2 class="title">${firstGroupTitle}</h2>
                                <a href="/bs?group=${firstGroup.group_info.gidx}" class="btn_view_more">
                                    <img src="/src/assets/images/icons/icon_btn_view_more_white@x3.png" alt="">
                                </a>
                            </div>
                            <ul role="list" class="series_list list_contents">
                                ${verticalItems}
                            </ul>
                     </section>
                ${horizontalItems ? `
                    <section class="curation">
                        <div class="title_container">
                            <h2 class="title">${secondGroupTitle}</h2>
                            <a href="/bs?group=${secondGroup.group_info.gidx}" class="btn_view_more">
                                <img src="/src/assets/images/icons/icon_btn_view_more_white@x3.png" alt="">
                            </a>
                        </div>
                        <ul role="list" class="list_horizontal ">
                            ${horizontalItems}
                        </ul>
                    </section>
                ` : ''}
            `;

                $container.innerHTML = groupsHtml;
                lazy.refresh($container)

                // const $lists = $container.querySelectorAll('.series_list, .list_horizontal');
                // $lists.forEach(list => lazy.refresh(list));
                seriesMotion();
            }
        };
        methods.requestAPI();
    };
    const latestNewContents = async () => {

        const $container = document.querySelector('.homepage_new_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0400', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();
                    let items = [];
                    if(data && data.M0400) {
                        items = data?.M0400.groups ?? [];
                    }
                    if (items.length > 0) {
                        methods.renderContent(data?.M0400.groups ?? []);
                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.error('메인 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent([]);
                }
            },

            renderContent: (data = []) => {
                if (!$container) return;
                let groups = [];
                if (Array.isArray(data)) {
                    groups = data;
                } else if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                const groupsHtml = groups.map(group => {
                    const { group_info, items } = group;
                    //const groupTitle = group_info.title;
                    const groupTitle = group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

                    // items 배열을 직접 사용 (현재 데이터 구조)
                    const posts = Array.isArray(items) ? items : [];

                    const itemsHtml =  posts.map(item => cardTemplates.contentCard(item, 'card_340_340')).join('');

                    return `
                        <section class="curation">
                            <div class="title_container">
                                <h2 class="title">${groupTitle}</h2>
                                <a href="/bc?group=${group_info.gidx}" class="btn_view_more">
                                    <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                                </a>
                            </div>
                            <ul role="list" class="list_horizontal ">
                                ${itemsHtml}
                            </ul>
                        </section>
                    `;
                }).join('');

                $container.innerHTML = groupsHtml;
                lazy.refresh($container);
            }
        };
        methods.requestAPI();
    };
    const latestHaebomContents = async () => {
        const $container = document.querySelector('.homepage_haebom_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0500', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();


                    let items = [];
                    if(data && data.M0500) {
                        items = data?.M0500.groups ?? [];
                    }

                    if (items.length > 0) {
                        methods.renderContent(data?.M0500 || {});
                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.error('해봄 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent({});
                }
            },

            renderContent: (data = {}) => {
                if (!$container) return;

                let groups = [];
                if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                const groupsHtml = groups.map(group => {
                    const { group_info, items } = group;
                    //const groupTitle = group_info.title;
                    const groupTitle = group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

                    // items 배열을 직접 사용
                    const posts = Array.isArray(items) ? items : [];
                    const itemsHtml =  posts.map(item => cardTemplates.haebomCard_home(item, 'half__text')).join('');
                    return `

                    <section class="curation">
                        <div class="title_container">
                            <h2 class="title">${groupTitle}</h2>
                           <a href="/hbl?group=${group_info.gidx}" class="btn_view_more">
                                <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                            </a>
                        </div>
                        <ul role="list" class="haebom_list list_contents">
                            ${itemsHtml}
                        </ul>
                    </section>
                `;
                }).join('');

                $container.innerHTML = groupsHtml;
                lazy.refresh($container);
            }
        };

        methods.requestAPI();
    };
    const latestGabomContents = async () => {
        const $container = document.querySelector('.homepage_gabom_hot_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0600', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();

                    let groups = [];
                    if(data && data.M0600) {
                        groups = data?.M0600.groups ?? [];
                    }
                    if (groups.length > 0) {
                        methods.renderContent(data?.M0600 || {});
                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.error('가봄 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent({});
                }
            },

            renderContent: (data = {}) => {
                if (!$container) return;

                let groups = [];
                if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                // 할인율 계산 함수
                const calculateDiscountRate = (originalPrice, discountPrice) => {
                    if (!originalPrice || !discountPrice) return 0;

                    const original = parseInt(originalPrice.replace(/,/g, ''));
                    const discount = parseInt(discountPrice.replace(/,/g, ''));

                    if (original <= discount) return 0;

                    return Math.ceil(((original - discount) / original) * 100);
                };

                let sectionsHtml = '';

                groups.forEach((group, index) => {
                    const { group_info, items } = group;
                    //const groupTitle = group_info.title;
                    const groupTitle = group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
                    const posts = Array.isArray(items) ? items : [];

                    // 첫 번째 그룹은 hot 컨테이너 (full)
                    // 두 번째 그룹부터는 일반 컨테이너 (half)
                    const isHotSection = index === 0;

                    const itemsHtml =  posts.map(item => cardTemplates.gabomCard(item, 'full')).join('');
                    // 그룹 타이틀 처리 (줄바꿈 적용)
                    const formattedGroupTitle = groupTitle.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

                    // 섹션별 컨테이너 생성
                    if (isHotSection) {
                        // Hot 섹션
                        sectionsHtml += `
                        <section class="homepage_gabom_hot_container">
                           <section class="curation">
                                <div class="title_container">
                                    <h2 class="title">${formattedGroupTitle}</h2>
                                    <a href="/gbl?group=${group_info.gidx}" class="btn_view_more">
                                        <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                                    </a>
                                </div>
                                <ul role="list" class="list_horizontal ">
                                    ${itemsHtml}
                                </ul>
                            </section>
                        </section>
                    `;
                    } else {
                        // 일반 섹션
                        sectionsHtml += `
                        <section class="homepage_gabom_container">
                           <section class="curation">
                            <div class="title_container">
                                <h2 class="title">${formattedGroupTitle}</h2>
                                <a href="/gbl?group=${group_info.gidx}" class="btn_view_more">
                                    <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                                </a>
                            </div>
                            <ul role="list" class="list_horizontal">
                                ${itemsHtml}
                            </ul>
                            </section>
                        </section>
                    `;
                    }
                });

                // 기존 컨테이너를 숨기고 새로운 섹션들을 부모에 추가
                const $parentContainer = $container.parentNode;
                if ($parentContainer) {
                    // 기존 가봄 관련 섹션들 제거
                    const existingGabomSections = $parentContainer.querySelectorAll('.homepage_gabom_container, .homepage_gabom_hot_container');
                    existingGabomSections.forEach(section => section.remove());

                    // sabom_container 찾기 (이 앞에 삽입해야 함)
                    const $sabomContainer = $parentContainer.querySelector('.homepage_sabom_container');

                    // 새로운 섹션들 추가
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = sectionsHtml;

                    // sabom_container 앞에 삽입
                    while (tempDiv.firstChild) {
                        if ($sabomContainer) {
                            $parentContainer.insertBefore(tempDiv.firstChild, $sabomContainer);
                        } else {
                            // sabom_container가 없으면 맨 뒤에 추가
                            $parentContainer.appendChild(tempDiv.firstChild);
                        }
                    }
                }

                lazy.refresh($parentContainer);
            },
        };

        methods.requestAPI();
    };
    const latestSabomContents = async () => {

        const $container = document.querySelector('.homepage_sabom_container');
        const methods = {
            requestAPI: async () => {
                try {
                    const response = await fetch('/api/bbM0700', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': '<?php echo e(csrf_token()); ?>',
                        }
                    });
                    if (!response.ok) throw new Error("데이터 불러오기 실패");
                    const data = await response.json();


                    let items = [];
                    if(data && data.M0700) {
                        items = data?.M0700.groups ?? [];
                    }
                    if (items.length > 0) {
                        methods.renderContent(data?.M0700 || {});
                        if ($container) {
                            $container.style.display = 'block';
                        }
                    } else {
                        if ($container) {
                            $container.style.display = 'none';
                        }
                    }
                } catch (err) {
                    console.error('사봄 콘텐츠 데이터 로드 실패:', err);
                    methods.renderContent({});
                }
            },

            renderContent: (data = {}) => {
                if (!$container) return;

                let groups = [];
                if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                } else {
                    console.error('Invalid data structure:', data);
                    return;
                }

                const groupsHtml = groups.map(group => {
                    const { group_info, items } = group;
                    //const groupTitle = group_info.title;
                    const groupTitle = group_info.title.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');

                    // items 배열을 직접 사용
                    const posts = Array.isArray(items) ? items : [];

                    const itemsHtml =  posts.map(item => cardTemplates.sabomCard(item, 'half')).join('');

                    return `
                    <section class="curation">
                        <div class="title_container">
                            <h2 class="title">${groupTitle}</h2>
                            <a href="/sbl?group=${group_info.gidx}" class="btn_view_more">
                                <img src="src/assets/images/icons/icon_btn_view_more_black@x3.png" alt="">
                            </a>
                        </div>
                        <ul role="list" class="shop_list list_contents">
                            ${itemsHtml}
                        </ul>
                    </section>
                `;
                }).join('');

                $container.innerHTML = groupsHtml;
                lazy.refresh($container);
            }
        };

        methods.requestAPI();
    };
    const initialize = async() => {
        lazyLoader();
        await Promise.all([
            renderCarousel(),
            latestBomBom(),
            latestSeries(),
            latestNewContents(),
            latestHaebomContents(),
            latestGabomContents(),
            latestSabomContents()
        ]);
        showInformation();
        bindCaptureToast({
            bindClick: false,
            listen: true,
            getText: (_btn, next, success) => success ? (next ? '스크랩되었습니다.' : '취소되었습니다.') : '요청에 실패했습니다.',
            //getText: (_btn, next) => next ? '스크랩되었습니다.' : '취소되었습니다.',
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
        });
        initSearchHandler();
        wheelCustom();
    }

    return { init: initialize };
})();

document.addEventListener('DOMContentLoaded', homepageController.init);
