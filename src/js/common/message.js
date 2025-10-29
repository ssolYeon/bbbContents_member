    // 안전한 console 정의 (구형 브라우저 대응)
    if (typeof console === 'undefined') {
    window.console = {
        log: function() {},
        error: function() {},
        warn: function() {},
        info: function() {}
    };
}

    let currentNotification = null;

    function showNotification(type, message, duration = 2000) {
    // 올바른 console 사용법
    if (console && console.log) {
    console.log('Showing notification:', type, message, duration);
}

    if (currentNotification) {
    hideNotification();
}

    const container = document.getElementById('notificationContainer');

    if (!container) {
    if (console && console.error) {
    console.error('Notification container not found!');
}
    return;
}

    const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
};

    // HTML 이스케이프 처리
    const escapedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const notificationHTML = `
        <div class="notification-bar notification-${type}" id="currentNotification">
            <span class="notification-icon">${icons[type] || '•'}</span>
            <span class="notification-message">${escapedMessage}</span>
            <button class="notification-close" onclick="hideNotification()" type="button">&times;</button>
            <div class="notification-progress" id="notificationProgress"></div>
        </div>
    `;

    container.innerHTML = notificationHTML;
    currentNotification = document.getElementById('currentNotification');

    if (!currentNotification) {
    if (console && console.error) {
    console.error('Failed to create notification element!');
}
    return;
}

    setTimeout(function() {
    if (currentNotification) {
    currentNotification.classList.add('show');

    setTimeout(function() {
    if (currentNotification) {
    currentNotification.classList.add('bounce');
}
}, 300);

    const progressBar = document.getElementById('notificationProgress');
    if (progressBar) {
    progressBar.style.width = '100%';
    progressBar.style.transitionDuration = duration + 'ms';

    setTimeout(function() {
    if (progressBar) {
    progressBar.style.width = '0%';
}
}, 100);
}
}
}, 50);

    setTimeout(function() {
    hideNotification();
}, duration);
}

    function hideNotification() {
    if (console && console.log) {
    console.log('Hiding notification');
}

    if (currentNotification) {
    currentNotification.classList.remove('show', 'bounce');
    currentNotification.classList.add('hide');

    setTimeout(function() {
    const container = document.getElementById('notificationContainer');
    if (container) {
    container.innerHTML = '';
}
    currentNotification = null;
}, 500);
}
}

    function removeUrlParameter(parameter) {
    try {
    if (window.history && window.history.replaceState) {
    const url = new URL(window.location);
    url.searchParams.delete(parameter);
    window.history.replaceState({}, document.title, url.toString());

    if (console && console.log) {
    console.log('Removed URL parameter:', parameter);
}
}
} catch (error) {
    if (console && console.error) {
    console.error('Error removing URL parameter:', error);
}
}
}

    /**
    * 메시지 타입에 따른 기본 지속시간 반환
    */
    function getDefaultDuration(type) {
    const durations = {
    'error': 3000,    // 에러: 3초
    'success': 5000,  // 성공: 5초
    'warning': 3000,  // 경고: 3초
    'info': 4000      // 정보: 4초
};

    return durations[type] || 2000; // 기본값 2초
}

    /**
    * 함수가 준비되었는지 확인하고 알림 표시
    */
    function tryShowNotificationWhenReady(type, message, duration) {
    if (typeof showNotification === 'function' && document.getElementById('notificationContainer')) {
    if (console && console.log) {
    console.log('Functions ready, showing notification:', type, message);
}
    showNotification(type, message, duration);
} else {
    if (console && console.log) {
    console.log('Functions not ready, retrying...');
}
    setTimeout(function() {
    tryShowNotificationWhenReady(type, message, duration);
}, 100);
}
}

    // 페이지 로드 시 URL 파라미터에서 메시지 확인
    document.addEventListener('DOMContentLoaded', function() {
    // if (console && console.log) {
    // console.log('DOM loaded, checking for notifications...');
    // }

    try {
    const urlParams = new URLSearchParams(window.location.search);

    // if (console && console.log) {
    // console.log('URL params:', urlParams.toString());
    // }

    // 메시지 타입들
    const messageTypes = ['error', 'success', 'warning', 'info'];
    let hasMessage = false;

    messageTypes.forEach(function(type) {
    if (urlParams.has(type)) {
    const message = urlParams.get(type);
    hasMessage = true;

    if (console && console.log) {
    console.log('Found ' + type + ' message:', message);
}

    // 커스텀 duration이 있으면 사용, 없으면 기본값
    const customDuration = urlParams.get('duration')
    ? parseInt(urlParams.get('duration'))
    : getDefaultDuration(type);

    if (console && console.log) {
    console.log('Duration for ' + type + ':', customDuration);
}

    // 함수가 준비될 때까지 기다렸다가 호출
    tryShowNotificationWhenReady(type, message, customDuration);
    removeUrlParameter(type);
}
});

    // duration 파라미터도 제거
    if (urlParams.has('duration')) {
    removeUrlParameter('duration');
}

    // URL 파라미터에 메시지가 없는 경우 테스트 메시지 표시 (개발용)
    if (!hasMessage) {
    // 테스트 메시지 호출 (직접 호출)
    setTimeout(function() {
    if (typeof showNotification === 'function') {
    // if (console && console.log) {
    // console.log('No URL message found, showing test notification');
    // }
    // showNotification('success', '저장되었습니다!', 2000); // 필요시 주석 해제
} else {
    if (console && console.error) {
    console.error('showNotification function not found!');
}
}
}, 500);
}

} catch (error) {
    if (console && console.error) {
    console.error('Error in DOMContentLoaded handler:', error);
}
}
});

    // ESC 키로 알림 닫기
    document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && currentNotification) {
    if (console && console.log) {
    console.log('ESC key pressed, hiding notification');
}
    hideNotification();
}
});


