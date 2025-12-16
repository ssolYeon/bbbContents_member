export const allmenu = () => {
    const btnNav = document.querySelector(".btn_nav");
    const sideGnb = document.querySelector(".side_gnb_container");
    const gnbContent = document.querySelector(".gnb_content");
    const closedButton = document.querySelector(".gnb_header button");

    // 필수 요소가 없으면 초기화하지 않음
    if (!btnNav || !sideGnb || !gnbContent || !closedButton) {
        return;
    }

    const jsonUrl = "/data/allmenu/allmenu.json"; // 실제 json 경로    // API URL로 변경
    const apiUrl = "/api/allmenu";
    btnNav.addEventListener("click", async () => {
        try {
            //const response = await fetch(jsonUrl);
            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) throw new Error("데이터 불러오기 실패");
            const data = await response.json();

            gnbContent.innerHTML = "";

            data.categories.forEach((category) => {
                const li = document.createElement("li");
                const span = document.createElement("span");
                span.className = "category_title";
                span.textContent = category.title;

                const div = document.createElement("div");
                category.category.forEach((item) => {
                    const a = document.createElement("a");
                    a.href = `${item.etitle}`;
                    a.innerHTML = `${item.ktitle} <img src="/src/assets/images/icons/icon_arrow_left_gray@3x.png" alt="">`;
                    div.appendChild(a);
                });

                li.appendChild(span);
                li.appendChild(div);
                gnbContent.appendChild(li);
            });

            sideGnb.classList.add("active");
            document.body.style.overflow = "hidden"; // 바디 스크롤 막기
        } catch (err) {
            console.error(err);
        }
    });
    closedButton.addEventListener("click", () => {
        sideGnb.classList.remove("active");
        document.body.style.overflow = ""; // 바디 스크롤 복구
    });
};
