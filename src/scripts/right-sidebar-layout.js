// 右侧边栏布局管理器
// 用于在网格模式下隐藏右侧边栏

/**
 * 初始化页面布局
 * @param {string} pageType - 页面类型（projects, skills等）
 */
function initPageLayout(_pageType) {
	// 获取布局配置
	const defaultPostListLayout =
		localStorage.getItem("postListLayout") || "list";

	// 如果默认布局是网格模式，则隐藏右侧边栏
	if (defaultPostListLayout === "grid") {
		hideRightSidebar();
	} else {
		showRightSidebar();
	}

	// 监听布局切换事件
	window.addEventListener("layoutChange", (event) => {
		const layout = event.detail.layout;
		if (layout === "grid") {
			hideRightSidebar();
		} else {
			showRightSidebar();
		}
	});

	// 监听本地存储变化（用于跨标签页同步）
	window.addEventListener("storage", (event) => {
		if (event.key === "postListLayout") {
			if (event.newValue === "grid") {
				hideRightSidebar();
			} else {
				showRightSidebar();
			}
		}
	});

	// 监听页面导航事件
	document.addEventListener("astro:page-load", () => {
		setTimeout(() => {
			const currentLayout = localStorage.getItem("postListLayout") || "list";
			if (currentLayout === "grid") {
				hideRightSidebar();
			} else {
				showRightSidebar();
			}
		}, 100);
	});

	// 监听SWUP导航事件
	document.addEventListener("swup:contentReplaced", () => {
		setTimeout(() => {
			const currentLayout = localStorage.getItem("postListLayout") || "list";
			if (currentLayout === "grid") {
				hideRightSidebar();
			} else {
				showRightSidebar();
			}
		}, 100);
	});
}

/**
 * 隐藏右侧边栏
 */
function hideRightSidebar() {
	// 在网格模式下不隐藏右侧边栏 - 保持显示
	const rightSidebar = document.querySelector(".right-sidebar-container");
	if (rightSidebar) {
		// 移除隐藏类
		rightSidebar.classList.remove("hidden-in-grid-mode");

		// 保持显示 - 使用 !important 确保不被覆盖
		rightSidebar.style.setProperty("display", "", "important");
		rightSidebar.style.setProperty("visibility", "visible", "important");
		rightSidebar.style.setProperty("opacity", "1", "important");

		// 强制移除最大宽度限制，让网格完全控制
		rightSidebar.style.setProperty("max-width", "none", "important");
		rightSidebar.style.setProperty("width", "auto", "important");

		// 调整主网格布局 - 给右侧栏足够的空间
		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			// 使用固定宽度：左侧 280px、中间 1fr、右侧 280px
			mainGrid.style.setProperty(
				"grid-template-columns",
				"280px 1fr 280px",
				"important",
			);
			mainGrid.setAttribute("data-layout-mode", "grid");
		}
	}
}

/**
 * 显示右侧边栏
 */
function showRightSidebar() {
	const rightSidebar = document.querySelector(".right-sidebar-container");
	if (rightSidebar) {
		// 移除隐藏类
		rightSidebar.classList.remove("hidden-in-grid-mode");

		// 恢复显示 - 清除内联样式
		rightSidebar.style.cssText = "";

		// 恢复主网格布局
		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			mainGrid.style.gridTemplateColumns = "";
			mainGrid.setAttribute("data-layout-mode", "list");
		}
	}
}

// 页面加载完成后初始化
function initialize() {
	const pageType =
		document.documentElement.getAttribute("data-page-type") || "projects";
	initPageLayout(pageType);

	// 添加持续监控，确保右侧栏不被意外隐藏
	const rightSidebar = document.querySelector(".right-sidebar-container");
	if (rightSidebar) {
		const observer = new MutationObserver(() => {
			const currentLayout = localStorage.getItem("postListLayout") || "list";
			if (currentLayout === "grid") {
				// 确保网格模式下右侧栏始终显示
				if (rightSidebar.style.display === "none") {
					hideRightSidebar();
				}
			}
		});

		observer.observe(rightSidebar, {
			attributes: true,
			attributeFilter: ["style", "class"],
		});
	}
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initialize);
} else {
	initialize();
}

// 导出函数供其他脚本使用
if (typeof module !== "undefined" && module.exports) {
	module.exports = {
		initPageLayout,
		hideRightSidebar,
		showRightSidebar,
	};
}

// 同时也挂载到 window 对象，以便在浏览器环境中直接调用
if (typeof window !== "undefined") {
	window.rightSidebarLayout = {
		initPageLayout,
		hideRightSidebar,
		showRightSidebar,
	};
}
