/**
 * 검색 준비 페이지 (search/ready)
 * - 최근 검색어 표시
 * - 검색어 입력 및 검색 실행
 */

import { showInformation } from '../common/footer.js';

// localStorage 키
const STORAGE_KEYS = {
    KEYWORDS: 'search_recent_keywords',
    AUTO_SAVE: 'search_auto_save'
};

// 최근 검색어 데이터
let recentKeywords = [];
let autoSaveOn = true;
let currentTab = 'bb'; // 기본값

// 인기 검색어 데이터
let popularKeywords = [];

// 추천 콘텐츠 데이터
let recommendContents = [];

// localStorage에서 데이터 로드
const loadFromStorage = () => {
    try {
        const savedKeywords = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
        if (savedKeywords) {
            recentKeywords = JSON.parse(savedKeywords);
        }

        const savedAutoSave = localStorage.getItem(STORAGE_KEYS.AUTO_SAVE);
        if (savedAutoSave !== null) {
            autoSaveOn = savedAutoSave === 'true';
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        recentKeywords = [];
    }
};

// localStorage에 데이터 저장
const saveToStorage = () => {
    try {
        localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(recentKeywords));
        localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, autoSaveOn.toString());
    } catch (error) {
        console.error('데이터 저장 실패:', error);
    }
};

// 인기 검색어 로드 (API)
const loadPopularKeywords = async () => {
    try {
        const response = await fetch('/api/popular-keywords');
        const data = await response.json();

        if (data.success && data.keywords) {
            popularKeywords = data.keywords;
            renderPopularKeywords();
        }
    } catch (error) {
        console.error('인기 검색어 로드 실패:', error);
    }
};

// 추천 콘텐츠 로드 (top_like_posts.json)
const loadRecommendContents = async () => {
    try {
        const response = await fetch('/storage/top_like_posts.json');
        const data = await response.json();

        if (data.contents && data.contents.length > 0) {
            recommendContents = data.contents;
            renderRecommendContents();
        }
    } catch (error) {
        console.error('추천 콘텐츠 로드 실패:', error);
    }
};

// 추천 콘텐츠 렌더링
const renderRecommendContents = () => {
    const swiperWrapper = document.querySelector('.myp_search_suggested .swiper-wrapper');
    const recommendSection = document.querySelector('.myp_search_inner:nth-child(3)');
    if (!swiperWrapper) return;

    swiperWrapper.innerHTML = '';

    // 추천 콘텐츠가 없으면 숨김 상태 유지
    if (recommendContents.length === 0) {
        return;
    }

    // 추천 콘텐츠가 있으면 섹션 표시
    if (recommendSection) {
        recommendSection.style.display = 'block';
    }

    recommendContents.forEach((content) => {
        const li = document.createElement('li');
        li.className = 'swiper-slide';

        // 콘텐츠 URL
        const url = `/bc/${content.c_idx}`;

        // 이미지 경로 처리
        let imgSrc = '/src/assets/images/myp_renewl_images/myp_search_thumb_01.png';
        if (content.thumb) {
            // 백슬래시를 슬래시로 변경
            imgSrc = content.thumb.replace(/\\/g, '/');
            // 이미 절대 경로가 아니면 추가
            if (!imgSrc.startsWith('/') && !imgSrc.startsWith('http')) {
                imgSrc = '/' + imgSrc;
            }
        }

        li.innerHTML = `
            <a href="${url}">
                <div class="thumb">
                    <picture>
                        <img src="${imgSrc}" alt="${content.title || ''}" onerror="this.src='/src/assets/images/myp_renewl_images/myp_search_thumb_01.png'">
                    </picture>
                </div>
                <p class="title">${content.title || ''}</p>
            </a>
        `;
        swiperWrapper.appendChild(li);
    });

    // Swiper 재초기화
    if (window.Swiper && document.querySelector('.mySwiper')) {
        new window.Swiper(".mySwiper", {
            slidesPerView: "auto",
        });
    }
};

// 인기 검색어 렌더링
const renderPopularKeywords = () => {
    const popularList = document.querySelector('.myp_search_inner:nth-child(2) .myp_search_list');
    if (!popularList) return;

    popularList.innerHTML = '';

    if (popularKeywords.length === 0) {
        popularList.innerHTML = '<li class="myp_search_item no-data">인기 검색어가 없습니다.</li>';
        return;
    }

    popularKeywords.forEach((keyword) => {
        const li = document.createElement('li');
        li.className = 'myp_search_item';
        li.innerHTML = `
            <a href="javascript:;" class="search_link">${keyword}</a>
        `;
        popularList.appendChild(li);
    });

    // 검색어 클릭 이벤트
    popularList.querySelectorAll('.search_link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const keyword = link.textContent.trim();
            executeSearch(keyword);
        });
    });
};

// 최근 검색어 렌더링
const renderRecentKeywords = () => {
    const keywordList = document.querySelector('.myp_search_list');
    if (!keywordList) return;

    keywordList.innerHTML = '';

    // if (!autoSaveOn) {
    //     keywordList.innerHTML = '<li class="myp_search_item no-data">자동저장기능이 꺼져있습니다.</li>';
    //     return;
    // }

    if (recentKeywords.length === 0) {
        keywordList.innerHTML = '<li class="myp_search_item no-data">최근 검색어가 없습니다.</li>';
        return;
    }

    recentKeywords.forEach((keyword, index) => {
        const li = document.createElement('li');
        li.className = 'myp_search_item';
        li.dataset.index = index;
        li.innerHTML = `
            <a href="javascript:;" class="search_link">${keyword}</a>
            <button type="button" class="delete_btn btn_delete" data-index="${index}">
                <img src="/src/assets/images/icons/myp_icon_del_black@x3.png" alt="삭제">
            </button>
        `;






        keywordList.appendChild(li);
    });

    // 개별 삭제 버튼 이벤트
    keywordList.querySelectorAll('.btn_delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            recentKeywords.splice(index, 1);
            saveToStorage();
            renderRecentKeywords();
        });
    });

    // 검색어 클릭 이벤트
    keywordList.querySelectorAll('.search_link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const keyword = link.textContent.trim();
            executeSearch(keyword);
        });
    });
};

// 검색 실행
const executeSearch = async (keyword) => {
    if (!keyword) return;


    // 자동저장이 켜져있으면 키워드 추가
    if (autoSaveOn) {
        // 기존에 있다면 제거 후 맨 앞에 추가
        const index = recentKeywords.indexOf(keyword);
        if (index > -1) {
            recentKeywords.splice(index, 1);
        }
        recentKeywords.unshift(keyword);

        // 최대 20개까지만 저장
        if (recentKeywords.length > 20) {
            recentKeywords = recentKeywords.slice(0, 20);
        }

        saveToStorage();
    } else {
    }

    // 방식 1: 검색 로그 API 호출 (비동기, 실패해도 검색은 계속)
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

        await fetch('/api/search-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken || '',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                keyword: keyword,
                tab: currentTab,
                referrer: document.referrer || window.location.href
            })
        });
    } catch (error) {
        console.error('검색 로그 전송 실패:', error);
        // 로그 전송 실패해도 검색은 계속 진행
    }

    // 검색 페이지로 이동 (탭 정보 포함)
    const tabParam = currentTab !== 'bb' ? `&tab=${currentTab}` : '';
    window.location.href = `/search?s=${encodeURIComponent(keyword)}${tabParam}`;
};

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 사업자정보 토글 기능
    showInformation();

    // URL에서 탭 정보 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && ['bb', 'bc', 'bs', 'hb', 'gb', 'sb'].includes(tabParam)) {
        currentTab = tabParam;
    }

    // 데이터 로드
    loadFromStorage();

    // 최근 검색어 렌더링
    renderRecentKeywords();

    // 인기 검색어 로드 및 렌더링
    loadPopularKeywords();

    // 추천 콘텐츠 로드 및 렌더링
    loadRecommendContents();

    // 뒤로가기 버튼
    const backLink = document.querySelector('.back_link');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            history.back();
        });
    }

    // 검색 입력
    const searchInput = document.getElementById('search-input');
    const searchForm = document.querySelector('.myp_search_form form');
    const searchBtn = document.querySelector('.myp_search_btn');
    const deleteBtn = document.querySelector('.delete_btn');

    // 입력 삭제 버튼
    if (deleteBtn && searchInput) {
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = '';
            searchInput.focus();
        });

        // 입력값에 따라 삭제 버튼 표시
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim()) {
                deleteBtn.style.display = 'block';
            } else {
                deleteBtn.style.display = 'none';
            }
        });
    }

    // 검색 버튼 클릭
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const keyword = searchInput.value.trim();
            if (keyword) {
                executeSearch(keyword);
            }
        });
    }

    // 검색 폼 제출
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = searchInput.value.trim();
            if (keyword) {
                executeSearch(keyword);
            }
        });
    }

    // Enter 키 이벤트
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const keyword = searchInput.value.trim();
                if (keyword) {
                    executeSearch(keyword);
                }
            }
        });
    }

    // 인기 검색어 클릭 이벤트
    const popularLinks = document.querySelectorAll('.myp_search_inner:nth-child(2) .search_link');
    popularLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const keyword = link.textContent.trim();
            executeSearch(keyword);
        });
    });

    // 추천 콘텐츠는 실제 링크가 있을 경우 그대로 사용
});
