export interface MainGridSwupConfig {
	navbarTransparentMode: string;
	defaultWallpaperMode: string;
	defaultPostListLayout: string;
	allowPostListSwitch: boolean;
	allowWallpaperSwitch: boolean;
}

export function initMainGridSwup(config: MainGridSwupConfig): void {
	const {
		navbarTransparentMode,
		defaultWallpaperMode,
		defaultPostListLayout,
		allowPostListSwitch,
		allowWallpaperSwitch,
	} = config;

	function setMainGridLayout(mainGrid, layout) {
		if (!mainGrid) return;
		mainGrid.classList.remove("layout-switching");
		mainGrid.setAttribute("data-layout-mode", layout);
	}

	function getWallpaperMode() {
		if (allowWallpaperSwitch) {
			return localStorage.getItem("wallpaperMode") || defaultWallpaperMode;
		}
		return defaultWallpaperMode;
	}

	function getPostListLayout() {
		if (allowPostListSwitch) {
			return (
				localStorage.getItem("postListLayout") || defaultPostListLayout
			);
		}
		return defaultPostListLayout;
	}

	function syncWallpaperDataset(mode) {
		document.documentElement.setAttribute("data-wallpaper-mode", mode);
	}

	function syncPostListDataset(layout) {
		document.documentElement.setAttribute("data-post-list-layout", layout);
	}

	function applyWallpaperBodyClasses(mode) {
		window.__applyWallpaperBodyClasses?.(mode);
	}

	function isWallpaperBodySynced(mode) {
		var body = document.body;
		switch (mode) {
			case "banner":
				return (
					body.classList.contains("enable-banner") &&
					!body.classList.contains("no-banner-mode") &&
					!body.classList.contains("wallpaper-transparent")
				);
			case "fullscreen":
				return (
					body.classList.contains("wallpaper-transparent") &&
					body.classList.contains("no-banner-mode") &&
					!body.classList.contains("enable-banner")
				);
			case "none":
				return (
					body.classList.contains("no-banner-mode") &&
					!body.classList.contains("enable-banner") &&
					!body.classList.contains("wallpaper-transparent")
				);
			default:
				return false;
		}
	}

	function syncTocHideForScroll(scrollTop, innerHeight) {
		window.__syncTocHideForScroll?.(scrollTop, innerHeight);
	}

	function initWallpaperNavbarAndToc(
		wallpaperMode: string,
		cachedScrollTop?: number,
		options?: {
			skipSemifullInit?: boolean;
			skipTocHideSync?: boolean;
		},
	) {
		var scrollTop =
			typeof cachedScrollTop === "number"
				? cachedScrollTop
				: window.scrollY || document.documentElement.scrollTop || 0;
		var navbar = document.getElementById("navbar");
		if (wallpaperMode === "banner") {
			if (navbar) {
				navbar.removeAttribute("data-dynamic-transparent");
				navbar.setAttribute(
					"data-transparent-mode",
					navbarTransparentMode,
				);
				if (
					!options?.skipSemifullInit &&
					navbarTransparentMode === "semifull" &&
					window.initSemifullScrollDetection &&
					!window.__suppressSemifullNavbarReinit
				) {
					window.initSemifullScrollDetection(scrollTop);
				}
			}
		} else if (wallpaperMode === "fullscreen") {
			if (navbar) {
				navbar.setAttribute("data-dynamic-transparent", "semi");
				navbar.removeAttribute("data-transparent-mode");
			}
		} else {
			if (navbar) {
				navbar.setAttribute("data-dynamic-transparent", "none");
				navbar.removeAttribute("data-transparent-mode");
			}
		}

		if (!options?.skipTocHideSync) {
			syncTocHideForScroll(scrollTop, window.innerHeight);
		}
	}

	function syncMainGridLayoutFromDataset() {
		var layout =
			document.documentElement.getAttribute("data-post-list-layout") ||
			getPostListLayout();
		var mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			setMainGridLayout(mainGrid, layout);
		}
	}

	// DOM 加载后执行
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			applyWallpaperMode(true);
			syncMainGridLayoutFromDataset();
		});
	} else {
		applyWallpaperMode(true);
		syncMainGridLayoutFromDataset();
	}

	function isSwupTransitionLocked() {
		var html = document.documentElement;
		return (
			html.classList.contains("is-changing") ||
			html.classList.contains("is-animating") ||
			html.classList.contains("swup-perf-active")
		);
	}

	function runWallpaperSyncOnTransition(cachedScrollTop) {
		var wallpaperMode = getWallpaperMode();
		syncWallpaperDataset(wallpaperMode);

		var mainContent = document.querySelector(".main-panel");
		if (mainContent) {
			mainContent.classList.toggle(
				"wallpaper-transparent",
				wallpaperMode === "fullscreen",
			);
		}

		var scrollTop =
			typeof cachedScrollTop === "number"
				? cachedScrollTop
				: window.scrollY || document.documentElement.scrollTop || 0;
		applyWallpaperBodyClasses(wallpaperMode);
		initWallpaperNavbarAndToc(wallpaperMode, scrollTop, {
			skipSemifullInit: true,
			skipTocHideSync: true,
		});
	}

	window.__runWallpaperNavbarSyncOnTransition = runWallpaperSyncOnTransition;

	function applyWallpaperMode(isInitialLoad) {
		var wallpaperMode = getWallpaperMode();
		syncWallpaperDataset(wallpaperMode);

		var mainContent = document.querySelector(".main-panel");
		if (mainContent) {
			mainContent.classList.toggle(
				"wallpaper-transparent",
				wallpaperMode === "fullscreen",
			);
		}

		if (isInitialLoad && isWallpaperBodySynced(wallpaperMode)) {
			initWallpaperNavbarAndToc(wallpaperMode);
			return;
		}

		if (!isInitialLoad && isSwupTransitionLocked()) {
			window.__deferWallpaperNavbarSync?.();
			return;
		}

		var body = document.body;
		body.classList.add("wallpaper-switching");
		if (window.__wallpaperSwitchTimer) {
			window.clearTimeout(window.__wallpaperSwitchTimer);
		}
		window.__wallpaperSwitchTimer = window.setTimeout(function () {
			body.classList.remove("wallpaper-switching");
		}, 750);

		requestAnimationFrame(function () {
			var scrollTop =
				window.scrollY || document.documentElement.scrollTop || 0;
			applyWallpaperBodyClasses(wallpaperMode);
			initWallpaperNavbarAndToc(wallpaperMode, scrollTop);
		});
	}

	// 鐩戝惉澹佺焊妯″紡鍙樺寲锛岀珛鍗冲簲鐢紙涓嶉噸杞介〉闈級
	window.addEventListener("wallpaper-mode-change", function (_event) {
		applyWallpaperMode(false);
	});

	// Swup 页面过渡布局同步
	function setupSwupLayoutSync() {
			// @ts-ignore
			if (typeof window !== "undefined" && window.swup) {
				// animation:out:start 前准备布局
				// @ts-ignore
					window.swup.hooks.on("animation:out:start", function () {
						var pendingLayout = getPostListLayout();
						if (pendingLayout) {
							// @ts-ignore
							window.__pendingLayoutMode = pendingLayout;
						}
					});

					// 在内容替换后立即应用布局，不等待其他脚本
					// @ts-ignore
					window.swup.hooks.on("content:replace", function () {
						const mainGrid = document.getElementById("main-grid");
						if (mainGrid) {
							// @ts-ignore
							const currentLayout =
								window.__pendingLayoutMode || getPostListLayout();
							setMainGridLayout(mainGrid, currentLayout);
							syncPostListDataset(currentLayout);
							const postListContainer = document.getElementById(
								"post-list-container",
							);
							if (postListContainer) {
								// 移除现有布局类
								postListContainer.classList.remove(
									"list-mode",
									"grid-mode",
								);

								if (currentLayout === "grid") {
									postListContainer.classList.add("grid-mode");
									postListContainer.classList.add(
										"grid",
										"grid-cols-1",
										"lg:grid-cols-2",
										"gap-6",
									);
									postListContainer.classList.remove(
										"flex",
										"flex-col",
									);
								} else {
									postListContainer.classList.add("list-mode");
									postListContainer.classList.add("flex", "flex-col");
									postListContainer.classList.remove(
										"grid",
										"grid-cols-1",
										"lg:grid-cols-2",
										"gap-6",
									);
								}
							}

							// 清除临时状态
							// @ts-ignore
							delete window.__pendingLayoutMode;
						}
					});

			return true;
		}
		return false;
	}

	// 灏濊瘯绔嬪嵆璁剧疆锛屽鏋滃け璐ュ垯寤惰繜閲嶈瘯
	if (!setupSwupLayoutSync()) {
		const checkSwup = setInterval(function () {
			if (setupSwupLayoutSync()) {
				clearInterval(checkSwup);
			}
		}, 50);

		setTimeout(function () {
			clearInterval(checkSwup);
		}, 2000);
	}

	// 鏀寔 Swup 椤甸潰杩囨浮 鈥?澹佺焊/navbar 鍚屾寤跺悗鍒扮紪鎺掑櫒 Phase 1
	document.addEventListener("swup:page:view", function () {
		window.__deferWallpaperNavbarSync?.();

		requestAnimationFrame(function () {
			syncMainGridLayoutFromDataset();
		});
	});
}
