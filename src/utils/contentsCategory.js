export function initCategoryToggleNav({
      dataUrl,
      topNavSelector = '.category_navigation',
      panelSelector  = '.category_toggle_navigation',
      openBtnSelector  = '.btn_category_toggle',
      closeBtnSelector = '.btn_category_closed',
  } = {}) {
    const $topNav  = document.querySelector(topNavSelector);
    const $panel   = document.querySelector(panelSelector);
    const $openBtn = document.querySelector(openBtnSelector);
    const $closeBtn= document.querySelector(closeBtnSelector);
    const $list    = $panel?.querySelector('.scroller_container');

    if (!$panel || !$openBtn || !$closeBtn) return;

    // 열기/닫기
    const open  = () => $panel.classList.add('active');
    const close = () => $panel.classList.remove('active');

    $openBtn.addEventListener('click', open);
    $closeBtn.addEventListener('click', close);

    // 데이터 로드 & 렌더
    (async () => {
        try {
            const res = await fetch(dataUrl, { credentials: 'include' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();

            const categories = Array.isArray(json?.category) ? json.category : [];
            const urlCategory = new URL(location.href).searchParams.get('category');
            const currentKey =
                (json && 'currentCategory' in json && json.currentCategory != null)
                    ? String(json.currentCategory)
                    : (urlCategory ? String(urlCategory) : null);

            // Top Nav 렌더
            if ($topNav) {
                $topNav.innerHTML = categories.map(item => {
                    const isActive = currentKey && String(item.data) === currentKey;
                    return `<a href="${item.url}" data-category="${item.data}"${isActive ? ' class="active" aria-current="page"' : ''}>${item.name}</a>`;
                }).join('');
            }

            // 토글 패널 리스트 렌더
            if ($list) {
          //       $list.innerHTML = categories.map(item => {
          //           const isActive = currentKey && String(item.data) === currentKey;
          //           return `
          //   <li>
          //     <a href="${item.url}" data-category="${item.data}"${isActive ? ' class="active" aria-current="page"' : ''}>${item.name}</a>
          //   </li>
          // `;
          //       }).join('');
                const toggle_list = categories.map(item => {
                    const isActive = currentKey && String(item.data) === currentKey;
                    return `
            <li>
              <a href="${item.url}" data-category="${item.data}"${isActive ? ' class="active" aria-current="page"' : ''}>${item.name}</a>
            </li>
          `;
                }).join('');

                $list.innerHTML = "<li>카테고리</li>" + toggle_list;

            }

            // 패널 내 링크 클릭 시 패널 닫기 + 상단 탭 동기화(동일 페이지 내 네비게이션일 때)
            $panel.addEventListener('click', (e) => {
                const a = e.target.closest('a[data-category]');
                if (!a) return;
                // 상단 탭 active 동기화(페이지 이동 없을 때에도 대비)
                if ($topNav) {
                    $topNav.querySelectorAll('a[data-category]').forEach(el => {
                        const on = el.dataset.category === a.dataset.category;
                        el.classList.toggle('active', on);
                        if (on) el.setAttribute('aria-current', 'page');
                        else el.removeAttribute('aria-current');
                    });
                }
                close(); // 패널 닫기
                // 기본 이동(링크) 동작은 그대로 두기
            }, { passive: true });

            // ESC로 닫기
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') close();
            });

        } catch (err) {
            console.error('카테고리 데이터 로드 실패:', err);
        }
    })();
}
