/**
 * DateTime Picker Component
 * 공통 날짜/시간 선택 달력
 */

class DateTimePicker {
    constructor(options = {}) {
        this.options = {
            format: 'YYYY-MM-DD HH:mm',
            firstDayOfWeek: 0, // 0 = 일요일, 1 = 월요일
            minDate: null,
            maxDate: null,
            defaultTime: '09:00',
            ...options
        };

        this.currentDate = new Date();
        this.selectedDate = null;
        this.targetInput = null;
        this.displayInput = null;
        this.calendar = null;

        this.months = [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ];

        this.weekdays = ['일', '월', '화', '수', '목', '금', '토'];

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            // datetime-picker 클릭 시
            if (e.target.classList.contains('datetime-picker')) {
                e.preventDefault();
                e.stopPropagation();
                const target = e.target.dataset.target;
                if (target) {
                    this.show(target);
                }
                return;
            }

            // 달력 버튼 클릭 시
            if (e.target.classList.contains('calendar_btn') || e.target.closest('.calendar_btn')) {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.classList.contains('calendar_btn') ? e.target : e.target.closest('.calendar_btn');
                const target = btn.dataset.target;
                if (target) {
                    this.show(target);
                }
                return;
            }

            // 달력 내부 클릭 시 (날짜, 시간 입력, 버튼 등) - 창을 닫지 않음
            if (e.target.closest('.datetime-calendar')) {
                e.stopPropagation();
                return;
            }

            // 달력 외부 클릭 시만 닫기
            this.hide();
        });

        // 포커스 이벤트
        document.addEventListener('focus', (e) => {
            if (e.target.classList.contains('datetime-picker')) {
                const target = e.target.dataset.target;
                if (target) {
                    this.show(target);
                }
            }
        }, true);

        // ESC 키로 달력 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.calendar) {
                this.hide();
            }
        });
    }

    show(targetId) {
        this.targetInput = document.getElementById(targetId);
        this.displayInput = document.getElementById(targetId + '_display');

        if (!this.targetInput) {
            console.error(`Target input with id '${targetId}' not found`);
            return;
        }

        if (!this.displayInput) {
            console.error(`Display input with id '${targetId}_display' not found`);
            return;
        }

        // 기존 달력 제거
        this.hide();

        // 현재 값 파싱
        this.parseCurrentValue();

        // 달력 생성
        this.createCalendar();

        // 달력 표시
        this.renderCalendar();
    }

    hide() {
        if (this.calendar) {
            this.calendar.remove();
            this.calendar = null;
        }
    }

    parseCurrentValue() {
        const value = this.targetInput.value;
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                this.selectedDate = date;
                this.currentDate = new Date(date);
                return;
            }
        }

        // 기본값 설정
        this.selectedDate = new Date();
        const [hours, minutes] = this.options.defaultTime.split(':');
        this.selectedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        this.currentDate = new Date(this.selectedDate);
    }

    createCalendar() {
        let container = this.targetInput.closest('.calendar_input');

        if (!container) {
            container = this.targetInput.parentElement;
        }

        if (!container) {
            container = document.body;
        }

        this.calendar = document.createElement('div');
        this.calendar.className = 'datetime-calendar';

        // 기본 스타일 적용 (CSS가 없을 경우를 위해)
        Object.assign(this.calendar.style, {
            position: 'absolute',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            padding: '10px',
            zIndex: '9999',
            minWidth: '280px',
            top: (this.targetInput.offsetTop + this.targetInput.offsetHeight + 5) + 'px',
            left: this.targetInput.offsetLeft + 'px'
        });
        this.calendar.innerHTML = `
            <div class="calendar-header">
                <button type="button" class="calendar-nav" data-action="prev-month">‹</button>
                <div class="calendar-title"></div>
                <button type="button" class="calendar-nav" data-action="next-month">›</button>
            </div>

            <div class="calendar-weekdays"></div>
            <div class="calendar-days"></div>

            <div class="time-input-section">
                <div class="time-input-label">시간 선택</div>
                <div class="time-inputs">
                    <input type="number" class="time-input" id="hour-input" min="0" max="23" placeholder="시">
                    <span class="time-separator">:</span>
                    <input type="number" class="time-input" id="minute-input" min="0" max="59" placeholder="분">
                </div>
            </div>

            <div class="calendar-buttons">
                <button type="button" class="calendar-btn-action calendar-btn-today">오늘</button>
                <button type="button" class="calendar-btn-action calendar-btn-cancel">취소</button>
                <button type="button" class="calendar-btn-action calendar-btn-confirm">확인</button>
            </div>
        `;

        if (container && this.calendar) {
            container.appendChild(this.calendar);
        } else {
            console.error('container 또는 calendar 요소가 없음');
        }

        // 이벤트 바인딩
        this.bindCalendarEvents();
    }

    bindCalendarEvents() {
        // 월 이동
        this.calendar.querySelector('[data-action="prev-month"]').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        this.calendar.querySelector('[data-action="next-month"]').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // 날짜 클릭 - 창을 닫지 않음
        this.calendar.querySelector('.calendar-days').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.target.classList.contains('calendar-day') && !e.target.classList.contains('other-month')) {
                const day = parseInt(e.target.textContent);
                this.selectDate(day);
                // 여기서 창을 닫지 않음!
            }
        });

        // 시간 입력 이벤트 (변수 선언 추가)
        const hourInput = this.calendar.querySelector('#hour-input');
        const minuteInput = this.calendar.querySelector('#minute-input');

        if (hourInput && minuteInput) {
            // 시간 입력 필드 클릭 시 창 닫히지 않도록
            hourInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            minuteInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // 실시간 업데이트 (input 이벤트)
            hourInput.addEventListener('input', (e) => {
                e.stopPropagation();
                const hour = parseInt(hourInput.value);
                if (hour >= 0 && hour <= 23 && this.selectedDate) {
                    this.selectedDate.setHours(hour);
                }
            });

            minuteInput.addEventListener('input', (e) => {
                e.stopPropagation();
                const minute = parseInt(minuteInput.value);
                if (minute >= 0 && minute <= 59 && this.selectedDate) {
                    this.selectedDate.setMinutes(minute);
                }
            });

            // change 이벤트도 추가 (포커스 아웃 시)
            hourInput.addEventListener('change', (e) => {
                e.stopPropagation();
                const hour = parseInt(hourInput.value) || 0;
                if (hour >= 0 && hour <= 23 && this.selectedDate) {
                    this.selectedDate.setHours(hour);
                }
            });

            minuteInput.addEventListener('change', (e) => {
                e.stopPropagation();
                const minute = parseInt(minuteInput.value) || 0;
                if (minute >= 0 && minute <= 59 && this.selectedDate) {
                    this.selectedDate.setMinutes(minute);
                }
            });
        }

        // 버튼 이벤트
        this.calendar.querySelector('.calendar-btn-today').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 오늘 날짜로 설정
            this.selectedDate = new Date();
            const [hours, minutes] = this.options.defaultTime.split(':');
            this.selectedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            this.currentDate = new Date(this.selectedDate);
            this.renderCalendar();
        });

        this.calendar.querySelector('.calendar-btn-cancel').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 취소 - 변경사항 없이 달력만 닫기
            this.hide();
        });

        this.calendar.querySelector('.calendar-btn-confirm').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 확인 - 선택된 값을 실제로 적용하고 달력 닫기
            this.confirmSelection();
        });
    }

    renderCalendar() {
        this.renderHeader();
        this.renderWeekdays();
        this.renderDays();
        this.renderTimeInputs();
    }

    renderHeader() {
        const title = this.calendar.querySelector('.calendar-title');
        title.textContent = `${this.currentDate.getFullYear()}년 ${this.months[this.currentDate.getMonth()]}`;
    }

    renderWeekdays() {
        const weekdaysContainer = this.calendar.querySelector('.calendar-weekdays');
        weekdaysContainer.innerHTML = '';

        for (let i = 0; i < 7; i++) {
            const dayIndex = (i + this.options.firstDayOfWeek) % 7;
            const weekday = document.createElement('div');
            weekday.className = 'calendar-weekday';
            weekday.textContent = this.weekdays[dayIndex];
            weekdaysContainer.appendChild(weekday);
        }
    }

    renderDays() {
        const daysContainer = this.calendar.querySelector('.calendar-days');
        daysContainer.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = new Date(firstDay);
        const dayOfWeek = (firstDay.getDay() - this.options.firstDayOfWeek + 7) % 7;
        startDate.setDate(startDate.getDate() - dayOfWeek);

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayButton = document.createElement('button');
            dayButton.type = 'button';
            dayButton.className = 'calendar-day';
            dayButton.textContent = date.getDate();

            if (date.getMonth() !== month) {
                dayButton.classList.add('other-month');
            }

            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                dayButton.classList.add('today');
            }

            if (this.selectedDate && date.toDateString() === this.selectedDate.toDateString()) {
                dayButton.classList.add('selected');
            }

            daysContainer.appendChild(dayButton);
        }
    }

    renderTimeInputs() {
        const hourInput = this.calendar.querySelector('#hour-input');
        const minuteInput = this.calendar.querySelector('#minute-input');

        if (this.selectedDate) {
            hourInput.value = this.selectedDate.getHours().toString().padStart(2, '0');
            minuteInput.value = this.selectedDate.getMinutes().toString().padStart(2, '0');
        }
    }

    selectDate(day) {
        const newDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);

        // 시간 유지
        const hourInput = this.calendar.querySelector('#hour-input');
        const minuteInput = this.calendar.querySelector('#minute-input');

        let hour = 9;
        let minute = 0;

        if (hourInput.value !== '') {
            hour = parseInt(hourInput.value) || 9;
        }
        if (minuteInput.value !== '') {
            minute = parseInt(minuteInput.value) || 0;
        }

        newDate.setHours(hour, minute, 0, 0);
        this.selectedDate = newDate;

        // 시간 입력 필드 업데이트
        hourInput.value = hour.toString().padStart(2, '0');
        minuteInput.value = minute.toString().padStart(2, '0');

        // 달력 다시 렌더링 (선택된 날짜 표시만 업데이트)
        this.renderDays();

        // 창은 닫지 않고 유지
    }

    confirmSelection() {
        // 선택된 날짜가 있는지 확인
        if (!this.selectedDate) {
            alert('날짜를 선택해주세요.');
            return;
        }

        if (!this.targetInput || !this.displayInput) {
            return;
        }

        // 시간 입력값 최종 확인 및 적용
        const hourInput = this.calendar.querySelector('#hour-input');
        const minuteInput = this.calendar.querySelector('#minute-input');

        if (hourInput && minuteInput) {
            const hour = parseInt(hourInput.value) || 0;
            const minute = parseInt(minuteInput.value) || 0;

            if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                this.selectedDate.setHours(hour, minute, 0, 0);
            }
        }

        // 값 저장
        const formattedValue = this.formatDateTime(this.selectedDate);
        this.targetInput.value = formattedValue;

        // 디스플레이 업데이트
        const displayValue = this.formatForDisplay(this.selectedDate);
        this.displayInput.value = displayValue;

        // 변경 이벤트 발생
        this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.displayInput.dispatchEvent(new Event('change', { bubbles: true }));

        // 성공 알림
        if (typeof showNotification === 'function') {
            showNotification('success', '날짜가 적용되었습니다.', 1000);
        }

        // 확인 후에만 달력 닫기
        this.hide();
    }

    formatDateTime(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    formatForDisplay(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
}

// ===================================
// 공통 사용 함수들
// ===================================

/**
 * 달력 열기
 */
function openDateTimePicker(targetId, defaultTime = '09:00') {
    if (!window.dateTimePicker) {
        window.dateTimePicker = new DateTimePicker({
            defaultTime: defaultTime
        });
    } else {
        window.dateTimePicker.options.defaultTime = defaultTime;
    }

    setTimeout(() => {
        window.dateTimePicker.show(targetId);
    }, 0);
}


/**
 * 날짜/시간 값 설정
 */
function setDateTime(targetId, dateTimeString) {
    const hiddenInput = document.getElementById(targetId);
    const displayInput = document.getElementById(targetId + '_display');

    if (!hiddenInput || !displayInput) {
        return false;
    }

    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
            return false;
        }

        hiddenInput.value = dateTimeString;

        if (window.dateTimePicker) {
            const formattedDisplay = window.dateTimePicker.formatForDisplay(date);
            displayInput.value = formattedDisplay;
        } else {
            displayInput.value = dateTimeString;
        }

        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        displayInput.dispatchEvent(new Event('change', { bubbles: true }));

        return true;

    } catch (error) {
        return false;
    }
}

/**
 * 날짜/시간 값 가져오기
 */
function getDateTime(targetId) {
    const hiddenInput = document.getElementById(targetId);

    if (!hiddenInput) {
        return '';
    }

    return hiddenInput.value || '';
}

/**
 * 날짜/시간 값 초기화
 */
function clearDateTime(targetId) {
    const hiddenInput = document.getElementById(targetId);
    const displayInput = document.getElementById(targetId + '_display');

    if (hiddenInput) {
        hiddenInput.value = '';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (displayInput) {
        displayInput.value = '';
        displayInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

/**
 * 현재 날짜/시간으로 설정
 */
function setCurrentDateTime(targetId, defaultTime = '09:00') {
    const now = new Date();
    const [hours, minutes] = defaultTime.split(':');

    now.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);

    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');

    const dateTimeString = `${year}-${month}-${day} ${hour}:${minute}`;
    return setDateTime(targetId, dateTimeString);
}

/**
 * 여러 날짜/시간 필드 일괄 설정
 */
function setMultipleDateTime(dateTimeMap) {
    const results = {};

    Object.keys(dateTimeMap).forEach(targetId => {
        results[targetId] = setDateTime(targetId, dateTimeMap[targetId]);
    });

    return results;
}

/**
 * 날짜 범위 유효성 검사
 */
function validateDateRange(startDateId, endDateId) {
    const startDateTime = getDateTime(startDateId);
    const endDateTime = getDateTime(endDateId);

    if (!startDateTime || !endDateTime) {
        return {
            valid: false,
            message: '시작일과 종료일을 모두 선택해주세요.'
        };
    }

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
            valid: false,
            message: '올바르지 않은 날짜 형식입니다.'
        };
    }

    if (startDate >= endDate) {
        return {
            valid: false,
            message: '종료일은 시작일보다 뒤여야 합니다.'
        };
    }

    return {
        valid: true,
        message: '유효한 날짜 범위입니다.'
    };
}

/**
 * 한국 시간 기준 셋팅하기
 */
function formatDateTime(date) {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 19).replace('T', ' ');
}



// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 전역 인스턴스 생성
    try {
        window.dateTimePicker = new DateTimePicker();
    } catch (error) {
        console.error('DateTimePicker 생성 중 오류:', error);
    }

    // 공통 함수들을 전역으로 노출
    window.openDateTimePicker = openDateTimePicker;
    window.setDateTime = setDateTime;
    window.getDateTime = getDateTime;
    window.clearDateTime = clearDateTime;
    window.setCurrentDateTime = setCurrentDateTime;
    window.setMultipleDateTime = setMultipleDateTime;
    window.validateDateRange = validateDateRange;

    // 기존 값들 표시 업데이트
    document.querySelectorAll('.datetime-picker').forEach(displayInput => {
        const targetId = displayInput.dataset.target;
        const hiddenInput = document.getElementById(targetId);

        if (hiddenInput && hiddenInput.value && window.dateTimePicker) {
            const date = new Date(hiddenInput.value);
            if (!isNaN(date.getTime())) {
                const formattedValue = window.dateTimePicker.formatForDisplay(date);
                displayInput.value = formattedValue;
            }
        }
    });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DateTimePicker;
}
