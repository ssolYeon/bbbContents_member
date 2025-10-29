/**
 * 기간 선택 달력 컴포넌트
 * 작성일: 2024-06-10
 * 설명: 대시보드용 기간 선택 달력 (완전 정리된 버전) - 파트 1/2
 */

class DateRangePicker {
    constructor(options = {}) {
        this.options = {
            container: options.container || '.date-range-picker',
            startDate: options.startDate || this.getDefaultStartDate(),
            endDate: options.endDate || new Date(),
            onDateChange: options.onDateChange || function() {},
            onApply: options.onApply || function() {},
            format: options.format || 'YYYY-MM-DD',
            locale: options.locale || 'ko-KR',
            ...options
        };

        // 실제 저장될 날짜
        this.startDate = this.options.startDate;
        this.endDate = this.options.endDate;

        // 임시 선택 날짜 (사용자가 선택 중인 날짜)
        this.tempStartDate = null;
        this.tempEndDate = null;

        // 상태 관리
        this.isOpen = false;
        this.currentMonth = new Date();
        this.selectingStart = true; // true: 시작일 선택 모드, false: 종료일 선택 모드

        this.init();
    }

    /**
     * 기본 시작일 (7일 전)
     */
    getDefaultStartDate() {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date;
    }

    /**
     * 초기화
     */
    init() {
        this.createHTML();
        this.bindEvents();
        this.updateDisplay();

        // 임시 날짜를 실제 날짜로 초기화
        this.tempStartDate = new Date(this.startDate);
        this.tempEndDate = new Date(this.endDate);
    }

    /**
     * HTML 구조 생성
     */
    createHTML() {
        const container = document.querySelector(this.options.container);
        if (!container) {
            console.error('DateRangePicker: Container not found');
            return;
        }

        container.innerHTML = `
            <div class="date-range-input-wrapper">
                <div class="date-range-input" id="dateRangeInput">
                    <i class="calendar-icon">📅</i>
                    <span class="date-range-text" id="dateRangeText"></span>
                    <i class="dropdown-icon">▼</i>
                </div>
                <div class="date-range-dropdown" id="dateRangeDropdown" style="display: none;">
                    <div class="date-range-header">
                        <div class="preset-buttons">
                            <button type="button" class="preset-btn" data-preset="today">오늘</button>
                            <button type="button" class="preset-btn" data-preset="yesterday">어제</button>
                            <button type="button" class="preset-btn" data-preset="last7days">최근 7일</button>
                            <button type="button" class="preset-btn" data-preset="last30days">최근 30일</button>
                            <button type="button" class="preset-btn" data-preset="thisMonth">이번 달</button>
                            <button type="button" class="preset-btn" data-preset="lastMonth">지난 달</button>
                        </div>
                    </div>
                    <div class="date-range-body">
                        <div class="selection-info">
                            <span class="selection-status" id="selectionStatus">시작일을 선택하세요</span>
                        </div>
                        <div class="calendar-navigation">
                            <button type="button" class="nav-btn" id="prevMonth">‹</button>
                            <span class="current-month" id="currentMonth"></span>
                            <button type="button" class="nav-btn" id="nextMonth">›</button>
                        </div>
                        <div class="calendar-container">
                            <div class="calendar" id="calendar"></div>
                        </div>
                    </div>
                    <div class="date-range-footer">
                        <div class="selected-dates">
                            <div class="date-input-group">
                                <label>시작일:</label>
                                <input type="date" id="startDateInput" class="date-input">
                            </div>
                            <div class="date-input-group">
                                <label>종료일:</label>
                                <input type="date" id="endDateInput" class="date-input">
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button type="button" class="btn-cancel" id="cancelBtn">취소</button>
                            <button type="button" class="btn-apply" id="applyBtn">적용</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="date-alert" id="dateAlert" style="display: none;"></div>
        `;

        this.addStyles();
    }

    /**
     * CSS 스타일 추가
     */
    addStyles() {
        if (document.getElementById('dateRangePickerStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'dateRangePickerStyles';
        style.textContent = `
            .date-range-input-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
                max-width: 300px;
            }

            .date-range-input {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border: 2px solid #e1e8ed;
                border-radius: 8px;
                background: white;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 48px;
                box-sizing: border-box;
            }

            .date-range-input:hover {
                border-color: #3498db;
                box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
            }

            .date-range-input.active {
                border-color: #3498db;
                box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
            }

            .calendar-icon {
                margin-right: 8px;
                font-size: 16px;
                color: #7f8c8d;
            }

            .date-range-text {
                flex: 1;
                font-size: 14px;
                color: #2c3e50;
                font-weight: 500;
            }

            .dropdown-icon {
                margin-left: 8px;
                font-size: 12px;
                color: #7f8c8d;
                transition: transform 0.2s ease;
            }

            .date-range-input.active .dropdown-icon {
                transform: rotate(180deg);
            }

            .date-range-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: white;
                border: 1px solid #e1e8ed;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                z-index: 1000;
                margin-top: 4px;
                overflow: hidden;
            }

            .date-range-header {
                padding: 16px;
                border-bottom: 1px solid #f1f3f4;
                background: #fafbfc;
            }

            .preset-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .preset-btn {
                padding: 6px 12px;
                border: 1px solid #e1e8ed;
                border-radius: 6px;
                background: white;
                color: #5a6c7d;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .preset-btn:hover {
                background: #3498db;
                color: white;
                border-color: #3498db;
            }

            .date-range-body {
                padding: 16px;
            }

            .selection-info {
                text-align: center;
                margin-bottom: 12px;
                padding: 8px 12px;
                background: #ecf0f1;
                border-radius: 6px;
            }

            .selection-status {
                font-size: 13px;
                color: #2c3e50;
                font-weight: 500;
            }

            .calendar-navigation {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 16px;
            }

            .nav-btn {
                width: 32px;
                height: 32px;
                border: 1px solid #e1e8ed;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.2s ease;
            }

            .nav-btn:hover {
                background: #f8f9fa;
                border-color: #3498db;
            }

            .current-month {
                font-weight: 600;
                color: #2c3e50;
                font-size: 16px;
            }

            .calendar {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 2px;
                margin-bottom: 16px;
            }

            .calendar-day-header {
                padding: 8px 4px;
                text-align: center;
                font-weight: 600;
                font-size: 12px;
                color: #7f8c8d;
                background: #f8f9fa;
            }

            .calendar-day {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s ease;
                position: relative;
            }

            .calendar-day:hover {
                background: #ecf0f1;
            }

            .calendar-day.other-month {
                color: #bdc3c7;
            }

            .calendar-day.today {
                background: #e8f4f8;
                color: #3498db;
                font-weight: 600;
            }

            .calendar-day.temp-start {
                background: #85C1E9;
                color: white;
                font-weight: 600;
            }

            .calendar-day.temp-end {
                background: #85C1E9;
                color: white;
                font-weight: 600;
            }

            .calendar-day.temp-range {
                background: #D5DBDB;
                color: #2c3e50;
            }

            .calendar-day.confirmed-start {
                background: #3498db;
                color: white;
                font-weight: 600;
            }

            .calendar-day.confirmed-end {
                background: #3498db;
                color: white;
                font-weight: 600;
            }

            .calendar-day.confirmed-range {
                background: #ebf3fd;
                color: #3498db;
            }

            .date-range-footer {
                padding: 16px;
                border-top: 1px solid #f1f3f4;
                background: #fafbfc;
            }

            .selected-dates {
                display: flex;
                gap: 16px;
                margin-bottom: 16px;
            }

            .date-input-group {
                flex: 1;
            }

            .date-input-group label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                color: #7f8c8d;
                font-weight: 500;
            }

            .date-input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #e1e8ed;
                border-radius: 6px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .date-input:focus {
                outline: none;
                border-color: #3498db;
                box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
            }

            .date-input.error {
                border-color: #e74c3c;
                box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
            }

            .action-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .btn-cancel, .btn-apply {
                padding: 8px 16px;
                border: 1px solid #e1e8ed;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s ease;
            }

            .btn-cancel {
                background: white;
                color: #7f8c8d;
            }

            .btn-cancel:hover {
                background: #f8f9fa;
                border-color: #bdc3c7;
            }

            .btn-apply {
                background: #3498db;
                color: white;
                border-color: #3498db;
            }

            .btn-apply:hover {
                background: #2980b9;
                border-color: #2980b9;
            }

            .btn-apply:disabled {
                background: #bdc3c7;
                border-color: #bdc3c7;
                cursor: not-allowed;
            }

            .date-alert {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #e74c3c;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                text-align: center;
                margin-top: 4px;
                z-index: 1001;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @media (max-width: 768px) {
                .date-range-dropdown {
                    left: -16px;
                    right: -16px;
                }

                .preset-buttons {
                    justify-content: center;
                }

                .selected-dates {
                    flex-direction: column;
                    gap: 12px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
        const input = document.getElementById('dateRangeInput');
        const dropdown = document.getElementById('dateRangeDropdown');
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const applyBtn = document.getElementById('applyBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const startInput = document.getElementById('startDateInput');
        const endInput = document.getElementById('endDateInput');

        // 입력창 클릭
        input.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // 드롭다운 내부 클릭시 이벤트 전파 중단 (수정된 부분)
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 외부 클릭시 닫기 (수정된 부분)
        document.addEventListener('click', (e) => {
            // 달력 관련 요소들을 더 구체적으로 체크
            const isCalendarClick = dropdown.contains(e.target) ||
                input.contains(e.target) ||
                e.target.closest('.date-range-dropdown') ||
                e.target.closest('.date-range-input');

            if (!isCalendarClick) {
                this.close();
            }
        });

        // 월 네비게이션 (이벤트 전파 중단 추가)
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prevMonth();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.nextMonth();
        });

        // 프리셋 버튼들 (이벤트 전파 중단 추가)
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const preset = e.target.dataset.preset;
                this.applyPreset(preset);
            });
        });

        // 적용/취소 버튼 (이벤트 전파 중단 추가)
        applyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.apply();
        });

        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cancel();
        });

        // 직접 입력 (이벤트 전파 중단 추가)
        startInput.addEventListener('change', (e) => {
            e.stopPropagation();
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                this.tempStartDate = date;
                this.validateAndRender();
            }
        });

        startInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        endInput.addEventListener('change', (e) => {
            e.stopPropagation();
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
                this.tempEndDate = date;
                this.validateAndRender();
            }
        });

        endInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * 날짜 선택 (수정된 로직)
     */
    selectDate(date) {
        if (this.selectingStart) {
            // 시작일 선택
            this.tempStartDate = new Date(date);
            this.tempEndDate = null; // 종료일 초기화
            this.selectingStart = false;
        } else {
            // 종료일 선택
            if (date < this.tempStartDate) {
                // 종료일이 시작일보다 이전인 경우 알림 표시 후 리턴
                this.showAlert('종료일은 시작일보다 이전일 수 없습니다.');
                return;
            }
            this.tempEndDate = new Date(date);
            this.selectingStart = true; // 다음 클릭시 다시 시작일부터
        }

        this.validateAndRender();
    }

    /**
     * 유효성 검사 및 렌더링
     */
    validateAndRender() {
        this.validateDateRange();
        this.renderCalendar();
    }

    /**
     * 날짜 유효성 검사
     */
    validateDateRange() {
        const startInput = document.getElementById('startDateInput');
        const endInput = document.getElementById('endDateInput');
        const applyBtn = document.getElementById('applyBtn');

        let isValid = true;

        // 시작일이 종료일보다 늦은 경우
        if (this.tempStartDate && this.tempEndDate && this.tempStartDate > this.tempEndDate) {
            this.showAlert('시작일이 종료일보다 늦을 수 없습니다.');
            startInput.classList.add('error');
            endInput.classList.add('error');
            isValid = false;
        } else {
            this.hideAlert();
            startInput.classList.remove('error');
            endInput.classList.remove('error');
        }

        // 적용 버튼 활성화/비활성화
        if (applyBtn) {
            applyBtn.disabled = !isValid || !this.tempStartDate || !this.tempEndDate;
        }

        return isValid;
    }

    /**
     * 알림 표시
     */
    showAlert(message) {
        const alert = document.getElementById('dateAlert');
        if (alert) {
            alert.textContent = message;
            alert.style.display = 'block';

            // 3초 후 자동 숨김
            setTimeout(() => {
                this.hideAlert();
            }, 3000);
        }
    }

    /**
     * 알림 숨김
     */
    hideAlert() {
        const alert = document.getElementById('dateAlert');
        if (alert) {
            alert.style.display = 'none';
        }
    }

    /**
     * 달력 렌더링
     */
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        const currentMonth = document.getElementById('currentMonth');
        const selectionStatus = document.getElementById('selectionStatus');

        if (!calendar || !currentMonth || !selectionStatus) return;

        // 선택 상태 업데이트
        if (!this.tempStartDate) {
            selectionStatus.textContent = '시작일을 선택하세요';
        } else if (!this.tempEndDate) {
            selectionStatus.textContent = '종료일을 선택하세요';
        } else {
            const start = this.formatDate(this.tempStartDate);
            const end = this.formatDate(this.tempEndDate);
            selectionStatus.textContent = `${start} ~ ${end}`;
        }

        // 월 표시 업데이트
        currentMonth.textContent = this.currentMonth.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
        });

        // 달력 그리드 생성
        calendar.innerHTML = '';

        // 요일 헤더
        const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        // 해당 월의 첫 날과 마지막 날
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);

        // 달력 시작 위치 (이전 월 날짜 포함)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // 6주 * 7일 = 42일 렌더링
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();

            // 기본 클래스 추가
            if (date.getMonth() !== this.currentMonth.getMonth()) {
                dayElement.classList.add('other-month');
            }

            if (this.isToday(date)) {
                dayElement.classList.add('today');
            }

            // 임시 선택 날짜 스타일
            if (this.tempStartDate && this.isSameDay(date, this.tempStartDate)) {
                dayElement.classList.add('temp-start');
            }

            if (this.tempEndDate && this.isSameDay(date, this.tempEndDate)) {
                dayElement.classList.add('temp-end');
            }

            // 임시 범위 스타일
            if (this.tempStartDate && this.tempEndDate && this.isInTempRange(date)) {
                dayElement.classList.add('temp-range');
            }

            // 클릭 이벤트
            dayElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 이벤트 전파 중단 추가
                this.selectDate(date);
            });

            calendar.appendChild(dayElement);
        }

        // 입력 필드 업데이트
        this.updateInputs();
    }

    /**
     * 프리셋 적용
     */
    applyPreset(preset) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (preset) {
            case 'today':
                this.tempStartDate = new Date(today);
                this.tempEndDate = new Date(today);
                break;
            case 'yesterday':
                this.tempStartDate = new Date(yesterday);
                this.tempEndDate = new Date(yesterday);
                break;
            case 'last7days':
                this.tempEndDate = new Date(today);
                this.tempStartDate = new Date(today);
                this.tempStartDate.setDate(this.tempStartDate.getDate() - 6);
                break;
            case 'last30days':
                this.tempEndDate = new Date(today);
                this.tempStartDate = new Date(today);
                this.tempStartDate.setDate(this.tempStartDate.getDate() - 29);
                break;
            case 'thisMonth':
                this.tempStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
                this.tempEndDate = new Date(today);
                break;
            case 'lastMonth':
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                this.tempStartDate = new Date(lastMonth);
                this.tempEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
        }

        this.selectingStart = true; // 프리셋 선택 후 다음은 시작일부터
        this.validateAndRender();
    }

    /**
     * 유틸리티 메서드들
     */
    isToday(date) {
        const today = new Date();
        return this.isSameDay(date, today);
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    isInTempRange(date) {
        return this.tempStartDate && this.tempEndDate &&
            date > this.tempStartDate && date < this.tempEndDate;
    }

    formatDate(date) {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\. /g, '-').replace('.', '');
    }

    /**
     * 컨트롤 메서드들
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.isOpen = true;
        const input = document.getElementById('dateRangeInput');
        const dropdown = document.getElementById('dateRangeDropdown');

        if (input && dropdown) {
            input.classList.add('active');
            dropdown.style.display = 'block';
        }

        this.currentMonth = new Date(this.tempStartDate || this.startDate);

        // 임시 날짜를 현재 설정값으로 초기화
        this.tempStartDate = new Date(this.startDate);
        this.tempEndDate = new Date(this.endDate);
        this.selectingStart = true;

        this.renderCalendar();
    }

    close() {
        this.isOpen = false;
        const input = document.getElementById('dateRangeInput');
        const dropdown = document.getElementById('dateRangeDropdown');

        if (input && dropdown) {
            input.classList.remove('active');
            dropdown.style.display = 'none';
        }

        this.hideAlert();
    }

    prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.renderCalendar();
    }

    updateDisplay() {
        const text = document.getElementById('dateRangeText');
        if (text) {
            text.textContent = `${this.formatDate(this.startDate)} ~ ${this.formatDate(this.endDate)}`;
        }
    }

    updateInputs() {
        const startInput = document.getElementById('startDateInput');
        const endInput = document.getElementById('endDateInput');

        if (startInput && this.tempStartDate) {
            startInput.value = this.tempStartDate.toISOString().split('T')[0];
        }
        if (endInput && this.tempEndDate) {
            endInput.value = this.tempEndDate.toISOString().split('T')[0];
        }
    }

    /**
     * 적용 버튼 클릭
     */
    apply() {
        // 유효성 검사
        if (!this.validateDateRange()) {
            return;
        }

        // 실제 날짜에 임시 날짜 적용
        this.startDate = new Date(this.tempStartDate);
        this.endDate = new Date(this.tempEndDate);

        this.updateDisplay();
        this.close();

        const dateRange = {
            startDate: this.startDate,
            endDate: this.endDate,
            startDateString: this.startDate.toISOString().split('T')[0],
            endDateString: this.endDate.toISOString().split('T')[0]
        };

        // onApply 콜백 실행 (바로 검색 실행)
        if (typeof this.options.onApply === 'function') {
            this.options.onApply(dateRange);
        }

        // onDateChange 콜백도 실행
        if (typeof this.options.onDateChange === 'function') {
            this.options.onDateChange(dateRange);
        }
    }

    /**
     * 취소 버튼 클릭
     */
    cancel() {
        // 임시 날짜를 원래 날짜로 되돌림
        this.tempStartDate = new Date(this.startDate);
        this.tempEndDate = new Date(this.endDate);
        this.close();
    }

    /**
     * 외부에서 날짜 설정
     */
    setDateRange(startDate, endDate) {
        this.startDate = new Date(startDate);
        this.endDate = new Date(endDate);
        this.tempStartDate = new Date(startDate);
        this.tempEndDate = new Date(endDate);
        this.updateDisplay();
        if (this.isOpen) {
            this.renderCalendar();
        }
    }

    /**
     * 현재 선택된 날짜 범위 반환
     */
    getDateRange() {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            startDateString: this.startDate.toISOString().split('T')[0],
            endDateString: this.endDate.toISOString().split('T')[0]
        };
    }
}

// 전역으로 내보내기
window.DateRangePicker = DateRangePicker;
