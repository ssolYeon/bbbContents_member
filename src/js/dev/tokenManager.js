export class TokenManager {
    constructor() {
        this.checkInterval = null;
        this.initializeTokenChecker();
    }

    // JWT 디코딩 (만료 시간 확인용)
    decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch (error) {
            return null;
        }
    }

    // 토큰 만료 시간 확인
    getTokenExpiry() {
        const token = this.getCookie('jwt_token');
        if (!token) return null;

        const decoded = this.decodeToken(token);
        console.log("토큰 만료시간 ===>["+ decoded + "]");
        return decoded ? decoded.exp * 1000 : null; // 밀리초로 변환
    }

    // 주기적으로 토큰 상태 체크
    initializeTokenChecker() {
        // 30초마다 체크
        this.checkInterval = setInterval(() => {
            this.checkAndRefreshToken();
        }, 30000);

        // 초기 체크
        this.checkAndRefreshToken();
    }

    async checkAndRefreshToken() {
        const expiry = this.getTokenExpiry();
        if (!expiry) return;

        const now = Date.now();
        const timeUntilExpiry = expiry - now;

        // 만료 5분 전에 갱신
        if (timeUntilExpiry < 5 * 60 * 1000) {
            console.log('Token expiring soon, refreshing...');
            await this.refreshToken();
        }
    }

    async refreshToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': this.getCSRFToken()
                }
            });

            if (response.ok) {
                console.log('Token refreshed successfully');
            } else {
                // 갱신 실패 - 로그인 페이지로
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // CSRF 토큰 가져오기 (누락된 메서드 추가)
    getCSRFToken() {
        return this.getCookie('csrf_token') || '';
    }

    // 인스턴스 정리 메서드 (필요한 경우)
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// 기본 인스턴스 export
export default new TokenManager();
