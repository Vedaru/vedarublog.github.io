/** 滚动读取�?pin 工具 �?全站共享 */

(function () {
	if (window.__scrollUtilsBootstrapped) return;
	window.__scrollUtilsBootstrapped = true;

	window.__getScrollY = function getScrollY() {
		return window.scrollY || document.documentElement.scrollTop || 0;
	};

	window.__pinPageScrollTop = function pinPageScrollTop() {
		const y = window.__getScrollY();
		window.scrollTo(0, y);
	};

	window.__pinScrollTopWithFrames = function pinScrollTopWithFrames(count) {
		const frames = typeof count === "number" ? count : 2;
		window.__pinPageScrollTop?.();
		let remaining = frames;
		function step() {
			window.__pinPageScrollTop?.();
			remaining -= 1;
			if (remaining > 0) {
				requestAnimationFrame(step);
			}
		}
		requestAnimationFrame(step);
	};
})();
/** 浏览器端路由工具 �?�?src/utils/route-utils.ts 逻辑一�?*/

(function () {
	if (window.__routeUtilsBootstrapped) return;
	window.__routeUtilsBootstrapped = true;

	function normalizePath(path) {
		return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
	}

	function isHomePagePath(pathname) {
		return (
			pathname === "/" ||
			pathname === "" ||
			/^\/?\d+\/?$/.test(pathname)
		);
	}

	function resolveHomePageIndex(path) {
		const normalized = normalizePath(path);
		if (normalized === "") return 1;
		if (/^\d+$/.test(normalized)) {
			return Number.parseInt(normalized, 10);
		}
		return null;
	}

	function pathFromUrl(url) {
		try {
			return new URL(url, window.location.origin).pathname;
		} catch {
			return url || "";
		}
	}

	function pathsEqual(path1, path2) {
		const page1 = resolveHomePageIndex(path1);
		const page2 = resolveHomePageIndex(path2);
		if (page1 !== null && page2 !== null) {
			return page1 === page2;
		}
		return normalizePath(path1) === normalizePath(path2);
	}

	window.__normalizePath = normalizePath;
	window.__isHomePagePath = isHomePagePath;
	window.__resolveHomePageIndex = resolveHomePageIndex;
	window.__pathFromUrl = pathFromUrl;
	window.__pathsEqual = pathsEqual;
})();
/** Navbar 隐藏阈值计�?�?�?home-pre-scroll / Layout scroll 共享 */

(function () {
	if (window.__navbarScrollSyncBootstrapped) return;
	window.__navbarScrollSyncBootstrapped = true;

	const NAVBAR_BANNER_HEIGHT = 35;
	const NAVBAR_BANNER_HEIGHT_HOME = 65;

	window.__getNavbarHideThreshold = function getNavbarHideThreshold() {
		if (!document.body.classList.contains("enable-banner")) {
			return Number.POSITIVE_INFINITY;
		}

		const isHome =
			document.body.classList.contains("lg:is-home") &&
			window.innerWidth >= 1024;
		const bannerHeight = isHome
			? NAVBAR_BANNER_HEIGHT_HOME
			: NAVBAR_BANNER_HEIGHT;

		return window.innerHeight * (bannerHeight / 100) - 88;
	};

	window.__clearNavbarWrapperInlineStyles = function clearNavbarWrapperInlineStyles() {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper) return;
		navbarWrapper.style.removeProperty("opacity");
		navbarWrapper.style.removeProperty("transform");
	};

	window.__syncNavbarWrapperForScrollY = function syncNavbarWrapperForScrollY(
		scrollY,
	) {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (
			!navbarWrapper ||
			!document.body.classList.contains("enable-banner")
		) {
			return;
		}

		navbarWrapper.classList.remove("navbar-hidden");

		if (typeof scrollY !== "number") {
			scrollY =
				window.__getScrollY?.() ??
				window.scrollY ??
				document.documentElement.scrollTop ??
				0;
		}

		const threshold = window.__getNavbarHideThreshold?.() ?? Number.POSITIVE_INFINITY;

		if (scrollY >= threshold) {
			const fadeRange = Math.max(120, threshold * 0.2);
			const progress = Math.min(1, (scrollY - threshold) / fadeRange);
			const opacity = 1 - progress;
			navbarWrapper.style.opacity = String(opacity);
			navbarWrapper.style.transform =
				opacity < 0.05
					? "translateY(-4rem)"
					: "translateY(" + -progress * 4 + "rem)";
			return;
		}

		window.__clearNavbarWrapperInlineStyles();
	};
})();
/** Swup 钩子注册引导 �?统一 onSwupReady / onSwupHook 模板 */

(function () {
	if (window.__swupBootstrapBootstrapped) return;
	window.__swupBootstrapBootstrapped = true;

	window.onSwupReady = function onSwupReady(registerFn, options) {
		const retryMs = options?.retryMs ?? 50;
		const timeoutMs = options?.timeoutMs ?? 5000;
		let registered = false;
		let retryTimer = null;
		let timeoutTimer = null;

		function tryRegister() {
			if (registered) return;
			if (window.swup?.hooks) {
				registered = true;
				if (retryTimer) clearInterval(retryTimer);
				if (timeoutTimer) clearTimeout(timeoutTimer);
				registerFn(window.swup);
			}
		}

		tryRegister();
		if (registered) return;

		document.addEventListener("swup:enable", tryRegister);

		retryTimer = setInterval(tryRegister, retryMs);
		timeoutTimer = setTimeout(function () {
			if (retryTimer) clearInterval(retryTimer);
		}, timeoutMs);

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", tryRegister);
		} else {
			tryRegister();
		}
	};

	window.onSwupHook = function onSwupHook(hook, fn, options) {
		window.onSwupReady(function (swup) {
			swup.hooks.on(hook, fn);
		}, options);
	};
})();
/** 换页 body 布局 / 壁纸 class / TOC 滚动隐藏 �?Layout �?MainGridLayout 共享 */

(function () {
	if (window.__visitLayoutBootstrapped) return;
	window.__visitLayoutBootstrapped = true;

	const BANNER_HEIGHT = 35;

	window.__applyWallpaperBodyClasses = function applyWallpaperBodyClasses(mode) {
		const body = document.body;
		body.classList.remove(
			"enable-banner",
			"wallpaper-transparent",
			"no-banner-mode",
		);
		switch (mode) {
			case "banner":
				body.classList.add("enable-banner");
				break;
			case "fullscreen":
				body.classList.add("wallpaper-transparent", "no-banner-mode");
				break;
			case "none":
				body.classList.add("no-banner-mode");
				break;
		}
	};

	window.__syncTocHideForScroll = function syncTocHideForScroll(
		scrollTop,
		innerHeight,
	) {
		const wallpaperMode =
			document.documentElement.getAttribute("data-wallpaper-mode") ||
			"banner";
		const tocWrapper = document.getElementById("toc-wrapper");
		if (!tocWrapper) return;

		const vh =
			typeof innerHeight === "number" ? innerHeight : window.innerHeight;

		if (wallpaperMode === "banner") {
			const bannerHeight = vh * (BANNER_HEIGHT / 100);
			if (scrollTop <= bannerHeight) {
				tocWrapper.classList.add("toc-hide");
			} else {
				tocWrapper.classList.remove("toc-hide");
			}
		} else {
			tocWrapper.classList.remove("toc-hide");
		}
	};

	window.__applyVisitBodyLayout = function applyVisitBodyLayout(visit) {
		const pathsEqual = window.__pathsEqual;
		if (!pathsEqual) return;

		const bodyElement = document.querySelector("body");
		const isHomePage = pathsEqual(visit.to.url, "/");

		if (bodyElement) {
			if (isHomePage) {
				bodyElement.classList.add("lg:is-home", "is-home");
			} else {
				bodyElement.classList.remove("lg:is-home", "is-home");
			}
		}

		const bannerTextOverlay = document.querySelector(
			".banner-text-overlay",
		);
		if (bannerTextOverlay) {
			if (isHomePage) {
				bannerTextOverlay.classList.remove("hidden");
			} else {
				bannerTextOverlay.classList.add("hidden");
			}
		}

		const bannerWrapper = document.getElementById("banner-wrapper");
		const mainContentWrapper = document.querySelector(
			".absolute.w-full.z-30",
		);

		if (bannerWrapper && mainContentWrapper) {
			if (isHomePage) {
				bannerWrapper.classList.remove("mobile-hide-banner");
				mainContentWrapper.classList.remove("mobile-main-no-banner");
			} else {
				bannerWrapper.classList.add("mobile-hide-banner");
				mainContentWrapper.classList.add("mobile-main-no-banner");
			}
		}
	};

	/** 首屏 body 壁纸 class �?替代 Layout body 内联脚本 */
	window.__bootstrapWallpaperBodyClasses = function bootstrapWallpaperBodyClasses() {
		const mode =
			document.documentElement.getAttribute("data-wallpaper-mode") ||
			"banner";
		window.__applyWallpaperBodyClasses(mode);
	};
})();
