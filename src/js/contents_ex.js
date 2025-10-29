document.addEventListener("DOMContentLoaded", () => {
  const MIN_COUNT = 3; // 3개 이상만 묶으려면 3으로 변경
  const allFigures = Array.from(document.querySelectorAll("figure"))
    .filter(f => !f.closest(".slide")); // 이미 slide 내부는 제외

  // 연속 figure 그룹 만들기
  const groups = [];
  let current = [];
  allFigures.forEach((fig, i) => {
    const prev = allFigures[i - 1];
    const isNewGroup = !prev || fig.previousElementSibling !== prev; // 바로 앞 엘리먼트가 이전 figure가 아니면 새 그룹
    if (isNewGroup) {
      if (current.length) groups.push(current);
      current = [fig];
    } else {
      current.push(fig);
    }
  });
  if (current.length) groups.push(current);

  // 그룹을 slide/wapper로 감싸고 Swiper 마크업 최소 추가
  let slideIndex = 1;
  groups.forEach(group => {
    if (group.length < MIN_COUNT) return;

    const slide = document.createElement("div");
    slide.className = `swiper slide${slideIndex++}`;

    const wapper = document.createElement("div");
    wapper.className = "swiper-wrapper";

    // 내비게이션 버튼 생성
    const prevBtn = document.createElement("div");
    prevBtn.className = "swiper-button-prev";
    const nextBtn = document.createElement("div");
    nextBtn.className = "swiper-button-next";

    // DOM 삽입
    group[0].before(slide);
    slide.appendChild(wapper);


    // figure -> swiper-slide로 이동/클래스 추가
    group.forEach(f => {
      f.classList.add("swiper-slide"); // ✅ figure에 swiper-slide 부여
      wapper.appendChild(f);    // ✅ .swiper-wrapper 내부로 이동
    });
    slide.appendChild(prevBtn);
    slide.appendChild(nextBtn);
  });


  /////////////////////swiper/////////////////////
  // 1) 공통 기본 옵션 (변수)
  const DEFAULT_OPTS = {
    slidesPerView: 1.1,
    spaceBetween: 0,
    loop: false,
    speed: 700,
    direction: 'horizontal',
//	loop: true,
//	centeredSlides: true,
	slideToClickedSlide: false,   // ← 내가 직접 제어
    watchSlidesProgress: true,
    watchOverflow: true,
    grabCursor: true,
    touchRatio: 0.8,
    shortSwipes: true,
    longSwipes: true,
    longSwipesRatio: 0.1,
    preventClicks: true,          // 클릭 중 드래그 잡음 방지
    preloadImages: false,
    autoplay: false,
    observer: true,
    lazy : {
        loadPrevNext : true, // 이전, 다음 이미지는 미리 로딩
        loadPrevNextAmount: 2,
        loadOnTransitionStart: true,
    },
  };

  // 2) 인덱스별 옵션 (원하면 빈 객체로 두세요)
  const INDEX_OPTS = [
    /* 0번째 */ { },
  ];

  // 3) 실행: 각 컨테이너를 forEach로 순회하며 i 사용
  document.querySelectorAll('.swiper').forEach((el, i) => {
    // 버튼/페이지네이션 엘리먼트
    const nextEl = el.querySelector('.swiper-button-next');
    const prevEl = el.querySelector('.swiper-button-prev');
    console.log(el);

    // data-swiper-options로 개별 옵션도 허용 (선택)
    //let dataOpts = {};
    const raw = el.getAttribute('data-swiper-options');
    if (raw) { try { dataOpts = JSON.parse(raw); } catch (e) { console.warn('Invalid data-swiper-options', e); } }

    // 옵션 병합: 공통 → 인덱스별 → data-옵션
    const opts = Object.assign({}, DEFAULT_OPTS, INDEX_OPTS[i] || {});

    // 초기화
    if (nextEl && prevEl) opts.navigation = { nextEl, prevEl };
    const swiper = new Swiper(el, opts);
    el._swiper = swiper; // (선택) 참조 보관
  });



  //////////////////////////////////// 게이지바
  const CONTENT_SELECTOR = '#app_wrapper';       // 진행률 기준
  const MOUNT_SELECTOR   = 'header';  // 게이지를 넣을 위치

  const target = document.querySelector(CONTENT_SELECTOR);
  const host   = document.querySelector(MOUNT_SELECTOR);
  if (!target || !host) return;

  // 1) 게이지 마크업을 스크립트로 생성 & 삽입
  const gauge = document.createElement('span');
  gauge.className = 'gauge';
  gauge.style.setProperty('--p', '0'); // 초기값
  host.prepend(gauge);                 // container 맨 앞에 삽입

  // 2) 스크롤에 따라 --p(%) 업데이트
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isContainerScrollable = () => {
    const cs = getComputedStyle(target);
    return target.scrollHeight > target.clientHeight &&
           /(auto|scroll)/.test(cs.overflowY);
  };

  let raf = null;
  const update = () => {
    raf = null;
    let p = 0;

    if (isContainerScrollable()) {
      // 컨테이너 자체 스크롤 기준
      const max = target.scrollHeight - target.clientHeight;
      p = max > 0 ? target.scrollTop / max : 1;
    } else {
      // 윈도우 스크롤 기준으로 #app_wrapper 진행률 계산
      const rect     = target.getBoundingClientRect();
      const startY   = rect.top + window.scrollY;
      const height   = target.scrollHeight;
      const max      = height - window.innerHeight;
      const scrolled = window.scrollY - startY;
      p = max > 0 ? scrolled / max : (height <= window.innerHeight ? 1 : 0);
    }

    gauge.style.setProperty('--p', (clamp(p, 0, 1) * 100).toFixed(2));
  };

  const reqUpdate = () => { if (!raf) raf = requestAnimationFrame(update); };

  // 3) 이벤트 바인딩 (둘 다 걸어도 문제 없음 — update에서 분기)
  window.addEventListener('scroll', reqUpdate, { passive: true });
  target.addEventListener('scroll', reqUpdate, { passive: true });
  window.addEventListener('resize', reqUpdate);
  window.addEventListener('load', reqUpdate);

  // 콘텐츠 높이 변동 대응(이미지 로딩 등)
  new ResizeObserver(reqUpdate).observe(target);

  // 초기 계산
  reqUpdate();


//콘텐츠 비주얼 화면 벗어나면 없어짐.
const io = new IntersectionObserver(es=>{
  es.forEach(e=> e.target.classList.toggle('is-active', e.isIntersecting));
},{threshold:0});
document.querySelectorAll('.thumbnail_container').forEach(s=>io.observe(s));

  const post = document.querySelector('.post_content_container');
  const fab  = document.querySelector('.floating_actions_container');
  if (!post || !fab) return;
  const parent = fab.parentElement;
  const s = post.appendChild(Object.assign(document.createElement('i'), {style:'display:block;height:1px'}));
  const toggle = v => {
    fab.classList.toggle('inline', v);
    parent && parent.classList.toggle('inline', v); // 부모에도 inline
  };
  new IntersectionObserver(es => toggle(es[0].isIntersecting)).observe(s);


});






