// public/js/master/contents.js
//사용 안함 hoya 251021

document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchBtn = document.getElementById('searchBtn');
    const tabNavigation = document.querySelector('.tab_navigation');
    const tabContents = document.querySelectorAll('.tab_content');
    const dataIndexInput = document.getElementById('data_index');
    const searchInput = document.getElementById('search');

    // 필수 요소들이 존재하는지 확인
    if (!searchForm || !searchBtn || !tabNavigation || !dataIndexInput || !searchInput) {
        console.error('필수 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // 탭별 컨텐츠 리스트와 카운트 요소 매핑
    const tabMapping = {
        '0': { list: '.content_list.cts', count: '.cts_cnt b' },
        '1': { list: '.content_list.srz', count: '.srz_cnt b' },
        '2': { list: '.content_list.habom', count: '.habom_cnt b' },
        '3': { list: '.content_list.gabom', count: '.gabom_cnt b' },
        '4': { list: '.content_list.sabom', count: '.sabom_cnt b' }
    };

    // 탭 클릭 이벤트
    tabNavigation.addEventListener('click', function(e) {
        if (e.target && e.target.hasAttribute('data-index')) {
            // 모든 탭에서 active 클래스 제거
            document.querySelectorAll('.tab_navigation button').forEach(btn => {
                btn.classList.remove('active');
            });

            // 모든 탭 컨텐츠에서 active 클래스 제거
            tabContents.forEach(content => {
                content.classList.remove('active');
            });

            // 클릭된 탭에 active 클래스 추가
            e.target.classList.add('active');

            // 해당 탭 컨텐츠에 active 클래스 추가
            const dataIndex = e.target.getAttribute('data-index');
            if (dataIndex && tabContents[parseInt(dataIndex)]) {
                tabContents[parseInt(dataIndex)].classList.add('active');
            }

            // data-index 값을 hidden input에 설정
            if (dataIndexInput && dataIndex) {
                dataIndexInput.value = dataIndex;
            }

            // 폼 자동 제출
            submitForm();
        }
    });

    // 검색 버튼 클릭 이벤트
    searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        submitForm();
    });

    // 검색 입력 필드에서 엔터키 이벤트
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitForm();
        }
    });

    // 폼 제출 함수
    function submitForm() {
        if (!searchForm || !dataIndexInput) {
            console.error('필수 폼 요소를 찾을 수 없습니다.');
            return;
        }

        const formData = new FormData(searchForm);
        const dataIndex = dataIndexInput.value || '0';

        // search와 data_index 값 확인
        const searchValue = searchInput ? searchInput.value : '';
        console.log('전송 데이터:', {
            search: searchValue,
            data_index: dataIndex
        });

        // 해당 탭의 요소들 가져오기
        const mapping = tabMapping[dataIndex];
        if (!mapping) {
            console.error('유효하지 않은 data-index:', dataIndex);
            return;
        }

        const contentList = document.querySelector(mapping.list);
        const countElement = document.querySelector(mapping.count);

        if (!contentList) {
            console.error('컨텐츠 리스트 요소를 찾을 수 없습니다:', mapping.list);
            return;
        }

        if (!countElement) {
            console.error('카운트 요소를 찾을 수 없습니다:', mapping.count);
            return;
        }

        // 로딩 표시
        showLoading(contentList);

        // CSRF 토큰 가져오기
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        const headers = {
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (csrfToken) {
            headers['X-CSRF-TOKEN'] = csrfToken.getAttribute('content');
        }

        const actionUrl = searchForm.getAttribute("action") || searchForm.action;

        fetch(actionUrl, {
            method: 'POST',
            body: formData,
            headers: headers
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                hideLoading();

                if (data.success && data.data && Array.isArray(data.data)) {
                    renderContents(data.data, dataIndex, contentList, countElement);
                } else {
                    console.log('데이터가 없거나 실패:', data);
                    renderContents([], dataIndex, contentList, countElement);
                }
            })
            .catch(error => {
                hideLoading();
                console.error('AJAX 요청 에러:', error);
                renderContents([], dataIndex, contentList, countElement);
            });
    }

    // 컨텐츠 렌더링 함수
    function renderContents(contents, dataIndex, contentList, countElement) {
        if (!contentList || !countElement) {
            console.error('렌더링할 요소를 찾을 수 없습니다.');
            return;
        }

        let html = '';

        contents.forEach(function(item) {
            html += createCardHTML(item, dataIndex);
        });

        contentList.innerHTML = html;
        countElement.textContent = contents.length;

        console.log(`탭 ${dataIndex}에 ${contents.length}개 아이템 렌더링 완료`);
    }

    // 카드 HTML 생성 함수 (탭별 다른 양식)
    function createCardHTML(item, dataIndex) {
        // 날짜 포맷팅
        const displayDate = formatDate(item.vsdate || new Date().toISOString());

        // 이미지 경로 설정 (기본 이미지 사용)
        const imageSrc = item.thum_s || '/src/assets/images/components/sample_360x480@x3.jpg';

        // vsdate_txt 값 사용 (노출예정 또는 빈값)
        const vsDateText = item.vsdate_txt || '';

        // 키워드 처리 - keywords 배열에서 keyword 값만 추출하여 # 추가
        let tagHTML = '';
        if (item.keywords && Array.isArray(item.keywords) && item.keywords.length > 0) {
            tagHTML = item.keywords.map(keywordObj => `<span>#${keywordObj.keyword}</span>`).join('');
        } else {
            // 키워드가 없을 때 기본 태그
            // tagHTML = '<span>#태그없음</span>';
            tagHTML = '';
        }

        // 탭별 다른 HTML 생성
        switch(dataIndex) {
            case '0': // bc - 기본 컨텐츠
                return createBcCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
            case '1': // bs - 시리즈
                return createBsCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
            case '2': // hb - 해봄
                return createHbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
            case '3': // gb - 가봄
                return createGbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
            case '4': // sb - 사봄
                return createSbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
            default:
                return createBcCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML);
        }
    }

    // bc (컨텐츠) 카드 HTML
    function createBcCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML) {
        return `
            <li class="card_item">
                <div class="checkbox_container">
                    <label class="chk_input">
                        <input type="checkbox" name="use_chk" value="${item.idx || ''}">
                        <span></span>
                    </label>
                    <div class="date">
                        <input type="hidden" name="cidx[]" value="${item.idx}">
                        <input type="hidden" name="is_type[]" value="${item.is_type || 'bc'}">
                        <span>${vsDateText}</span>
                        <span>${displayDate}</span>
                    </div>
                </div>
                <div class="component_card card_340_340">
                    <div class="thumbnail">
                        <a href="javascript:void(0)">
                            <picture class="lazy_loading_container">
                                <img src="${imageSrc}" alt="${item.title || ''}" loading="lazy">
                            </picture>
                        </a>
                        <div class="card_top_marker">
                            ${item.stitle ? `<span>${item.stitle}</span>` : ''}
                            ${item.ktitle ? `<span>${item.ktitle}</span>` : ''}
                        </div>
                        <div class="card_tag_container">
                            ${tagHTML}
                        </div>
                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            <p class="card_title text_ellipsis_2">
                                ${item.title || '제목 없음'}
                            </p>
                            <p class="card_description text_ellipsis_2">
                                ${item.description || '설명이 없습니다.'}
                            </p>
                        </a>
                    </div>
                </div>
            </li>
        `;
    }

    // bs (시리즈) 카드 HTML
    function createBsCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML) {
        return `
            <li class="card_item">
                <div class="checkbox_container">
                    <label class="chk_input">
                        <input type="checkbox" name="use_chk" value="${item.idx || ''}">
                        <span></span>
                    </label>
                    <div class="date">
                        <input type="hidden" name="cidx[]" value="${item.idx}">
                        <input type="hidden" name="is_type[]" value="${item.is_type || 'bs'}">
                        <span>${vsDateText}</span>
                        <span>${displayDate}</span>
                    </div>
                </div>
                <div class="component_card card_361_481">
                    <a href="javascript:void(0)">
                        <div class="thumbnail">
                            <picture class="lazy_loading_container">
                                <img src="${imageSrc}" alt="${item.title || ''}" loading="lazy">
                            </picture>
                            <div class="card_top_marker">
                                <span>${item.ktitle || '카테고리'}</span>
                            </div>
                            <div class="component_information_container">
                                <p class="card_title text_ellipsis_2">
                                    ${item.title || '제목 없음'}
                                </p>
                                <p class="card_description">
                                    ${item.description || '설명이 없습니다.'}
                                </p>
                                <div class="card_tag_container">
                                    ${tagHTML}
                                </div>
                                <span class="card_count_posts">이 컨텐츠 <b>${item.contents_cnt || '0'}</b></span>
                            </div>
                        </div>
                    </a>
                </div>
            </li>
        `;
    }

    // hb (해봄) 카드 HTML - modal_main_contents.js 참고하여 개선
    function createHbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML) {
        return `
            <li class="card_item">
                <div class="checkbox_container">
                    <label class="chk_input">
                        <input type="checkbox" name="use_chk" value="${item.goods_seq || item.idx || ''}">
                        <span></span>
                    </label>
                    <div class="date">
                        <input type="hidden" name="cidx[]" value="${item.goods_seq || item.idx}">
                        <input type="hidden" name="is_type[]" value="${item.is_type || 'hb'}">
                        <span>${vsDateText}</span>
                        <span>${displayDate}</span>
                    </div>
                </div>
                <div class="component_card card_174_174">
                    <div class="thumbnail">
                        <a href="javascript:void(0)">
                            <picture class="lazy_loading_container">
                                <img src="${item.goods_image || imageSrc}" alt="${item.goods_name || item.title || ''}" loading="lazy">
                            </picture>
                            <div class="card_top_marker">
                                ${item.category_title ? `<span>${item.category_title}</span>` : ''}
                            </div>
                        </a>
                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            <div class="card_place">
                                ${item.location_title ? `<img src="/src/assets/icons/icon_place_black@x3.png" alt=""> <span>${item.location_title}</span>` : ''}
                            </div>
                            <p class="card_title text_ellipsis_2">
                                ${item.goods_name || item.title || '상품명 없음'}
                            </p>
                            <div class="price_container">
                                ${item.consumer_price && item.consumer_price > item.price ? `<span class="original_price">${parseInt(item.consumer_price).toLocaleString()}원</span>` : ''}
                                <div>
                                    ${item.discount_rate && item.discount_rate > 0 ? `<span class="discount">${item.discount_rate}%</span>` : ''}
                                    <b>${parseInt(item.price || 0).toLocaleString()}</b>
                                    <span class="unit">원</span>
                                </div>
                            </div>
                            <div class="card_date_container">
                               ${item.summary || item.description || ''}
                            </div>
                        </a>
                    </div>
                </div>
            </li>
        `;
    }

    // gb (가봄) 카드 HTML - modal_main_contents.js 참고하여 개선
    function createGbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML) {
        return `
            <li class="card_item">
                <div class="checkbox_container">
                    <label class="chk_input">
                        <input type="checkbox" name="use_chk" value="${item.goods_seq || item.idx || ''}">
                        <span></span>
                    </label>
                    <div class="date">
                        <input type="hidden" name="cidx[]" value="${item.goods_seq || item.idx}">
                        <input type="hidden" name="is_type[]" value="${item.is_type || 'gb'}">
                        <span>${vsDateText}</span>
                        <span>${displayDate}</span>
                    </div>
                </div>
                <div class="component_card shop_164_123">
                    <div class="thumbnail">
                        <a href="javascript:void(0)">
                            <picture class="lazy_loading_container">
                                <img src="${item.goods_image || imageSrc}" alt="${item.goods_name || item.title || ''}" loading="lazy">
                            </picture>
                        </a>
                        <div class="card_top_marker">
                            ${item.category_title ? `<span>${item.category_title}</span>` : ''}
                        </div>
                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            <div class="card_place">
                                 ${item.location_title ? `<img src="/src/assets/icons/icon_place_black@x3.png" alt=""><span>${item.location_title}</span>` : ''}
                            </div>
                            <p class="card_title text_ellipsis_2">
                                ${item.goods_name || item.title || '상품명 없음'}
                            </p>
                            <div class="price_container">
                                ${item.consumer_price && item.consumer_price > item.price ? `<span class="original_price">${parseInt(item.consumer_price).toLocaleString()}원</span>` : ''}
                                <div>
                                    ${item.discount_rate && item.discount_rate > 0 ? `<span class="discount">${item.discount_rate}%</span>` : ''}
                                    <b>${parseInt(item.price || 0).toLocaleString()}</b>
                                    <span class="unit">원</span>
                                </div>
                            </div>
                            <div class="card_date_container">
                                ${item.summary || item.description || '설명이 없습니다.'}
                            </div>
                        </a>
                    </div>
                </div>
            </li>
        `;
    }

    // sb (사봄) 카드 HTML - modal_main_contents.js 참고하여 개선
    function createSbCardHTML(item, displayDate, imageSrc, vsDateText, tagHTML) {
        return `
            <li class="card_item">
                <div class="checkbox_container">
                    <label class="chk_input">
                        <input type="checkbox" name="use_chk" value="${item.goods_seq || item.idx || ''}">
                        <span></span>
                    </label>
                    <div class="date">
                        <input type="hidden" name="cidx[]" value="${item.goods_seq || item.idx}">
                        <input type="hidden" name="is_type[]" value="${item.is_type || 'sb'}">
                        <span>${vsDateText}</span>
                        <span>${displayDate}</span>
                    </div>
                </div>
                <div class="component_card shop_174_174">
                    <div class="thumbnail">
                        <a href="javascript:void(0)">
                            <picture class="lazy_loading_container">
                                <img src="${item.goods_image || imageSrc}" alt="${item.goods_name || item.title || ''}" loading="lazy">
                            </picture>
                        </a>
                        <div class="card_top_marker">
                            ${item.category_title ? `<span>${item.category_title}</span>` : ''}
                        </div>
                    </div>
                    <div class="component_information_container">
                        <a href="javascript:void(0)">
                            ${item.brand_title ? `<div class="card_seller">${item.brand_title}</div>` : ''}
                            <p class="card_title text_ellipsis_2">
                                ${item.goods_name || item.title || '상품명 없음'}
                            </p>
                            <p class="card_description">
                                ${item.summary || item.description || '설명이 없습니다.'}
                            </p>
                            <div class="price_container">
                                ${item.consumer_price && item.consumer_price > item.price ? `<span class="original_price">${parseInt(item.consumer_price).toLocaleString()}원</span>` : ''}
                                <div>
                                    ${item.discount_rate && item.discount_rate > 0 ? `<span class="discount">${item.discount_rate}%</span>` : ''}
                                    <b>${parseInt(item.price || 0).toLocaleString()}</b>
                                    <span class="unit">원</span>
                                </div>
                            </div>
                            <div class="review_counter">
                                ${item.review_count ? `리뷰 <b>${parseInt(item.review_count).toLocaleString()}</b>` : ''}
                            </div>
                        </a>
                    </div>
                </div>
            </li>
        `;
    }

    // 날짜 포맷팅 함수
    function formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '2025.01.01 00:00:00';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
    }

    // 로딩 표시 함수
    function showLoading(contentList) {
        if (contentList) {
            // 로딩 상태 표시 (선택사항)
            console.log('로딩 시작...');
        }
    }

    // 로딩 숨김 함수
    function hideLoading() {
        console.log('로딩 완료');
    }

    // 페이지 로드 시 첫 번째 탭 활성화
    const firstTab = document.querySelector('.tab_navigation button[data-index="0"]');
    if (firstTab && dataIndexInput) {
        dataIndexInput.value = '0';
        console.log('초기 data_index 설정: 0');
    }
});
