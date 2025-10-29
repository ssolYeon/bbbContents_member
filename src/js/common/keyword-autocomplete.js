/**
 * KeywordAutocomplete.js
 * 키워드 자동완성 및 동적 추가 기능
 * 공통 라이브러리
 */

class KeywordAutocomplete {
    constructor(config = {}) {
        // 기본 설정
        this.config = {
            containerSelector: '#keyword_box',          // 키워드 입력 컨테이너 (ID로 변경)
            inputPrefix: 'keyword',                     // input id/name 접두사
            inputClass: 'common_input',                 // input CSS 클래스
            searchUrl: '/master/keywords/search',       // 검색 API URL
            maxKeywords: 10,                           // 최대 키워드 수
            minSearchLength: 2,                        // 최소 검색 글자 수
            debounceDelay: 300,                        // 검색 지연 시간(ms)
            maxResults: 10,                            // 최대 검색 결과 수
            placeholder: '키워드를 입력하세요',           // input placeholder
            inputWidth: '18%',                         // input 너비
            csrfToken: null,                           // CSRF 토큰
            ...config
        };

        // 상태 관리
        this.currentKeywordCount = 0;
        this.searchTimeouts = {};
        this.activeDropdown = null;
        this.existingValues = [];

        this.init();
    }

    init() {
        this.setupCSRFToken();
        this.detectExistingInputs();
        this.processExistingValues();
        this.bindGlobalEvents();
        this.initializeInputs();
    }

    setupCSRFToken() {
        if (!this.config.csrfToken) {
            const metaToken = document.querySelector('meta[name="csrf-token"]');
            this.config.csrfToken = metaToken ? metaToken.getAttribute('content') : '';
        }
    }

    detectExistingInputs() {
        // 기존 키워드 input들 감지
        const container = document.querySelector(this.config.containerSelector);
        if (!container) {
            console.error(`Container not found: ${this.config.containerSelector}`);
            return;
        }

        const existingInputs = container.querySelectorAll(`input[id^="${this.config.inputPrefix}"]`);
        this.currentKeywordCount = existingInputs.length;

        // 기존 값들 저장
        existingInputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                this.existingValues.push(value);
            }
        });
    }

    processExistingValues() {
        // 기존 값들이 있으면 필요한 만큼 input 생성 보장
        if (this.existingValues.length > this.currentKeywordCount) {
            const additionalNeeded = this.existingValues.length - this.currentKeywordCount;
            for (let i = 0; i < additionalNeeded && this.currentKeywordCount < this.config.maxKeywords; i++) {
                this.createNewInput();
            }
        }

        // 값들 재설정
        this.existingValues.forEach((value, index) => {
            const input = document.getElementById(`${this.config.inputPrefix}${index + 1}`);
            if (input) {
                input.value = value;
            }
        });
    }

    bindGlobalEvents() {
        // 전역 클릭 이벤트 (드롭다운 닫기)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                this.hideAllDropdowns();
            }
        });

        // ESC 키로 드롭다운 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllDropdowns();
            }
        });
    }

    initializeInputs() {
        // 현재 존재하는 모든 input에 기능 적용
        for (let i = 1; i <= this.currentKeywordCount; i++) {
            const input = document.getElementById(`${this.config.inputPrefix}${i}`);
            if (input) {
                this.setupInput(input, i);
            }
        }

        // 최소 4개는 보장
        while (this.currentKeywordCount < 4) {
            this.createNewInput();
        }
    }

    setupInput(input, index) {
        // 기존 래퍼가 있는지 확인
        if (!input.closest('.autocomplete-container')) {
            this.wrapInputWithContainer(input);
        }

        // 이벤트 바인딩 (중복 방지를 위해 제거 후 추가)
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        this.bindInputEvents(newInput, index);
    }

    wrapInputWithContainer(input) {
        const container = document.createElement('div');
        container.className = 'autocomplete-container';
        container.style.cssText = `
            position: relative;
            display: inline-block;
            width: ${this.config.inputWidth};
            margin-right: 8px;
        `;

        input.parentNode.insertBefore(container, input);
        container.appendChild(input);

        // input 스타일 조정
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
    }

    bindInputEvents(input, index) {
        // keyup 이벤트 (자동완성)
        input.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
                return;
            }
            this.handleSearch(input, index, e.target.value.trim());
        });

        // input 이벤트 (동적 추가)
        input.addEventListener('input', (e) => {
            const value = e.target.value.trim();

            // 마지막 input에서 값이 입력되고, 최대 개수에 도달하지 않았다면 새 input 추가
            if (index === this.currentKeywordCount && value.length > 0 && this.currentKeywordCount < this.config.maxKeywords) {
                this.createNewInput();
            }
        });

        // focus 이벤트
        input.addEventListener('focus', (e) => {
            const value = e.target.value.trim();
            if (value.length >= this.config.minSearchLength) {
                this.handleSearch(input, index, value);
            }
        });

        // 키보드 네비게이션
        input.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e, index);
        });
    }

    createNewInput() {
        const container = document.querySelector(this.config.containerSelector);
        if (!container) return null;

        this.currentKeywordCount++;
        const newIndex = this.currentKeywordCount;

        // autocomplete-container 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'autocomplete-container';
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
            width: ${this.config.inputWidth};
            margin-right: 8px;
        `;

        // 새 input 생성
        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.className = this.config.inputClass;
        newInput.id = `${this.config.inputPrefix}${newIndex}`;
        newInput.name = `${this.config.inputPrefix}${newIndex}`;
        newInput.placeholder = this.config.placeholder;
        newInput.style.cssText = 'width: 100%; box-sizing: border-box;';

        wrapper.appendChild(newInput);
        container.appendChild(wrapper);

        // 이벤트 바인딩
        this.bindInputEvents(newInput, newIndex);

        return newInput;
    }

    handleSearch(input, index, value) {
        // 기존 타이머 클리어
        if (this.searchTimeouts[index]) {
            clearTimeout(this.searchTimeouts[index]);
        }

        if (value.length < this.config.minSearchLength) {
            this.hideDropdown(index);
            return;
        }

        // 디바운스 적용
        this.searchTimeouts[index] = setTimeout(() => {
            this.searchKeywords(input, index, value);
        }, this.config.debounceDelay);
    }

    async searchKeywords(input, index, query) {
        try {
            const url = new URL(this.config.searchUrl, window.location.origin);
            url.searchParams.set('q', query);
            url.searchParams.set('limit', this.config.maxResults);

            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (this.config.csrfToken) {
                headers['X-CSRF-TOKEN'] = this.config.csrfToken;
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // 다양한 응답 형식 지원
            let keywords = [];
            if (Array.isArray(data)) {
                keywords = data;
            } else if (data.keywords) {
                keywords = data.keywords;
            } else if (data.results) {
                keywords = data.results;
            } else if (data.data) {
                keywords = data.data;
            }

            this.showDropdown(input, index, keywords);

        } catch (error) {
            console.error('키워드 검색 오류:', error);
            this.hideDropdown(index);
        }
    }

    showDropdown(input, index, keywords) {
        this.hideAllDropdowns();

        if (!keywords || keywords.length === 0) {
            return;
        }

        const container = input.closest('.autocomplete-container');
        if (!container) return;

        // 드롭다운 생성
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 200px;
            overflow-y: auto;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            border-radius: 0 0 4px 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-size: 14px;
        `;

        keywords.forEach((keyword, itemIndex) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.style.cssText = `
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid #f5f5f5;
                transition: background-color 0.2s;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;

            // 키워드 텍스트 추출
            const keywordText = this.extractKeywordText(keyword);
            item.textContent = keywordText;
            item.dataset.value = keywordText;
            item.dataset.index = itemIndex;

            // 이벤트 바인딩
            item.addEventListener('mouseenter', () => {
                this.highlightItem(dropdown, itemIndex);
            });

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectKeyword(input, index, keywordText);
            });

            dropdown.appendChild(item);
        });

        container.appendChild(dropdown);
        this.activeDropdown = { element: dropdown, inputIndex: index };
    }

    extractKeywordText(keyword) {
        if (typeof keyword === 'string') {
            return keyword;
        }

        // 객체인 경우 다양한 키 시도
        const possibleKeys = ['name', 'title', 'keyword', 'text', 'value', 'label'];
        for (const key of possibleKeys) {
            if (keyword[key]) {
                return keyword[key];
            }
        }

        return String(keyword);
    }

    selectKeyword(input, index, keyword) {
        input.value = keyword;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        this.hideDropdown(index);
    }

    hideDropdown(index) {
        const input = document.getElementById(`${this.config.inputPrefix}${index}`);
        if (!input) return;

        const container = input.closest('.autocomplete-container');
        if (!container) return;

        const dropdown = container.querySelector('.autocomplete-dropdown');
        if (dropdown) {
            dropdown.remove();
        }

        if (this.activeDropdown && this.activeDropdown.inputIndex === index) {
            this.activeDropdown = null;
        }
    }

    hideAllDropdowns() {
        document.querySelectorAll('.autocomplete-dropdown').forEach(dropdown => {
            dropdown.remove();
        });
        this.activeDropdown = null;
    }

    handleKeyboardNavigation(e, index) {
        if (!this.activeDropdown || this.activeDropdown.inputIndex !== index) {
            return;
        }

        const dropdown = this.activeDropdown.element;
        const items = dropdown.querySelectorAll('.autocomplete-item');
        const currentHighlight = dropdown.querySelector('.autocomplete-item.highlighted');
        let currentIndex = currentHighlight ? parseInt(currentHighlight.dataset.index) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                currentIndex = Math.min(currentIndex + 1, items.length - 1);
                this.highlightItem(dropdown, currentIndex);
                break;

            case 'ArrowUp':
                e.preventDefault();
                currentIndex = Math.max(currentIndex - 1, 0);
                this.highlightItem(dropdown, currentIndex);
                break;

            case 'Enter':
                e.preventDefault();
                if (currentHighlight) {
                    const keyword = currentHighlight.dataset.value;
                    this.selectKeyword(e.target, index, keyword);
                }
                break;

            case 'Escape':
                this.hideDropdown(index);
                break;
        }
    }

    highlightItem(dropdown, index) {
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.classList.remove('highlighted');
            item.style.backgroundColor = '';
        });

        const targetItem = dropdown.querySelector(`[data-index="${index}"]`);
        if (targetItem) {
            targetItem.classList.add('highlighted');
            targetItem.style.backgroundColor = '#f8f9fa';
            targetItem.scrollIntoView({ block: 'nearest' });
        }
    }

    // 공개 API 메서드들
    getAllKeywords() {
        const keywords = [];
        for (let i = 1; i <= this.currentKeywordCount; i++) {
            const input = document.getElementById(`${this.config.inputPrefix}${i}`);
            if (input && input.value.trim()) {
                keywords.push(input.value.trim());
            }
        }
        return keywords;
    }

    setKeywords(keywords) {
        if (!Array.isArray(keywords)) return false;

        // 기존 값들 클리어
        for (let i = 1; i <= this.currentKeywordCount; i++) {
            const input = document.getElementById(`${this.config.inputPrefix}${i}`);
            if (input) {
                input.value = '';
            }
        }

        // 필요한 input 수 확보
        while (this.currentKeywordCount < keywords.length && this.currentKeywordCount < this.config.maxKeywords) {
            this.createNewInput();
        }

        // 키워드 설정
        keywords.forEach((keyword, index) => {
            if (index < this.config.maxKeywords) {
                const input = document.getElementById(`${this.config.inputPrefix}${index + 1}`);
                if (input) {
                    input.value = keyword;
                }
            }
        });

        return true;
    }

    clearAllKeywords() {
        for (let i = 1; i <= this.currentKeywordCount; i++) {
            const input = document.getElementById(`${this.config.inputPrefix}${i}`);
            if (input) {
                input.value = '';
            }
        }
    }

    validateKeywords() {
        const keywords = this.getAllKeywords();
        const errors = [];

        if (keywords.length === 0) {
            errors.push('최소 1개의 키워드를 입력해주세요.');
        }

        // 중복 체크
        const duplicates = keywords.filter((item, index) => keywords.indexOf(item) !== index);
        if (duplicates.length > 0) {
            errors.push(`중복된 키워드: ${duplicates.join(', ')}`);
        }

        // 길이 체크
        const tooLong = keywords.filter(keyword => keyword.length > 50);
        if (tooLong.length > 0) {
            errors.push('키워드는 50자를 초과할 수 없습니다.');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            keywords: keywords
        };
    }

    getKeywordCount() {
        return this.currentKeywordCount;
    }

    destroy() {
        // 이벤트 리스너 제거 및 정리
        this.hideAllDropdowns();
        Object.values(this.searchTimeouts).forEach(timeout => clearTimeout(timeout));
        this.searchTimeouts = {};
        this.activeDropdown = null;
    }
}

// 전역 함수들 및 편의 메서드
let globalKeywordAutocomplete = null;

function initKeywordAutocomplete(config = {}) {
    if (globalKeywordAutocomplete) {
        globalKeywordAutocomplete.destroy();
    }
    globalKeywordAutocomplete = new KeywordAutocomplete(config);
    return globalKeywordAutocomplete;
}

function getKeywords() {
    return globalKeywordAutocomplete ? globalKeywordAutocomplete.getAllKeywords() : [];
}

function setKeywords(keywords) {
    return globalKeywordAutocomplete ? globalKeywordAutocomplete.setKeywords(keywords) : false;
}

function clearKeywords() {
    if (globalKeywordAutocomplete) {
        globalKeywordAutocomplete.clearAllKeywords();
    }
}

function validateKeywords() {
    return globalKeywordAutocomplete ?
        globalKeywordAutocomplete.validateKeywords() :
        { valid: false, errors: ['키워드 시스템이 초기화되지 않았습니다.'] };
}

// 자동 초기화 (페이지 로드 시)
document.addEventListener('DOMContentLoaded', function() {
    // 키워드 입력 영역이 있으면 자동 초기화
    if (document.querySelector('[id^="keyword"]') || document.querySelector('#keyword_box')) {
        initKeywordAutocomplete();
    }
});

// 브라우저 환경에서 전역 노출
if (typeof window !== 'undefined') {
    window.KeywordAutocomplete = KeywordAutocomplete;
    window.initKeywordAutocomplete = initKeywordAutocomplete;
    window.getKeywords = getKeywords;
    window.setKeywords = setKeywords;
    window.clearKeywords = clearKeywords;
    window.validateKeywords = validateKeywords;
}

// 모듈 시스템 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeywordAutocomplete;
}
