import { createLazyLoader } from "../../utils/lazyLoader.js";
import { bindCaptureToast } from "../../utils/captureToast.js";
import { showInformation } from "../common/footer.js";
import { bindCaptureToggle } from "../../utils/bindCaptureToggle.js";
import { initSearchHandler } from "../../utils/searchHandler.js";
import { textResize } from "./text_resize.js";

const contentDetailController = (() => {
    let lazy;

    const wrppingListItem = (() => {
        const contentBox = document.querySelector(".post_content_container");
        contentBox.querySelectorAll("li").forEach((li) => {
            const strong = li.querySelector("strong");
            if (!strong) return;

            const wrapper = document.createElement("div");
            wrapper.className = "item_content";

            let node = strong.nextSibling;
            while (node) {
                const next = node.nextSibling;
                wrapper.appendChild(node);
                node = next;
            }

            li.appendChild(wrapper);
        });
    })();

    const transformTodoLabels = (({
        root = document,
        selector = "label.todo-list__label",
        descriptionSelector = ".todo-list__label__description",
        fakeBoxClass = "fake_box",
        offSrc = "/src/assets/images/icons/icon_check_circle_off@x3.png",
        onSrc = "/src/assets/images/icons/icon_check_circle_on@x3.png",
        markAttr = "data-fakebox-ready", // 중복 변환 방지용
    } = {}) => {
        const labels = root.querySelectorAll(selector);
        labels.forEach((label) => {
            if (!label || label.hasAttribute(markAttr)) return; // 이미 변환됨
            if (label.querySelector(`:scope > .${fakeBoxClass}`)) {
                // 기존 fake_box 있으면 마킹만
                label.setAttribute(markAttr, "1");
                return;
            }

            const input =
                label.querySelector(':scope > input[type="checkbox"]') ||
                label.querySelector('input[type="checkbox"]');
            if (!input) return; // 체크박스 없으면 패스

            input.removeAttribute("disabled");
            // 설명 요소(없어도 동작하게 유연 처리)
            let desc =
                label.querySelector(`:scope > ${descriptionSelector}`) ||
                label.querySelector(descriptionSelector);

            // fake_box 생성
            const fake = document.createElement("div");
            fake.className = fakeBoxClass;

            const imgOff = document.createElement("img");
            imgOff.src = offSrc;
            imgOff.alt = "unchecked";
            imgOff.setAttribute("aria-hidden", "true");
            imgOff.loading = "lazy";

            const imgOn = document.createElement("img");
            imgOn.src = onSrc;
            imgOn.alt = "checked";
            imgOn.setAttribute("aria-hidden", "true");
            imgOn.loading = "lazy";

            fake.appendChild(imgOff);
            fake.appendChild(imgOn);

            // DOM 배치: input 바로 뒤에 fake_box 삽입
            if (input.nextSibling) {
                label.insertBefore(fake, input.nextSibling);
            } else {
                label.appendChild(fake);
            }

            // desc가 label의 직계가 아니라면(또는 없으면) 안전하게 맨 끝으로 이동/생성
            if (desc && desc.parentElement !== label) {
                label.appendChild(desc);
            } else if (!desc) {
                // 텍스트만 있는 경우를 대비해 텍스트 수집해서 감싸기(옵션)
                const text = Array.from(label.childNodes)
                    .filter(
                        (n) =>
                            n.nodeType === Node.TEXT_NODE &&
                            n.textContent.trim()
                    )
                    .map((n) => n.textContent.trim())
                    .join(" ");
                if (text) {
                    const span = document.createElement("span");
                    span.className =
                        descriptionSelector.replace(/^\./, "") ||
                        "todo-list__label__description";
                    span.textContent = text;
                    label.appendChild(span);
                    // 기존 텍스트 노드 정리
                    Array.from(label.childNodes)
                        .filter(
                            (n) =>
                                n.nodeType === Node.TEXT_NODE &&
                                !n.textContent.trim()
                        )
                        .forEach((n) => n.remove());
                }
            }

            // 최종 순서 보장: input → fake_box → desc
            // (이미 위에서 배치했지만 혹시 순서가 뒤틀린 케이스 방지)
            if (label.firstElementChild !== input)
                label.insertBefore(input, label.firstChild);
            if (fake.previousElementSibling !== input)
                label.insertBefore(fake, input.nextSibling);
            const directDesc =
                label.querySelector(`:scope > ${descriptionSelector}`) ||
                label.querySelector(descriptionSelector);
            if (directDesc && fake.nextElementSibling !== directDesc) {
                if (directDesc !== fake)
                    label.insertBefore(directDesc, fake.nextSibling);
            }

            // 중복 변환 방지 마킹
            label.setAttribute(markAttr, "1");
        });
    })();

    /** Lazy Loader */
    const lazyLoader = () => {
        lazy = createLazyLoader({
            selector: ".lazy_loading_container img[data-src]",
            root: null,
            rootMargin: "0px 0px",
            onEnter: (img) => img.classList.add("is-loading"),
            onLoad: (img) => {
                img.classList.remove("is-loading");
                img.classList.add("is-loaded");
            },
        });
        lazy.init();
    };

    /** 1) 상단으로 이동 (#app_wrapper가 스크롤 컨테이너) */
    const bindScrollTop = () => {
        const btnTop = document.querySelector(".btn_top");
        if (!btnTop) return;

        btnTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    /** 2) 공유 버튼 토글 (.sns_container에 active 토글, 외부클릭/ESC 닫기 포함) */
    const bindShareToggle = () => {
        const container = document.querySelector(".floating_actions_container");
        if (!container) return;

        const shareWrap = container.querySelector(".btn_share_container");
        const shareBtn = shareWrap?.querySelector(".btn_share");
        const snsBox = shareWrap?.querySelector(".sns_container");
        if (!shareWrap || !shareBtn || !snsBox) return;

        const toggle = () => snsBox.classList.toggle("active");
        shareBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggle();
        });

        // 바깥 클릭 시 닫기
        document.addEventListener("click", (e) => {
            if (!snsBox.classList.contains("active")) return;
            if (e.target.closest(".btn_share_container")) return;
            snsBox.classList.remove("active");
        });

        // ESC로 닫기
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") snsBox.classList.remove("active");
        });
    };
    /** 3) 폰트 리사이즈 버튼 토글 (.btn_text_resize_container에 active 토글, 외부클릭/ESC 닫기 포함) */
    /** 2025.09.07 bindResizeToggle 스크립트 추가 */
    const bindResizeToggle = () => {
        const container = document.querySelector(".floating_actions_container");
        if (!container) return;

        const resizeWrap = container.querySelector(
            ".btn_text_resize_container"
        );
        const resizeBtn = resizeWrap?.querySelector(".btn_text_resize");
        const resizeBox = resizeWrap?.querySelector(".resize_container");
        const snsBox = document.querySelector(".sns_container");
        if (!resizeWrap || !resizeBtn || !resizeBox) return;

        resizeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            resizeBox.classList.toggle("active");
            snsBox?.classList.remove("active"); // 공유창은 닫기
        });

        resizeBox.addEventListener("click", (e) => {
            if (e.target.closest("button")) {
                e.stopPropagation();
            }
        });

        document.addEventListener("click", (e) => {
            if (!resizeBox.classList.contains("active")) return;
            if (e.target.closest(".btn_text_resize_container")) return;
            resizeBox.classList.remove("active");
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") resizeBox.classList.remove("active");
        });
    };
    const bindLikeToggle = () => {
        document.addEventListener("click", async (e) => {
            // 게시글 좋아요만 처리 (ID로 구분)
            if (e.target.closest("#btn_likes")) {
                if (isLogin == false) {
                    goLogin();
                    return;
                }

                const btn = e.target.closest("#btn_likes");
                const img = btn.querySelector("img");
                const likeCount = document.querySelector(
                    ".post_meta_container .like_count"
                );

                const isActive = btn.classList.toggle("active");
                img.src = isActive
                    ? "/src/assets/images/icons/icon_like_on@x3.png"
                    : "/src/assets/images/icons/icon_like_off@x3.png";

                if (likeCount) {
                    let count = parseInt(likeCount.textContent, 10);
                    likeCount.textContent = isActive ? count + 1 : count - 1;
                }

                // 서버에 좋아요 상태 저장
                try {
                    const response = await fetch("/api/likes", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document
                                .querySelector('meta[name="csrf-token"]')
                                .getAttribute("content"),
                        },
                        body: JSON.stringify({
                            cidx: cidx,
                            isActive: isActive,
                        }),
                    });

                    const result = await response.json();

                    if (!result.success) {
                        // 실패 시 UI 원복
                        btn.classList.toggle("active");
                        img.src = !isActive
                            ? "/src/assets/images/icons/icon_like_on@x3.png"
                            : "/src/assets/images/icons/icon_like_off@x3.png";

                        if (likeCount) {
                            let count = parseInt(likeCount.textContent, 10);
                            likeCount.textContent = !isActive
                                ? count + 1
                                : count - 1;
                        }

                        alert(result.error || "좋아요 처리에 실패했습니다.");
                    }
                } catch (err) {
                    console.error("좋아요 저장 실패:", err);

                    // 에러 시 UI 원복
                    btn.classList.toggle("active");
                    img.src = !isActive
                        ? "/src/assets/images/icons/icon_like_on@x3.png"
                        : "/src/assets/images/icons/icon_like_off@x3.png";

                    if (likeCount) {
                        let count = parseInt(likeCount.textContent, 10);
                        likeCount.textContent = !isActive
                            ? count + 1
                            : count - 1;
                    }

                    alert("좋아요 처리 중 오류가 발생했습니다.");
                }
            }
        });
    };

    /** 3) 댓글/답글/좋아요 기능 */
    const bindCommentSystem = () => {
        const commentList = document.querySelector(".comment_list");
        const commentForm = document.querySelector(
            ".comment_container .comment_form_item input"
        );
        const commentBtn = document.querySelector(
            ".comment_container .comment_form_item button"
        );
        const moreBtn = document.querySelector(".btn_view_more");
        const moreBtnContainer = document.querySelector(
            ".btn_view_more_container"
        );

        if (!commentList || !commentForm || !commentBtn) return;

        // --- 데이터 관리 ---
        let comments = [];
        let currentPage = 1;
        let hasMore = true;

        // --- 댓글 목록 로드 ---
        const loadComments = async (page = 1) => {
            try {
                const response = await fetch(
                    `/api/commentlist?cidx=${cidx}&cmseq=${cmseq}&page=${page}`
                );
                const result = await response.json();

                if (result.success) {
                    if (page === 1) {
                        comments = result.comments;
                    } else {
                        comments.push(...result.comments);
                    }
                    hasMore = result.hasMore;

                    // 댓글 수 업데이트
                    const commentCountEl = document.querySelector('.comment_count b');
                    if (commentCountEl && result.totalCount !== undefined) {
                        commentCountEl.textContent = result.totalCount;
                    }

                    render();
                    toggleMoreBtn();
                }
            } catch (err) {
                console.error("댓글 로드 실패:", err);
            }
        };

        // --- 더보기 버튼 표시/숨김 ---
        const toggleMoreBtn = () => {
            if (moreBtnContainer) {
                moreBtnContainer.style.display = hasMore ? "flex" : "none";
            }
        };

        // --- 렌더링 함수 ---..
        const render = () => {
            commentList.innerHTML = comments
                .map(
                    (c) => `
                <li class="list_item" data-id="${c.id}">
                    <div class="comment_content">
                        <div><span class="user">${c.user}</span>${
                        c.is_editer == "y"
                            ? '<span class="editor_user">작가</span>'
                            : ""
                    }${
                        c.is_del == "y"
                            ? `<button type="button" class="redel" data-value="${c.id}">삭제</button>`
                            : ""
                    }</div>
                        <span class="date">${c.date}</span>
                        <div>
                            <p class="comment">${c.text}</p>
                            <div class="like_container">
                                <button type="button" class="btn_like ${
                                    c.is_like == 1 ? "active" : ""
                                }">
                                    <img src="/src/assets/images/icons/icon_like_${
                                        c.is_like == 1 ? "on" : "off"
                                    }@x3.png" alt="">
                                </button>
                            </div>
                        </div>
                        <div class="comment_action_container">
                            <button type="button" class="btn_re_comment">답글쓰기</button>
                            <span class="like_count">좋아요 <b>${
                                c.like
                            }</b></span>
                        </div>
                    </div>
                    <div class="comment_form_item re_comment_form">
                        <input type="text" placeholder="답글을 남겨주세요.">
                        <button type="button">등록</button>
                    </div>
                </li>
                ${c.replies
                    .map(
                        (r) => `
                    <li class="list_item re_comment" data-id="${r.id}">
                        <div class="comment_content">
                            <div><span class="user">${r.user}</span>${
                            r.is_editer == "y"
                                ? '<span class="editor_user">작가</span>'
                                : ""
                        }${
                            r.is_del == "y"
                                ? `<button type="button" class="redel" data-value="${r.id}">삭제</button>`
                                : ""
                        }</div>
                            <span class="date">${r.date}</span>
                            <div>
                                <p class="comment">${r.text}</p>
                                <div class="like_container">
                                    <button type="button" class="btn_like ${
                                        r.is_like == 1 ? "active" : ""
                                    }">
                                        <img src="/src/assets/images/icons/icon_like_${
                                            r.is_like == 1 ? "on" : "off"
                                        }@x3.png" alt="">
                                    </button>
                                </div>
                            </div>
                            <div class="comment_action_container">
                                <span class="like_count" style="position: static;">좋아요 <b>${
                                    r.like
                                }</b></span>
                            </div>
                        </div>
                    </li>
                `
                    )
                    .join("")}
            `
                )
                .join("");
        };

        // --- 더보기 버튼 이벤트 ---
        if (moreBtn) {
            moreBtn.addEventListener("click", () => {
                currentPage++;
                loadComments(currentPage);
            });
        }

        // 초기 로드
        loadComments(1);

        // --- 댓글 등록 ---
        commentBtn.addEventListener("click", async () => {
            if (isLogin == false) {
                goLogin();
                return;
            }

            const text = commentForm.value.trim();
            if (!text) return;

            // API 요청
            try {
                const response = await fetch("/api/comment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": document
                            .querySelector('meta[name="csrf-token"]')
                            .getAttribute("content"),
                    },
                    body: JSON.stringify({ text, cidx }),
                });

                const result = await response.json();

                if (result.success) {
                    // 서버에서 받은 실제 데이터로 로컬 반영
                    // comments.push({
                    //     id: result.id,
                    //     user: result.user,
                    //     date: "방금",
                    //     text,
                    //     like: 0,
                    //     replies: []
                    // });
                    // commentForm.value = "";
                    // render();
                    loadComments(1); // 첫 페이지 새로고침
                    currentPage = 1;
                    commentForm.value = "";
                } else {
                    alert(result.error || "댓글 등록에 실패했습니다.");
                }
            } catch (err) {
                console.error("댓글 등록 실패:", err);
                alert("댓글 등록 중 오류가 발생했습니다.");
            }
        });

        // --- 이벤트 위임 ---
        commentList.addEventListener("click", async (e) => {
            const li = e.target.closest(".list_item");
            if (!li) return;

            const id = li.dataset.id;

            // 좋아요 버튼
            if (e.target.closest(".btn_like")) {
                if (isLogin == false) {
                    goLogin();
                    return;
                }

                const btn = e.target.closest(".btn_like");
                const img = btn.querySelector("img");
                const likeCount = li.querySelector(".like_count b");

                const isActive = btn.classList.toggle("active");
                img.src = isActive
                    ? "/src/assets/images/icons/icon_like_on@x3.png"
                    : "/src/assets/images/icons/icon_like_off@x3.png";

                if (likeCount) {
                    let count = parseInt(likeCount.textContent, 10);
                    likeCount.textContent = isActive ? count + 1 : count - 1;
                }

                // 서버에 좋아요 상태 저장
                try {
                    const response = await fetch("/api/relike", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document
                                .querySelector('meta[name="csrf-token"]')
                                .getAttribute("content"),
                        },
                        body: JSON.stringify({
                            cidx: cidx,
                            id: parseInt(id),
                            isActive: isActive,
                        }),
                    });

                    const result = await response.json();

                    if (!result.success) {
                        // 실패 시 UI 원복
                        btn.classList.toggle("active");
                        img.src = !isActive
                            ? "/src/assets/images/icons/icon_like_on@x3.png"
                            : "/src/assets/images/icons/icon_like_off@x3.png";

                        if (likeCount) {
                            let count = parseInt(likeCount.textContent, 10);
                            likeCount.textContent = !isActive
                                ? count + 1
                                : count - 1;
                        }

                        alert(result.error || "좋아요 처리에 실패했습니다.");
                    }
                } catch (err) {
                    console.error("좋아요 저장 실패:", err);

                    // 에러 시 UI 원복
                    btn.classList.toggle("active");
                    img.src = !isActive
                        ? "/src/assets/images/icons/icon_like_on@x3.png"
                        : "/src/assets/images/icons/icon_like_off@x3.png";

                    if (likeCount) {
                        let count = parseInt(likeCount.textContent, 10);
                        likeCount.textContent = !isActive
                            ? count + 1
                            : count - 1;
                    }

                    alert("좋아요 처리 중 오류가 발생했습니다.");
                }
            }

            // 답글쓰기 버튼
            if (e.target.classList.contains("btn_re_comment")) {
                const replyForm = li.querySelector(".re_comment_form");
                if (replyForm) replyForm.classList.toggle("active");
            }

            // 답글 등록 버튼
            if (e.target.closest(".re_comment_form button")) {
                if (isLogin == false) {
                    goLogin();
                    return;
                }

                const input = li.querySelector(".re_comment_form input");
                const text = input.value.trim();
                if (!text) return;

                try {
                    const response = await fetch("/api/reply", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRF-TOKEN": document
                                .querySelector('meta[name="csrf-token"]')
                                .getAttribute("content"),
                        },
                        body: JSON.stringify({ parentId: id, text, cidx }),
                    });

                    const result = await response.json();

                    if (result.success) {
                        // const parent = comments.find(c => String(c.id) === id);
                        // if (parent) {
                        //     parent.replies.push({
                        //         id: result.id,
                        //         user: result.user,
                        //         date: "방금1",
                        //         text,
                        //         like: 0,
                        //     });
                        //     input.value = "";
                        //     render();
                        // }
                        loadComments(1); // 첫 페이지 새로고침
                        currentPage = 1;
                        commentForm.value = "";
                    } else {
                        alert(result.error || "답글 등록에 실패했습니다.");
                    }
                } catch (err) {
                    console.error("답글 등록 실패:", err);
                    alert("답글 등록 중 오류가 발생했습니다.");
                }
            }

            // 삭제 버튼
            if (e.target.closest(".redel")) {
                const deleteBtn = e.target.closest(".redel");
                const commentIdx = deleteBtn.getAttribute("data-value");

                if (!commentIdx) {
                    alert("유효하지 않은 댓글입니다.");
                    return;
                }

                if (!confirm("정말 삭제하시겠습니까?")) {
                    return;
                }

                try {
                    const response = await fetch(
                        `/api/comments/${cidx}/${commentIdx}`,
                        {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                "X-CSRF-TOKEN":
                                    document
                                        .querySelector(
                                            'meta[name="csrf-token"]'
                                        )
                                        ?.getAttribute("content") || "",
                            },
                        }
                    );

                    // JSON 파싱 전에 응답 확인
                    const responseText = await response.text();
                    // console.log('Server response:', responseText); // 디버그용

                    let result;
                    try {
                        result = JSON.parse(responseText);
                    } catch (parseError) {
                        // console.error('JSON 파싱 실패:', responseText);
                        alert("서버 응답 오류가 발생했습니다.");
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = "삭제";
                        return;
                    }

                    if (response.ok && result.success) {
                        loadComments(1);
                        currentPage = 1;
                    } else {
                        alert(result.error || "댓글 삭제에 실패했습니다.");
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = "삭제";
                    }
                } catch (err) {
                    console.error("댓글 삭제 실패:", err);
                    alert("댓글 삭제 중 오류가 발생했습니다.");
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = "삭제";
                }
            }
        });
    };

    /** init */
    const initialize = () => {
        lazyLoader();
        showInformation();
        bindScrollTop();
        bindShareToggle();
        bindResizeToggle(); //2025.09.07 스크립트 추가
        textResize(); //2025.09.07 스크립트 추가
        bindCommentSystem();
        initSearchHandler();
        bindLikeToggle();

        const groupA = document.querySelector(".btn_capture_container");

        bindCaptureToast({
            delegateRoot: groupA,
            buttonSelector: ".btn_capture",
            hostSelector: ".btn_capture_container",
            bindClick: false,
            listen: true,
            getText: (_btn, next, success) =>
                success
                    ? next
                        ? "스크랩되었습니다."
                        : "취소되었습니다."
                    : "요청에 실패했습니다.",
            duration: 500,
        });

        bindCaptureToggle({
            delegateRoot: groupA,
            buttonSelector: ".btn_capture",
            endpoint: "/api/capture",

            getIconSrc: (state) =>
                state
                    ? "/src/assets/images/icons/icon_btn_bookmark_fill_black@x3.png"
                    : "/src/assets/images/icons/icon_btn_bookmark_black@x3.png",
            //dewbian 로그인 포함
            goLogin: goLogin, // 로그인 함수 전달
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error("Login required");
                }
            },
        });

        bindCaptureToast({
            delegateRoot: document,
            buttonSelector: ".thumbnail .btn_capture",
            hostSelector: ".btn_capture_container",
            bindClick: false,
            listen: true,
            getText: (_btn, next, success) =>
                success
                    ? next
                        ? "스크랩되었습니다."
                        : "취소되었습니다."
                    : "요청에 실패했습니다.",
            duration: 500,
        });

        bindCaptureToggle({
            delegateRoot: document,
            buttonSelector: ".thumbnail .btn_capture",
            endpoint: "/api/capture",

            getIconSrc: (state) =>
                state
                    ? "/src/assets/images/icons/icon_btn_bookmark_fill@x3.png"
                    : "/src/assets/images/icons/icon_btn_bookmark_white@x3.png",
            //dewbian 로그인 포함
            goLogin: goLogin, // 로그인 함수 전달
            onToggleStart: (btn, { prev, next, postId, boardType }) => {
                if (!isLogin) {
                    throw new Error("Login required");
                }
            },
        });
    };

    return { init: initialize };
})();

document.addEventListener("DOMContentLoaded", contentDetailController.init);
