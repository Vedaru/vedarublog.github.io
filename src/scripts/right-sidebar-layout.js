// 右侧边栏布局管理器
// 仅负责按 localStorage.postListLayout 切换 .right-sidebar-container
// 的 hidden-in-grid-mode 类（MainGridLayout.astro 里 `display: none !important;`）。
//
// #main-grid 的 data-layout-mode 由 main-grid-swup.ts 统一管理；本文件不再
// 触碰它——过去的 animateMainGrid 与 #main-grid 的 main-grid-float 关键帧
// 与 body 上 --banner-slide 过渡在同一 transform 属性上叠加，是回顶
// 抖动的根因（实测：换页到首页时 localStorage 与 SSR 默认值不一致触发）。

function isGridLayout() {
	return (localStorage.getItem("postListLayout") || "list") === "grid";
}

function syncRightSidebar() {
	const rightSidebar = document.querySelector(".right-sidebar-container");
	if (!rightSidebar) return;
	if (isGridLayout()) {
		rightSidebar.classList.add("hidden-in-grid-mode");
	} else {
		rightSidebar.classList.remove("hidden-in-grid-mode");
	}
}

/**
 * 初始化页面布局
 * @param {string} pageType - 页面类型（projects, skills等）
 */
function initPageLayout(_pageType) {
	syncRightSidebar();

	window.addEventListener("layoutChange", syncRightSidebar);

	// 跨标签页同步
	window.addEventListener("storage", (event) => {
		if (event.key === "postListLayout") syncRightSidebar();
	});

	// Astro / Swup 换页后再次同步
	document.addEventListener("astro:page-load", () => {
		setTimeout(syncRightSidebar, 100);
	});
	document.addEventListener("swup:contentReplaced", () => {
		setTimeout(syncRightSidebar, 100);
	});
}

// 页面加载完成后初始化
function initialize() {
	const pageType =
		document.documentElement.getAttribute("data-page-type") || "projects";
	initPageLayout(pageType);
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize);
} else {
	initialize();
}

// 导出函数供其他脚本使用
if (typeof module !== "undefined" && module.exports) {
	module.exports = { initPageLayout, syncRightSidebar };
}

if (typeof window !== "undefined") {
	window.rightSidebarLayout = { initPageLayout, syncRightSidebar };
}
