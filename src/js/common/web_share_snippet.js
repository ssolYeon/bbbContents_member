/**
 * Flutter 앱 공유 기능 JavaScript 스니펫
 * 웹페이지에서 Flutter 앱의 공유 기능을 호출하는 유틸리티
 */

/**
 * 기본 공유 함수
 * @param {Object|string} data - 공유할 데이터 (객체 또는 문자열)
 * @param {string} data.title - 공유 제목 (선택사항)
 * @param {string} data.text - 공유 텍스트 (선택사항)
 * @param {string} data.url - 공유 URL (선택사항)
 * @returns {Promise<Object>} 공유 결과
 */
function flutterShare(data) {
    return new Promise((resolve, reject) => {
        // Flutter 앱 환경 확인
        if (!window.Flutter || typeof window.Flutter.share !== 'function') {
            reject(new Error('Flutter 앱 환경이 아닙니다.'));
            return;
        }

        // 문자열인 경우 객체로 변환
        if (typeof data === 'string') {
            data = { text: data };
        }

        // 공유 실행
        window.Flutter.share(data)
            .then(result => {
                if (result && result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result?.error || '공유에 실패했습니다.'));
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}

/**
 * 스마트 공유 함수 (폴백 포함)
 * Flutter 앱이 아닌 경우 Web Share API 또는 클립보드 복사 사용
 */
async function smartShare(data) {
    try {
        // 1순위: Flutter 앱 공유
        if (window.Flutter && typeof window.Flutter.share === 'function') {
            return await window.Flutter.share(data);
        }

        // 2순위: Web Share API (모바일 브라우저)
        if (navigator.share) {
            await navigator.share(data);
            return { success: true };
        }

        // 3순위: 클립보드 복사
        if (data.url && navigator.clipboard) {
            await navigator.clipboard.writeText(data.url);
            alert('URL이 클립보드에 복사되었습니다!');
            return { success: true };
        }

        throw new Error('공유 기능을 사용할 수 없습니다.');
    } catch (error) {
        console.error('공유 실패:', error);
        throw error;
    }
}

/**
 * 간단한 텍스트 공유
 */
function shareText(text) {
    return flutterShare({ text });
}

/**
 * URL 공유
 */
function shareUrl(url, text = '') {
    return flutterShare({ text, url });
}

/**
 * 상품 공유 (전자상거래용)
 */
function shareProduct(product) {
    return flutterShare({
        title: product.name || '상품',
        text: `${product.name} - ${product.price}\n${product.description || ''}`,
        url: product.url
    });
}

/**
 * 현재 페이지 공유
 */
function shareCurrentPage() {
    return flutterShare({
        title: document.title,
        text: document.querySelector('meta[name="description"]')?.content || '',
        url: window.location.href
    });
}

/**
 * Flutter 환경 확인
 */
function isFlutterApp() {
    return !!(window.Flutter && typeof window.Flutter.share === 'function');
}

/**
 * 공유 버튼 이벤트 리스너 자동 등록
 * data-share 속성이 있는 모든 버튼에 공유 기능 추가
 *
 * 사용 예:
 * <button data-share='{"text":"공유할 내용","url":"https://example.com"}'>공유</button>
 */
function initShareButtons() {
    document.querySelectorAll('[data-share]').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            try {
                const shareData = JSON.parse(this.dataset.share);
                await smartShare(shareData);
            } catch (error) {
                console.error('공유 실패:', error);
                alert('공유 중 오류가 발생했습니다.');
            }
        });
    });
}

// DOM 로드 완료 시 자동 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShareButtons);
} else {
    initShareButtons();
}

// 전역 객체로 내보내기
window.FlutterShareAPI = {
    share: flutterShare,
    smartShare,
    shareText,
    shareUrl,
    shareProduct,
    shareCurrentPage,
    isFlutterApp,
    initShareButtons
};

// 사용 예제 출력
console.log(`
Flutter Share API 사용 가능:
- window.FlutterShareAPI.share(data)
- window.FlutterShareAPI.smartShare(data)
- window.FlutterShareAPI.shareText(text)
- window.FlutterShareAPI.shareUrl(url, text)
- window.FlutterShareAPI.shareProduct(product)
- window.FlutterShareAPI.shareCurrentPage()
- window.FlutterShareAPI.isFlutterApp()
`);
