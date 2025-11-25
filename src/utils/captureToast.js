const showGlobalToast = ({
    text = "스크랩 되었습니다.",
    icon = "/src/assets/images/icons/icon_btn_bookmark_fill@x3.png",
    duration = 500,
    onDone = null,
} = {}) => {
    let layer = document.getElementById("capture_global_toast_layer");
    if (!layer) {
        layer = document.createElement("div");
        layer.id = "capture_global_toast_layer";
        document.body.appendChild(layer);
    }

    const box = document.createElement("div");
    box.className = "message_container global_toast";
    box.innerHTML = `
    <p class="message">
      <img src="${icon}" alt="" aria-hidden="true">
      <span class="txt">${text}</span>
    </p>
  `;
    layer.appendChild(box);

    requestAnimationFrame(() => {
        box.classList.add("show");
    });
    const remove = () => {
        if (!box.isConnected) return;
        box.classList.remove("show");
        const onEnd = () => {
            box.remove();
            if (typeof onDone === "function") onDone();
        };
        box.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, 260);
    };
    setTimeout(remove, duration);
};

/** 호스트 내부 토스트 (없으면 전역) */
const captureToast = (
    hostEl,
    {
        text = "스크랩 되었습니다.",
        icon = "/src/assets/images/icons/icon_btn_bookmark_fill@x3.png",
        duration = 500,
        onDone = null,
    } = {}
) => {
    if (!hostEl) {
        showGlobalToast({ text, icon, duration });
        return;
    }

    // .thumbnail 찾기
    const thumbnail = hostEl.closest?.(".thumbnail");

    let host, box, insertTarget;

    if (thumbnail) {
        // 1) .thumbnail이 있는 페이지: .thumbnail의 부모를 host로
        host = thumbnail.parentElement;
        insertTarget = thumbnail;
    } else {
        // 2) .thumbnail이 없는 페이지: hostEl이 버튼이라고 가정
        const btn = hostEl.classList?.contains("btn_capture")
            ? hostEl
            : hostEl.querySelector(".btn_capture");
        host = btn ? btn.parentElement : hostEl.parentElement;
        insertTarget = btn || hostEl;
    }

    if (!host) {
        showGlobalToast({ text, icon, duration });
        return;
    }

    box = host.querySelector(":scope > .message_container");

    if (!box) {
        box = document.createElement("div");
        box.className = "message_container";
        box.innerHTML = `
      <p class="message">
        <img src="${icon}" alt="" aria-hidden="true">
        <span class="txt">${text}</span>
      </p>
    `;

        insertTarget.insertAdjacentElement("afterend", box);

        requestAnimationFrame(() => {
            box.classList.add("show");
        });
    } else {
        box.querySelector("img")?.setAttribute("src", icon);
        const txt = box.querySelector(".txt");
        if (txt) txt.textContent = text;
        box.classList.add("show");
    }

    clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
        box.classList.remove("show");

        const onEnd = () => {
            if (box.isConnected) box.remove();
            if (typeof onDone === "function") onDone();
        };
        box.addEventListener("transitionend", onEnd, { once: true });
        setTimeout(onEnd, 260);
    }, duration);
};
const _bindings = new Map();

function _getRootId(root) {
    if (!_getRootId._wm) _getRootId._wm = new WeakMap();
    if (!_getRootId._seq) _getRootId._seq = 1;
    const wm = _getRootId._wm;
    if (!wm.has(root)) wm.set(root, `r${_getRootId._seq++}`);
    return wm.get(root);
}

/**
 * 캡쳐 토스트 바인딩
 * - 같은 페이지에서 다른 이미지/텍스트 세트를 동시에 쓰려면
 *   delegateRoot 또는 buttonSelector로 그룹을 분리해서 여러 번 호출하세요.
 */

export const bindCaptureToast = ({
    delegateRoot = document,
    buttonSelector = ".btn_capture",
    hostSelector = ".thumbnail",

    getText = (_btn, next, success) =>
        success === false
            ? "요청에 실패했습니다."
            : next
            ? "스크랩 되었습니다."
            : "취소되었습니다.",

    getIcon = (_btn, next, success) =>
        next
            ? "/src/assets/images/icons/icon_btn_bookmark_fill@x3.png"
            : "/src/assets/images/icons/icon_btn_bookmark_white@x3.png",
    duration = 500,

    bindClick = true,
    listen = false,
    listenTarget = document,
    listenEvent = "capture:toggled",

    shouldShow = () => true,
} = {}) => {
    const key = `${_getRootId(delegateRoot)}|${buttonSelector}|${
        bindClick ? "C" : "-"
    }|${listen ? "E" : "-"}`;
    if (_bindings.has(key)) return;

    // A) 클릭 바인딩 모드 (기존 동작 유지, 다만 guard 추가)
    let handler = null;
    if (bindClick) {
        handler = (e) => {
            const btn = e.target.closest(buttonSelector);
            if (!btn || !delegateRoot.contains(btn)) return;

            // ⬇️ 로그인 전 토스트 차단 등
            if (!shouldShow(btn)) return;

            e.preventDefault();
            e.stopPropagation();

            if (btn.dataset.captureLock === "1" || btn.disabled) return;

            btn.dataset.captureLock = "1";
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.classList.add("is-busy");

            const host =
                (hostSelector ? btn.closest(hostSelector) : null) ||
                btn.closest(".thumbnail");
            btn;

            let cur = 0;
            if (Object.prototype.hasOwnProperty.call(btn.dataset, "capture")) {
                cur =
                    btn.dataset.capture === "1" ||
                    btn.dataset.capture === "true"
                        ? 1
                        : 0;
            } else if (
                btn.getAttribute("aria-pressed") === "true" ||
                btn.classList.contains("active")
            ) {
                cur = 1;
            } else {
                const src = btn.querySelector("img")?.getAttribute("src") || "";
                if (/_fill/i.test(src)) cur = 1;
            }
            const next = cur ? 0 : 1;

            captureToast(host, {
                text: getText(btn, next, /* success= */ true),
                icon: getIcon(btn, next, /* success= */ true),
                duration,
                onDone: () => {
                    delete btn.dataset.captureLock;
                    btn.disabled = false;
                    btn.removeAttribute("aria-disabled");
                    btn.classList.remove("is-busy");
                },
            });
        };

        delegateRoot.addEventListener("click", handler);
    }

    // B) 이벤트 수신 모드 (권장: 토글 완료 후에만 토스트 표시)
    let eventHandler = null;
    if (listen) {
        eventHandler = (ev) => {
            const { btn, next, success } = ev.detail || {};
            if (!btn) return;

            // ⬇️ 필요 시 가드
            if (!shouldShow(btn)) return;

            const host =
                (hostSelector ? btn.closest(hostSelector) : null) ||
                btn.closest(".thumbnail") ||
                btn;

            captureToast(host, {
                text: getText(btn, next, success),
                icon: getIcon(btn, next, success),
                duration,
            });
        };

        listenTarget.addEventListener(listenEvent, eventHandler);
    }

    _bindings.set(key, {
        root: delegateRoot,
        handler,
        eventHandler,
        listenTarget,
        listenEvent,
    });
};
