export const getUrlPrams = (url) => {
    const stripQuotes = (s) => (s == null ? null : s.replace(/^(['"])(.*)\1$/, '$2'));

    const toSearchParams = (input) => {
        if (!input) return new URLSearchParams(window.location.search);
        if (typeof input === 'string') {
            if (input.startsWith('?')) return new URLSearchParams(input);
            try {
                return new URL(input, window.location.origin).searchParams;
            } catch {
                return new URLSearchParams(input);
            }
        }
        if (input.search) return new URLSearchParams(input.search);
        return new URLSearchParams(String(input));
    };

    const params = toSearchParams(url);

    let raw = params.get('category');

    // 해시(#) 뒤에 쿼리가 있는 형태도 대비: /page#/?category=0001
    if (raw == null) {
        const hash = (typeof url === 'string' ? url : window.location.hash) || '';
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
            const hashParams = new URLSearchParams(hash.slice(qIndex + 1));
            raw = hashParams.get('category');
        }
    }

    return stripQuotes(raw?.trim() ?? null);
};