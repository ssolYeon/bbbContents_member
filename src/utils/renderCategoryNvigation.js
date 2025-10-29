import { requestJson } from "./requestJson.js";

/**
 * 카테고리 데이터를 상단 탭(.category_navigation)과
 * 깊이 네비 드롭다운(.depth_navigation .category_container) 모두에 렌더링
 * + 드롭다운 토글/동기화/닫기 로직 포함
 */
export const renderCategoryNavigation = async (url) => {
    const $topNav = document.querySelector(".category_navigation");
    const $depthContainers = [...document.querySelectorAll(".depth_navigation .category_container")];
    if (!$topNav && $depthContainers.length === 0) return;

    try {
        const data = await requestJson(url);
        const categories = Array.isArray(data?.category) ? data.category : [];

        const urlCategory = new URL(location.href).searchParams.get("category");
        const currentKey =
            (data && "currentCategory" in data && data.currentCategory != null)
                ? String(data.currentCategory)
                : (urlCategory ? String(urlCategory) : null);
        //dewbian
        //const currentItem = categories.find(c => String(c.data) === currentKey) || categories[0] || null;
        const currentItem = categories.find(c => String(c.data) === currentKey) || null;

        // 1) 상단 카테고리 탭 렌더링
        if ($topNav) {
            const topHtml = categories.map(item => {
                const isActive = currentItem && String(item.data) === String(currentItem.data);
                return `<a href="${item.url}" data-category="${item.data}"${isActive ? ' class="active" aria-current="page"' : ''}>${item.name}</a>`;
            }).join("");
            $topNav.innerHTML = topHtml;
        }

        // 2) 깊이 네비 드롭다운 렌더링
        if ($depthContainers.length) {
            $depthContainers.forEach(($container) => {
                const $list = $container.querySelector(".component_select_list");
                const $labelSpan =
                    $container.querySelector(".category_current > span") ||
                    $container.querySelector(".category_current span") ||
                    $container.querySelector(".category_current");

                if ($list) {
                    const listHtml = categories
                        .map(item => `<li><a href="${item.url}" data-category="${item.data}">${item.name}</a></li>`)
                        .join("");
                    $list.innerHTML = listHtml;
                }
                if ($labelSpan && currentItem) {
                    $labelSpan.textContent = currentItem.name;
                }

                // 초기 상태 접근성 속성
                const $currentBtn = $container.querySelector(".category_current");
                if ($currentBtn) {
                    $currentBtn.setAttribute("role", "button");
                    $currentBtn.setAttribute("tabindex", "0");
                    $currentBtn.setAttribute("aria-expanded", "false");
                    $currentBtn.setAttribute("aria-haspopup", "listbox");
                }
                if ($list) {
                    $list.setAttribute("role", "listbox");
                }
            });
        }

        // ---------- 이벤트 바인딩 (한 번만) ----------
        const root = document;

        // 드롭다운 토글: .category_current 클릭 → 같은 컨테이너의 .component_select_list 에 active 토글
        const toggleDropdown = ($current) => {
            const $container = $current.closest(".category_container");
            if (!$container) return;
            const $list = $container.querySelector(".component_select_list");
            if (!$list) return;

            const willOpen = !$list.classList.contains("active");

            // 다른 드롭다운 닫기
            root.querySelectorAll(".depth_navigation .component_select_list.active").forEach(el => {
                el.classList.remove("active");
                const parentCurrent = el.closest(".category_container")?.querySelector(".category_current");
                if (parentCurrent) parentCurrent.setAttribute("aria-expanded", "false");
            });

            // 현재 드롭다운 토글
            $list.classList.toggle("active", willOpen);
            $current.setAttribute("aria-expanded", String(willOpen));
        };

        const closeAllDropdowns = () => {
            root.querySelectorAll(".depth_navigation .component_select_list.active").forEach(el => {
                el.classList.remove("active");
                const parentCurrent = el.closest(".category_container")?.querySelector(".category_current");
                if (parentCurrent) parentCurrent.setAttribute("aria-expanded", "false");
            });
        };

        const handleClick = (e) => {
            // 1) 드롭다운 토글 트리거
            const $current = e.target.closest(".category_current");
            if ($current && $current.closest(".depth_navigation")) {
                e.preventDefault();
                toggleDropdown($current);
                return;
            }

            // 2) 옵션 클릭: 텍스트/탭 동기화 + 닫기
            const $a = e.target.closest(".component_select_list a[data-category]");
            if ($a) {
                const key = String($a.dataset.category);
                const name = $a.textContent.trim();

                // 라벨 텍스트 갱신
                root.querySelectorAll(".depth_navigation .category_container .category_current > span")
                    .forEach((el) => (el.textContent = name));

                // 상단 탭 동기화
                root.querySelectorAll(".category_navigation a[data-category]").forEach((el) => {
                    const isCurrent = String(el.dataset.category) === key;
                    el.classList.toggle("active", isCurrent);
                    if (isCurrent) el.setAttribute("aria-current", "page");
                    else el.removeAttribute("aria-current");
                });


                closeAllDropdowns();

                return;
            }

            // 3) 바깥 클릭 → 모두 닫기
            if (!e.target.closest(".depth_navigation .category_container")) {
                closeAllDropdowns();
            }
        };

        const handleKeydown = (e) => {
            // Enter/Space로 토글
            const isActivator = e.target.classList?.contains("category_current") &&
                e.target.closest(".depth_navigation");
            if (isActivator && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                toggleDropdown(e.target);
            }
            // Esc로 닫기
            if (e.key === "Escape") {
                closeAllDropdowns();
            }
        };

        if (!root.__categoryDepthBound__) {
            root.addEventListener("click", handleClick);
            root.addEventListener("keydown", handleKeydown);
            root.__categoryDepthBound__ = true;
        }
        // ---------------------------------------------
    } catch (err) {
        console.error("카테고리 데이터 로드 실패:", err);
    }
};
