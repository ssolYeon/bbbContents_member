export function onSortChange({
     root = document,
     containerSelector = '.sort_container',
     stateButtonSelector = '.state',
     listSelector = '.component_select_list',
     endpoint = '/api/items',
     // 필요하면 추가 파라미터(category, page 등)를 여기서 만들어서 쿼리에 붙이세요.
     getExtraQuery = () => ({}),
     onSuccess = (json, { sort }) => { console.log('data:', json, 'sort:', sort); },
     onError = (err, { sort }) => { console.error('sort api error:', sort, err); },
 } = {}) {
    const $container = root.querySelector(containerSelector);
    if (!$container) return;

    const $stateBtn = $container.querySelector(stateButtonSelector);
    const $list = $container.querySelector(listSelector);
    if (!$stateBtn || !$list) return;

    let aborter = null;

    $stateBtn.addEventListener('click', () => {
        $list.classList.toggle('active');
    });

    $list.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-sort]');
        if (!btn || !$list.contains(btn)) return;

        const sort = btn.dataset.sort;
        const label = (btn.textContent || '').trim();

        $stateBtn.textContent = label;
        $list.classList.remove('active');

        if (aborter) aborter.abort();
        aborter = new AbortController();

        try {
            const extra = getExtraQuery() || {};
            const query = new URLSearchParams({ sort, ...extra }).toString();
            const url = `${endpoint}?${query}`;

            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                signal: aborter.signal,
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            onSuccess(json, { sort, label });

        } catch (err) {
            if (err?.name === 'AbortError') return;
            onError(err, { sort, label });
        } finally {
            if (aborter?.signal?.aborted === false) {
                aborter = null;
            }
        }
    });

    root.addEventListener('click', (e) => {
        if (!$container.contains(e.target)) $list.classList.remove('active');
    });
}