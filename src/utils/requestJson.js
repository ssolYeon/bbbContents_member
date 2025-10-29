/**
 * JSON 데이터를 요청하는 유틸 함수
 * @param {string} url - 데이터 요청 URL
 * @param {object} [options] - fetch 옵션 객체 (method, headers, body 등)
 * @returns {Promise<any>} 파싱된 JSON 데이터
 * @throws {Error} 네트워크 오류나 non-2xx 응답일 경우
 */

export async function requestJson(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    };

    const response = await fetch(url, {
        headers: { ...defaultHeaders, ...(options.headers || {}) },
        ...options,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Request to ${url} failed: ${response.status} ${response.statusText}\n${text}`);
    }

    return response.json();
}