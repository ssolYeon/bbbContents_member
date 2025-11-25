// public/js/components/content_registration.js

document.addEventListener("DOMContentLoaded", () => {
    // ------------ GNB 초기화 ------------
    import("/src/js/navigation/gnbClassController.js").then(module => {
        module.gnbHandler(3, 0);
    });

    // ------------ Utils ------------
    const qs = (sel, root = document) => root.querySelector(sel);
    const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const REGISTER_BTN_HTML = `
        <button type="button" class="border_btn register"><span>등록</span></button>
    `;

    // ------------ 컨테이너 활성 토글 ------------
    const setContainerActive = (containerEl) => {
        if (!containerEl) return;
        const hasAnyCard = !!containerEl.querySelector(".card_item");
        containerEl.classList.toggle("active", hasAnyCard);
    };

    const getSectionKey = (wrapperEl) => {
        const h3 = qs('.content_title_container h3[id^="section-title-"]', wrapperEl);
        return h3?.id?.replace("section-title-", "") || "main";
    };

    // ------------ 섹션 타입 구분 함수 ------------
    const getSectionType = (wrapperEl) => {
        const h3 = qs('.content_title_container h3', wrapperEl);
        if (!h3) return 'unknown';

        const text = h3.textContent.trim();
        if (text.includes('연관 콘텐츠')) return 'related';
        if (text.includes('등록 콘텐츠') || text.includes('추천 콘텐츠')) return 'recommend';
        return 'unknown';
    };

    // ------------ 기존 컨테이너 개수 계산 함수 ------------
    const getExistingContainerCount = (wrapperEl) => {
        const sectionType = getSectionType(wrapperEl);
        const containers = qsa(".content_container", wrapperEl);

        if (sectionType === 'related') {
            return 1; // 연관 컨텐츠는 항상 인덱스 0 사용
        }

        // 추천 콘텐츠의 경우 기존 컨테이너 수를 반환
        return containers.length;
    };

    // ------------ 라벨/입력 ID 리셋 ------------
    const rewireIds = (rootEl, sectionKey) => {
        const map = new Map();
        qsa("input[id], select[id], textarea[id]", rootEl).forEach((el) => {
            const oldId = el.id;
            const newId = `${oldId || "fld"}_${sectionKey}_${unique()}`;
            map.set(oldId, newId);
            el.id = newId;
        });
        qsa("label[for]", rootEl).forEach((lb) => {
            const oldFor = lb.getAttribute("for");
            if (map.has(oldFor)) lb.setAttribute("for", map.get(oldFor));
        });
    };

    // ------------ 새 컨테이너 생성 ------------
    const addContentContainer = (wrapperEl) => {
        const containers = qsa(".content_container", wrapperEl);
        if (!containers.length) return;

        const template = containers[0];
        const clone = template.cloneNode(true);
        const sectionKey = getSectionKey(wrapperEl);
        const sectionType = getSectionType(wrapperEl);

        // 새로운 인덱스 계산 - 기존 컨테이너 개수를 기반으로
        const newIndex = getExistingContainerCount(wrapperEl);

        // 내부 입력값 리셋
        qsa("input, textarea, select", clone).forEach((el) => {
            if (el.type === "checkbox" || el.type === "radio") el.checked = false;
            else el.value = "";
        });

        // name 속성 업데이트
        qsa("input, textarea, select", clone).forEach((el) => {
            if (el.name) {
                if (sectionType === 'recommend') {
                    // 추천 컨텐츠의 경우
                    if (el.name.startsWith('recommend_title[')) {
                        el.name = `recommend_title[${newIndex}]`;
                        el.id = `recommend_title_${newIndex}`;
                    } else if (el.name.startsWith('recommend_vtype[')) {
                        el.name = `recommend_vtype[${newIndex}]`;
                        el.id = `recommend_vtype_${newIndex}`;
                    }
                } else if (sectionType === 'related') {
                    // 연관 컨텐츠의 경우 (항상 인덱스 0 사용)
                    if (el.name.startsWith('related_title[')) {
                        el.name = `related_title[0]`;
                        el.value = '연관콘텐츠'; // 기본값 설정
                    }
                }
            }
        });

        // label의 for 속성도 업데이트
        qsa("label", clone).forEach((label) => {
            if (label.getAttribute('for')) {
                const oldFor = label.getAttribute('for');
                if (sectionType === 'recommend') {
                    if (oldFor.includes('recommend_title_')) {
                        label.setAttribute('for', `recommend_title_${newIndex}`);
                    } else if (oldFor.includes('recommend_vtype_')) {
                        label.setAttribute('for', `recommend_vtype_${newIndex}`);
                    }
                }
            }
        });

        // 아이디 재배열
        rewireIds(clone, sectionKey);

        // 카드 영역 리셋: "등록" 버튼만 남기기
        qsa(".content_item_container", clone).forEach((box) => {
            box.classList.remove("active");
            box.innerHTML = REGISTER_BTN_HTML;
        });

        // 새 컨테이너 삽입(마지막 뒤)
        containers[containers.length - 1].after(clone);

        console.log(`새 컨테이너 추가됨 - 인덱스: ${newIndex}, 섹션: ${sectionType}`);
    };

    // ------------ 마지막 컨테이너 삭제 ------------
    const removeContentContainer = (wrapperEl) => {
        const containers = qsa(".content_container", wrapperEl);
        if (containers.length <= 1) return;
        containers[containers.length - 1].remove();

        console.log(`컨테이너 삭제됨 - 남은 개수: ${containers.length - 1}`);
    };

    // ------------ 섹션 +/- 버튼 이벤트 ------------
    document.addEventListener("click", (e) => {
        // + 버튼
        const addBtn = e.target.closest(".content_title_container .btn_add");
        if (addBtn) {
            const wrapper = addBtn.closest(".tab_contents_container");
            if (wrapper) {
                console.log('+ 버튼 클릭됨');
                addContentContainer(wrapper);
            }
            return;
        }
        // - 버튼
        const delBtn = e.target.closest(".content_title_container .btn_delete");
        if (delBtn) {
            const wrapper = delBtn.closest(".tab_contents_container");
            if (wrapper) {
                console.log('- 버튼 클릭됨');
                removeContentContainer(wrapper);
            }
            return;
        }
    });

    // ------------ 모달 관련 변수 ------------
    const modal = document.querySelector(".modal_wrapper");
    let currentTargetContainer = null;
    let selectionOrder = [];

    const upsertSelectionOrder = (li, checked) => {
        const idx = selectionOrder.indexOf(li);
        if (checked) {
            if (idx === -1) selectionOrder.push(li);
        } else {
            if (idx !== -1) selectionOrder.splice(idx, 1);
        }
    };

    // ------------ vtype에 따른 탭 인덱스 매핑 ------------
    // CardGroupManager와 동일한 매핑 사용
    const getTabIndexByVtype = (vtype) => {
        const vtypeToTabMap = {
            'bch': 0, 'bcv': 0,
            'bsh': 1, 'bsv': 1,
            'hbh': 2, 'hbv': 2,
            'gbh': 3, 'gbv': 3,
            'sbh': 4, 'sbv': 4
        };
        return vtypeToTabMap[vtype] ?? 0;
    };

    // ------------ 모달 탭 활성화 ------------
    const activateModalTab = (tabIndex) => {
        if (!modal) return;

        const nav = modal.querySelector(".tab_navigation");
        const buttons = nav ? Array.from(nav.querySelectorAll("[data-index]")) : [];
        const contents = Array.from(modal.querySelectorAll(".tab_contents_container .tab_content"));

        if (!nav || !buttons.length || !contents.length) return;

        // 모든 탭 비활성화
        buttons.forEach((btn) => btn.classList.remove("active"));
        contents.forEach((panel) => panel.classList.remove("active"));

        // 해당 탭만 활성화
        const targetButton = buttons.find(btn => btn.dataset.index === String(tabIndex));
        const targetContent = contents[tabIndex];

        if (targetButton) targetButton.classList.add("active");
        if (targetContent) targetContent.classList.add("active");

        // data_index input 업데이트
        const dataIndexInput = document.getElementById('data_index');
        if (dataIndexInput) dataIndexInput.value = String(tabIndex);

        console.log(`모달 탭 ${tabIndex} 활성화됨`);
    };

    // ------------ "등록" 버튼 클릭 이벤트 ------------
    document.addEventListener("click", (e) => {
        const regBtn = e.target.closest(".content_item_container .border_btn.register");
        if (!regBtn) return;

        currentTargetContainer = regBtn.closest(".content_item_container");

        // vtype 값에 따라 해당 탭으로 이동
        const container = regBtn.closest(".content_container");
        let vtypeSelect = null;
        let selectedVtype = '';

        // 추천 컨텐츠 섹션인지 확인
        const wrapperEl = container.closest('.tab_contents_container');
        const sectionType = getSectionType(wrapperEl);

        if (sectionType === 'recommend') {
            // 추천 컨텐츠의 경우 vtype 셀렉트박스에서 값 가져오기
            vtypeSelect = container.querySelector("select[name*='recommend_vtype']");
            selectedVtype = vtypeSelect ? vtypeSelect.value : '';
        } else if (sectionType === 'related') {
            // 연관 컨텐츠의 경우 기본값으로 컨텐츠 탭(0)
            selectedVtype = 'bch';
        }

        console.log('선택된 vtype:', selectedVtype, 'section:', sectionType);

        // vtype에 따른 탭 인덱스 결정
        const targetTabIndex = getTabIndexByVtype(selectedVtype);

        if (modal) {
            modal.classList.add("active");

            // 해당 탭으로 이동
            activateModalTab(targetTabIndex);

            // 자동으로 검색 실행
            setTimeout(() => {
                const searchForm = document.getElementById('searchForm');
                if (searchForm && typeof window.submitForm === 'function') {
                    window.submitForm();
                }
            }, 100);
        }
    });

    // ------------ 모달 초기화 ------------
    function initModalTabs() {
        if (!modal) return;
        const nav = modal.querySelector(".tab_navigation");
        const buttons = nav ? Array.from(nav.querySelectorAll("[data-index]")) : [];
        const contents = Array.from(modal.querySelectorAll(".tab_contents_container .tab_content"));
        if (!nav || !buttons.length || !contents.length) return;

        const activate = (idx) => {
            const indexStr = String(idx);
            buttons.forEach((btn) => btn.classList.toggle("active", String(btn.dataset.index) === indexStr));
            contents.forEach((panel, i) => panel.classList.toggle("active", String(i) === indexStr));
        };

        const initialBtn = buttons.find((b) => b.classList.contains("active")) || buttons[0];
        if (initialBtn) activate(initialBtn.dataset.index ?? 0);

        nav.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-index]");
            if (!btn) return;
            e.preventDefault();
            activate(btn.dataset.index);
        });
    }

    // ------------ 모달 내 카드 클릭 이벤트 ------------
    if (modal) {
        modal.addEventListener("click", (e) => {
            const item = e.target.closest(".tab_contents_container .tab_content.active .content_list .card_item");
            if (!item) return;
            if (e.target.closest("input, label, a, button")) return;
            const chk = item.querySelector('input[type="checkbox"]');
            if (chk) {
                chk.checked = !chk.checked;
                upsertSelectionOrder(item, chk.checked);
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        // 체크박스 직접 조작 시에도 순서 반영
        modal.addEventListener("change", (e) => {
            const cb = e.target.closest('.tab_contents_container .tab_content.active input[type="checkbox"]');
            if (!cb) return;
            const li = cb.closest(".card_item");
            if (li) upsertSelectionOrder(li, cb.checked);
        });
    }

    // ------------ 컨테이너 내부 ul과 등록 버튼 보장 ------------
    function ensureListAndRegister(container) {
        let ul = container.querySelector("ul");
        let registerBtn = container.querySelector(".border_btn.register");

        if (!ul) {
            ul = document.createElement("ul");
            ul.className = "selected_list";
            ul.setAttribute("role", "list");
            if (registerBtn) {
                container.insertBefore(ul, registerBtn);
            } else {
                container.appendChild(ul);
            }
        }

        if (!registerBtn) {
            registerBtn = document.createElement("button");
            registerBtn.type = "button";
            registerBtn.className = "border_btn register";
            registerBtn.innerHTML = "<span>등록</span>";
            container.appendChild(registerBtn);
        }

        if (ul.nextElementSibling !== registerBtn) {
            container.insertBefore(registerBtn, ul.nextSibling);
        }

        return { ul, registerBtn };
    }

    // ------------ 선택된 아이템 가져오기 ------------
    function importCheckedFromActiveTab() {
        if (!currentTargetContainer || !modal) return;
        const activePanel = modal.querySelector(".tab_contents_container .tab_content.active");
        if (!activePanel) return;

        const checked = qsa('input[type="checkbox"]:checked', activePanel);
        if (!checked.length) {
            alert("선택된 항목이 없습니다.");
            return;
        }

        // 클릭 순서 정렬 유지
        const toArray = Array.from(checked);
        const orderedChecked = toArray.sort((a, b) => {
            const la = a.closest(".card_item");
            const lb = b.closest(".card_item");
            const ia = selectionOrder.indexOf(la);
            const ib = selectionOrder.indexOf(lb);
            if (ia === -1 && ib === -1) return 0;
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        // 컨테이너에 ul과 등록버튼을 보장하고, baseCount를 ul 안의 li 개수로 계산
        const { ul, registerBtn } = ensureListAndRegister(currentTargetContainer);
        const baseCount = ul.querySelectorAll(".card_item").length;

        // 섹션 타입과 컨테이너 인덱스 구하기
        const wrapperEl = currentTargetContainer.closest(".tab_contents_container");
        const sectionType = getSectionType(wrapperEl);
        const containers = qsa(".content_container", wrapperEl);
        const containerIndex = containers.indexOf(currentTargetContainer.closest(".content_container"));

        console.log('Section Type:', sectionType, 'Container Index:', containerIndex);

        orderedChecked.forEach((cb, i) => {
            const li = cb.closest(".card_item");
            if (!li) return;

            const clone = li.cloneNode(true);

            // 카드 안의 체크박스 input만 제거
            clone.querySelectorAll('input[type="checkbox"]').forEach((el) => el.remove());

            // 기본 노출 순번
            const defaultOrder = baseCount + i + 1;

            // order 입력칸
            const orderInput = document.createElement("input");
            orderInput.type = "text";
            orderInput.className = "common_input";
            orderInput.name = `${sectionType}_display_order[${containerIndex}][]`;
            orderInput.placeholder = "order";
            orderInput.setAttribute("inputmode", "numeric");
            orderInput.setAttribute("pattern", "\\d*");
            orderInput.value = String(defaultOrder);

            const orderWrap = document.createElement("div");
            orderWrap.className = "order_field";
            orderWrap.appendChild(orderInput);

            // 삭제 버튼
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove_selected delete";
            removeBtn.innerHTML = "<span><img src='/src/assets/icons/cancel.png' alt=''></span>";

            // cidx를 위한 hidden input
            const cidxInput = document.createElement("input");
            cidxInput.type = "hidden";
            cidxInput.name = `${sectionType}_cidx[${containerIndex}][]`;
            cidxInput.value = cb.value || '';

            // is_type을 위한 hidden input
            const isTypeInput = document.createElement("input");
            isTypeInput.type = "hidden";
            isTypeInput.name = `${sectionType}_is_type[${containerIndex}][]`;
            const hiddenIsType = li.querySelector('input[name="is_type[]"]');
            isTypeInput.value = hiddenIsType ? hiddenIsType.value : 'bc';

            // 상단 체크박스 영역에 order + 삭제 버튼 배치
            const checkboxWrap = clone.querySelector(".checkbox_container");
            if (checkboxWrap) {
                const chkLabel = checkboxWrap.querySelector("label.chk_input");
                if (chkLabel) {
                    checkboxWrap.replaceChild(orderWrap, chkLabel);
                } else {
                    checkboxWrap.prepend(orderWrap);
                }
                checkboxWrap.appendChild(removeBtn);
                checkboxWrap.appendChild(cidxInput);
                checkboxWrap.appendChild(isTypeInput);
            } else {
                const headerWrap = document.createElement("div");
                headerWrap.className = "checkbox_container";
                headerWrap.appendChild(orderWrap);
                headerWrap.appendChild(removeBtn);
                headerWrap.appendChild(cidxInput);
                headerWrap.appendChild(isTypeInput);
                clone.insertBefore(headerWrap, clone.firstChild);
            }

            ul.appendChild(clone);
        });

        // 버튼이 항상 ul 아래에 오도록 보장
        if (registerBtn && ul.nextElementSibling !== registerBtn) {
            currentTargetContainer.insertBefore(registerBtn, ul.nextSibling);
        }

        setContainerActive(currentTargetContainer);

        // 체크 해제 + 선택순서 정리 + 모달 닫기
        qsa('input[type="checkbox"]', activePanel).forEach((c) => (c.checked = false));
        selectionOrder = selectionOrder.filter((li) => !activePanel.contains(li));
        modal.classList.remove("active");
        currentTargetContainer = null;
    }

    // ------------ 모달 하단 버튼 이벤트 ------------
    if (modal) {
        const btnContainer = modal.querySelector(".btn_container");
        if (btnContainer) {
            btnContainer.addEventListener("click", (e) => {
                if (e.target.closest(".border_btn.save")) {
                    importCheckedFromActiveTab();
                }
                if (e.target.closest(".border_btn.cancel")) {
                    modal.classList.remove("active");
                    currentTargetContainer = null;
                }
            });
        }
        modal.addEventListener("click", (e) => {
            if (e.target.closest(".btn_close")) {
                modal.classList.remove("active");
                currentTargetContainer = null;
            }
        });
    }

    // ------------ 등록된 카드 개별 삭제 ------------
    document.addEventListener("click", (e) => {
        const delBtn = e.target.closest(".remove_selected");
        if (!delBtn) return;

        const container = delBtn.closest(".content_item_container");
        const { ul, registerBtn } = ensureListAndRegister(container);

        delBtn.closest(".card_item")?.remove();

        if (registerBtn && ul.nextElementSibling !== registerBtn) {
            container.insertBefore(registerBtn, ul.nextSibling);
        }

        setContainerActive(container);
    });

    // ------------ 연관 콘텐츠 초기화 ------------
    function initRelatedContent() {
        const relatedSections = qsa('.tab_contents_container').filter(wrapper => {
            const h3 = qs('.content_title_container h3', wrapper);
            return h3 && h3.textContent.includes('연관 콘텐츠');
        });

        relatedSections.forEach(wrapper => {
            const containers = qsa('.content_container', wrapper);
            containers.forEach((container, index) => {
                // ★ 연관 컨텐츠는 vtype 셀렉트박스가 없어야 함
                const vtypeSelect = container.querySelector('select[name^="related_vtype"]');
                if (vtypeSelect) {
                    vtypeSelect.remove(); // vtype 셀렉트 제거
                }

                if (!container.querySelector('input[name^="related_title"]')) {
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = `related_title[0]`;
                    hiddenInput.value = '연관콘텐츠';
                    container.appendChild(hiddenInput);
                }
            });
        });
    }

    // ------------ 추천 콘텐츠 초기화 ------------
    function updateRecommendTextareasAndSelects() {
        const recommendSections = qsa('.tab_contents_container').filter(wrapper => {
            const h3 = qs('.content_title_container h3', wrapper);
            return h3 && (h3.textContent.includes('등록 콘텐츠') || h3.textContent.includes('추천 콘텐츠'));
        });

        recommendSections.forEach(wrapper => {
            const containers = qsa('.group_container', wrapper);
            containers.forEach((container, index) => {
                // vtype 셀렉트박스 name 속성 업데이트
                const vtypeSelect = container.querySelector('select[name*="recommend_vtype"]');
                if (vtypeSelect) {
                    vtypeSelect.name = `recommend_vtype[${index}]`;
                    vtypeSelect.id = `recommend_vtype_${index}`;
                }

                // ★ 수정: textarea가 아닌 input 사용
                const titleInput = container.querySelector('input.group_title_input[name*="recommend_title"]');
                if (titleInput) {
                    titleInput.name = `recommend_title[${index}]`;
                    titleInput.id = `recommend_title_${index}`;
                    // placeholder는 유지
                    if (!titleInput.placeholder) {
                        titleInput.placeholder = '그룹 타이틀 입력';
                    }
                }

                // label의 for 속성도 업데이트
                const label = container.querySelector('label[for*="recommend_title"]');
                if (label) {
                    label.setAttribute('for', `recommend_title_${index}`);
                }
            });
        });
    }

    // ------------ DOM 변경 관찰자 ------------
    const observer = new MutationObserver(() => {
        initRelatedContent();
        updateRecommendTextareasAndSelects();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // ------------ 초기 실행 ------------
    initModalTabs();
    initRelatedContent();
    updateRecommendTextareasAndSelects();

    // ------------ 폼 제출 처리 ------------
    const form = document.getElementById('mainForm');
    const submitBtn = document.getElementById('submitBtn');

    if (form && submitBtn) {
        // 에러 메시지 표시 함수
        function showError(elementId, message) {
            const errorElement = document.getElementById(elementId);
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
                window.scrollTo({
                    top: 400,
                    behavior: 'smooth'
                });
            }
        }

        // 에러 메시지 숨김 함수
        function hideError(elementId) {
            const errorElement = document.getElementById(elementId);
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        }

        // 모든 에러 메시지 숨김
        function hideAllErrors() {
            hideError('title_error');
            hideError('editer_error');
            hideError('description_error');
            hideError('thum_s_error');
            hideError('thum_m_error');
            hideError('thum_l_error');
        }

        // 파일 유효성 검사
        function validateFile(input, errorId) {
            if (!input.files || input.files.length === 0) {
                return true;
            }

            const file = input.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            const maxSize = 10 * 1024 * 1024; // 10MB

            if (!allowedTypes.includes(file.type)) {
                showError(errorId, 'JPG, PNG, GIF 파일만 업로드 가능합니다.');
                return false;
            }

            if (file.size > maxSize) {
                showError(errorId, '파일 크기는 10MB 이하여야 합니다.');
                return false;
            }

            hideError(errorId);
            return true;
        }

        // 폼 유효성 검사
        function validateForm() {
            hideAllErrors();
            let isValid = true;

            const post_title_main = document.getElementById('post_title_main');
            if (!post_title_main.value) {
                showError('title_error', '대제목을 입력해주세요.');
                isValid = false;
            } else if (post_title_main.value.length > 30) {
                showError('title_error', '최대 글자 수는 공백 포함 30자입니다.');
                isValid = false;
            }
            const post_subtitle = document.getElementById('post_subtitle');
            if (!post_subtitle.value) {
                showError('description_error', '부제목을 입력해주세요.');
                isValid = false;
            }
            const member_seq = document.getElementById('member_seq');
            if (!member_seq.value || member_seq.value == 0) {
                showError('editer_error', '에디터를 선택해주세요.');
                isValid = false;
            }
            const thum_s = document.getElementById('thum_s');
            if (thum_s && !validateFile(thum_s, 'thum_s_error')) {
                isValid = false;
            }
            const thum_m = document.getElementById('thum_m');
            if (thum_m && !validateFile(thum_m, 'thum_m_error')) {
                isValid = false;
            }
            const thum_l = document.getElementById('thum_l');
            if (thum_l && !validateFile(thum_l, 'thum_l_error')) {
                isValid = false;
            }

            return isValid;
        }

        // 버튼 상태 변경
        function setSubmitButtonState(loading) {
            if (loading) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>처리중...</span>';
                submitBtn.style.opacity = '0.6';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>등록</span>';
                submitBtn.style.opacity = '1';
            }
        }

        // 폼 전송 처리
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const recommendTitles = document.querySelectorAll('input[name^="recommend_title"]');
            let hasEmptyTitle = false;

            recommendTitles.forEach((input, index) => {
                if (!input.value || input.value.trim() === '') {
                    hasEmptyTitle = true;
                    console.warn(`추천 그룹 ${index}의 타이틀이 비어있습니다.`);
                }
            });

            if (hasEmptyTitle) {
                alert('추천 컨텐츠의 그룹 타이틀을 모두 입력해주세요.');
                submitBtn.disabled = false;
                return false;
            }

            function setValueSafely(targetName, sourceName) {
                const target = document.querySelector(`input[name="${targetName}"]`);
                const source = document.querySelector(`input[name="${sourceName}"]`);

                if (target && source) {
                    const value = source.getAttribute('data-value');
                    target.value = (value === null || value === undefined || value === '') ? '0' : value;
                } else {
                    if (target) {
                        target.value = '0';
                    }
                }
            }

            setValueSafely('category', 'category_tmp');
            setValueSafely('sidx', 'sidx_tmp');
            setValueSafely('member_seq', 'member_tmp');

            // 유효성 검사
            if (!validateForm()) {
                return false;
            }

            // 버튼 상태 변경
            setSubmitButtonState(true);

            // CSRF 토큰 가져오기
            let csrfToken = '';
            const inputCsrf = form.querySelector('input[name="_token"]');
            if (inputCsrf && inputCsrf.value) {
                csrfToken = inputCsrf.value;
            }

            // FormData 생성
            const formData = new FormData(form);

            // 헤더 설정
            const headers = {
                'X-Requested-With': 'XMLHttpRequest'
            };

            if (csrfToken) {
                headers['X-CSRF-TOKEN'] = csrfToken;
            }

            // AJAX로 폼 전송
            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: headers
            })
                .then(response => {
                    if (response.ok) {
                        const contentType = response.headers.get('content-type');
                        if (contentType && contentType.includes('application/json')) {
                            return response.json();
                        } else {
                            return { success: true };
                        }
                    } else {
                        return response.text().then(text => {
                            try {
                                const errorData = JSON.parse(text);

                                // 인증이 필요한 경우 리다이렉트 처리
                                if (!errorData.success && errorData.redirect) {
                                    alert(errorData.message || '로그인후 다시 작업 해주세요.');
                                    window.location.href = errorData.redirect;
                                    return;
                                }

                                throw new Error(errorData.message || '서버 오류가 발생했습니다.');
                            } catch (e) {
                                // JSON 파싱 실패 시
                                if (e instanceof SyntaxError) {
                                    throw new Error('서버 오류가 발생했습니다. (HTTP ' + response.status + ')');
                                }
                                // 다른 에러는 그대로 전파
                                throw e;
                            }
                        });
                    }
                })
                .then(data => {
                    // 성공 처리
                    if (data.success !== false) {
                        const currentUrl = '/master/c/contents';
                        const successMessage = encodeURIComponent('등록 되었습니다.');
                        window.location.href = currentUrl + '?success=' + successMessage;
                    } else {
                        setSubmitButtonState(false);
                        if (data.errors) {
                            Object.keys(data.errors).forEach(field => {
                                const errorId = field + '_error';
                                showError(errorId, data.errors[field][0]);
                            });
                        }
                        alert(data.message || '등록 중 오류가 발생했습니다.');
                    }
                })
                .catch(error => {
                    setSubmitButtonState(false);
                    let errorMessage = '오류가 발생했습니다.';

                    if (error.message.includes('500')) {
                        errorMessage = '서버 내부 오류가 발생했습니다. ';
                    } else if (error.message.includes('419')) {
                        errorMessage = 'CSRF 토큰이 만료되었습니다. 페이지를 새로고침 후 다시 시도하세요.';
                    } else if (error.message.includes('422')) {
                        errorMessage = '입력값에 오류가 있습니다.';
                    } else {
                        errorMessage = error.message;
                    }

                    alert(errorMessage);
                });

            return false;
        });

        // 파일 삭제 버튼 처리
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('del_btn')) {
                const targetId = e.target.getAttribute('data-target');
                const fileInput = document.getElementById(targetId);
                const imgBox = e.target.closest('.img_box');

                if (fileInput) {
                    fileInput.value = '';
                }

                if (imgBox) {
                    imgBox.style.display = 'none';
                }
            }
        });

        // 파일 선택 시 미리보기
        document.addEventListener('change', function(e) {
            if (e.target.type === 'file' && e.target.files.length > 0) {
                const file = e.target.files[0];
                const targetId = e.target.id;
                let previewId = '';

                if (targetId === 'thum_s') {
                    previewId = 'preViewthum_s';
                } else if (targetId === 'thum_m') {
                    previewId = 'preViewthum_m';
                } else if (targetId === 'thum_l') {
                    previewId = 'preViewthum_l';
                }

                if (previewId) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const previewImg = document.getElementById(previewId);
                        const imgBox = previewImg.closest('.img_box');

                        if (previewImg) {
                            previewImg.src = event.target.result;
                        }

                        if (imgBox) {
                            imgBox.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    // ------------ 전역 함수 노출 ------------
    window.activateModalTab = activateModalTab;
    window.submitForm = function() {
        // modal_contents.js의 submitForm 함수 호출을 위한 브릿지
        const event = new CustomEvent('modalSubmitForm');
        document.dispatchEvent(event);
    };
});
