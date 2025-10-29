const navConfig = [
    { 
        name: "시스템 설정",
        lightIcon: "/src/assets/icons/gnb_site.png",
        darkIcon: "/src/assets/icons/gnb_site_dark.png",
        children: [
            { name: "메인 노출 설정", link: "/pages/setting/homepage/homepage-main.html" },
            { name: "배너 관리", link: "/pages/setting/banner/banner-list.html" },
            { name: "콘텐츠 에디터", link: "/pages/setting/editor/editor-list.html" },
            { name: "푸시 관리", link: "/pages/setting/push/push-list.html" },
        ]
    },
    { 
        name: "콘텐츠 관리",
        lightIcon: "/src/assets/icons/gnb_support.png",
        darkIcon: "/src/assets/icons/gnb_support_dark.png",
        children: [
            { name: "시리즈 관리", link: "/pages/contents/series/series-list.html" },
            { name: "콘텐츠 관리", link: "/pages/contents/contents/contents-list.html"},
            { name: "카테고리 관리", link: "/pages/contents/category/category-contents.html" },
            { name: "키워드 관리", link: "/pages/contents/keyword/keyword.html" },
        ]
    },
    {
        name: "게시판 관리",
        lightIcon: "/src/assets/icons/gnb_board.png",
        darkIcon: "/src/assets/icons/gnb_board_dark.png",
        children: [
            { name: "공지사항 관리", link: "/pages/board/board-list.html" },
        ]
    }
];

/**
 * 네비게이션 데이터를 반환하는 함수
 * @returns {Array} - 네비게이션 항목 배열
 */

export const navigationData = () => {
    if (!navConfig) {
        console.warn(`Unknown navigation elements!`);
        return [];
    }
    return navConfig;
};
