import { getCaptureIconSrc as _defaultGetIcon } from "./renderCardMeta.js";

/**
 * 캡쳐(스크랩) 버튼 토글 바인딩
 *
 * 📌 백엔드 참고사항:
 * - 사용자가 버튼을 클릭하면 POST 요청을 보냅니다.
 * - 요청 바디: { post_id: string|number, capture: 0|1 }
 *   → capture = 1: 스크랩 추가 / 0: 스크랩 해제
 * - 응답(JSON):
 *   { "success": true, "message": "스크랩 성공" }
 *   { "success": false, "message": "실패 사유" }
 * - 성공 응답이면 UI 그대로 유지, 실패 시 UI는 롤백됩니다.
 */



export const bindCaptureToggle = ({
// 이벤트 위임 루트 (기본: document)
delegateRoot = document,

// 버튼 셀렉터 (기본: .btn_capture)
buttonSelector = '.btn_capture',

// API 엔드포인트 주소 (백엔드에서 구현 필요)
// ex) '/api/capture', 'https://api.mysite.com/capture'
endpoint = '/api/capture',

// 버튼 상태별 아이콘 결정 함수 (기본 제공 함수 사용)
getIconSrc = (state, btn) => _defaultGetIcon(state),

// 훅: 토글 시작 시 (요청 보내기 전)
onToggleStart = (btn, { prev, next, postId }) => {},

// 훅: 토글 종료 시 (성공/실패 여부 포함)
onToggleEnd   = (btn, { prev, next, postId, success }) => {},

// 훅: 요청 실패 시 (에러 처리)
onToggleError = (btn, error, ctx) => {},

// 토글 완료 후 커스텀 이벤트 발생 여부
emitEvent = true,
eventTarget = document,
eventName = 'capture:toggled',
} = {}) => {

    // 버튼 클릭 핸들러
    const clickHandler = async (e) => {
        const btn = e.target.closest(buttonSelector);
        if (!btn || !delegateRoot.contains(btn)) return;

        // 중복 클릭 방지 (loading flag)
        if (btn.dataset.loading === '1') return;
        btn.dataset.loading = '1';

        // postId 가져오기 (필수값)
        const postId =
            btn.dataset.postId || btn.closest('[data-post-id]')?.dataset.postId;

        if (!postId) {
            console.warn('data-post-id가 없습니다.');
            btn.dataset.loading = '0';
            return;
        }


        const boardType = btn.closest('[data-board-type]')?.dataset.boardType;
        if (!boardType) {
            console.warn('data-board-type이 없습니다.');
            btn.dataset.loading = '0';
            return;
        }

        //요서 제거 값
        const postRemove = btn.closest('[data-remove]')?.getAttribute('data-remove');


        // 현재 상태(cur), 다음 상태(next) 계산 (0 ↔ 1)
        const cur  = btn.dataset.capture === '1' ? 1 : 0;
        const next = cur ^ 1;
        const prev = cur;

        const img = btn.querySelector('img');

        // UI 상태 반영 함수
        const applyState = (state) => {
            btn.dataset.capture = String(state);
            btn.classList.toggle('active', state === 1);
            btn.setAttribute('aria-pressed', state ? 'true' : 'false');
            if (img) img.src = getIconSrc(state, btn);
        };

        // 실패 시 롤백 함수 (이 부분이 존재해서 캡쳐된 상태가 다시 돌아갑니다.)
        const rollback = () => applyState(prev);

        // 훅: 토글 시작
        //try { onToggleStart(btn, { prev, next, postId }); } catch {}
        //dewbian 로그인 여부 체크
        try {
            onToggleStart(btn, { prev, next, postId, boardType });
        } catch (error) {
            btn.dataset.loading = '0';

            if (error.message === 'Login required') {
                goLogin();
                return;

            } else {
                console.error('onToggleStart 훅 실행 중 오류:', error);
                return;
            }
        }
        // UI를 미리 next 상태로 전환 (낙관적 UI)
        applyState(next);

        let success = false;
        try {
            // 서버로 요청
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId, capture: next,  board_type : boardType}),
            });

            // HTTP 오류 처리
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            // JSON 응답 파싱
            const json = await res.json().catch(() => ({}));
            console.log("------------");
            console.log(JSON.stringify(json));
            // success=false 응답이면 에러 처리
            if (json?.success === false) throw new Error(json?.message || 'API error');

            success = true;

            if(postRemove == 1) {
                console.log('li 제거');
            }

        } catch (err) {
            // 실패 시 UI 롤백 + 훅 실행
            console.error('capture toggle failed:', err);
            rollback();
            try { onToggleError(btn, err, { prev, next, postId }); } catch {}
        } finally {
            btn.dataset.loading = '0';

            // 훅: 토글 종료
            try { onToggleEnd(btn, { prev, next, postId, success }); } catch {}

            // 커스텀 이벤트 발생 (옵션)
            if (emitEvent) {
                try {
                    eventTarget.dispatchEvent(new CustomEvent(eventName, {
                        bubbles: true,
                        detail: { btn, postId, prev, next, success }
                    }));
                } catch {}
            }
        }
    };

    // 루트에 클릭 이벤트 위임
    //delegateRoot.addEventListener('click', clickHandler, { passive: true });
    delegateRoot.addEventListener('click', clickHandler);

    // 바인딩 해제 함수 반환
    return () => delegateRoot.removeEventListener('click', clickHandler);
};
