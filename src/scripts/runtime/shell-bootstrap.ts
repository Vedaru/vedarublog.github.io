// @ts-nocheck ? legacy side-effect IIFE migrated from public/js

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
/** ???????? ????src/utils/route-utils.ts ?????*/

(function () {
	if (window.__routeUtilsBootstrapped) return;
	window.__routeUtilsBootstrapped = true;

	function normalizePath(path) {
		return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
	}

	function isHomePagePath(pathname) {
		return (
			pathname === "/" || pathname === "" || /^\/?\d+\/?$/.test(pathname)
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
/** Navbar ???????????home-pre-scroll / Layout scroll ?? */

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

	window.__clearNavbarWrapperInlineStyles =
		function clearNavbarWrapperInlineStyles() {
			const navbarWrapper = document.getElementById("navbar-wrapper");
			if (!navbarWrapper) return;
			navbarWrapper.style.removeProperty("opacity");
			navbarWrapper.style.removeProperty("transform");
		};

	function computeNavbarWrapperFade(scrollY, threshold) {
		const fadeRange = Math.max(120, threshold * 0.2);
		if (scrollY <= threshold) {
			return { opacity: 1, translateRem: 0, active: false };
		}
		const progress = Math.min(1, (scrollY - threshold) / fadeRange);
		return {
			opacity: 1 - progress,
			translateRem: progress * 4,
			active: progress > 0,
		};
	}

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

		const threshold =
			window.__getNavbarHideThreshold?.() ?? Number.POSITIVE_INFINITY;
		const fade = computeNavbarWrapperFade(scrollY, threshold);

		navbarWrapper.style.opacity = String(fade.opacity);
		if (fade.opacity < 0.05) {
			navbarWrapper.style.transform = "translateY(-4rem)";
		} else if (fade.translateRem > 0) {
			navbarWrapper.style.transform =
				"translateY(" + -fade.translateRem + "rem)";
		} else {
			navbarWrapper.style.removeProperty("transform");
		}
	};

	window.__finalizeNavbarWrapperAfterScroll =
		function finalizeNavbarWrapperAfterScroll() {
			document.documentElement.classList.remove(
				"is-manual-scroll-syncing",
			);

			const scrollY =
				window.__getScrollY?.() ??
				window.scrollY ??
				document.documentElement.scrollTop ??
				0;

			const navbarEl = document.getElementById("navbar");
			if (navbarEl?.getAttribute("data-transparent-mode") === "semifull") {
				const isHome = navbarEl.getAttribute("data-is-home") === "true";
				window.applySemifullNavbarVisualState?.(scrollY, isHome);
			}

			const navbarWrapper = document.getElementById("navbar-wrapper");
			if (
				!navbarWrapper ||
				!document.body.classList.contains("enable-banner")
			) {
				return;
			}

			const threshold =
				window.__getNavbarHideThreshold?.() ?? Number.POSITIVE_INFINITY;

			if (scrollY > threshold) {
				return;
			}

			const currentOpacity = Number.parseFloat(
				navbarWrapper.style.opacity,
			);
			const needsFadeIn =
				!Number.isNaN(currentOpacity) && currentOpacity < 0.999;

			if (
				needsFadeIn &&
				!window.matchMedia("(prefers-reduced-motion: reduce)").matches
			) {
				let cleared = false;
				const clearAfterTransition = function () {
					if (cleared) return;
					cleared = true;
					navbarWrapper.removeEventListener(
						"transitionend",
						onTransitionEnd,
					);
					window.__clearNavbarWrapperInlineStyles?.();
				};
				const onTransitionEnd = function (event) {
					if (
						event.target !== navbarWrapper ||
						event.propertyName !== "opacity"
					) {
						return;
					}
					clearAfterTransition();
				};

				navbarWrapper.addEventListener("transitionend", onTransitionEnd);
				navbarWrapper.style.opacity = "1";
				window.setTimeout(clearAfterTransition, 350);
				return;
			}

			window.__clearNavbarWrapperInlineStyles?.();
		};
})();
/** Swup ?????? ???? onSwupReady / onSwupHook ?? */

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
/** ?? body ?? / ?? class / TOC ???? ??Layout ??MainGridLayout ?? */

(function () {
	if (window.__visitLayoutBootstrapped) return;
	window.__visitLayoutBootstrapped = true;

	const BANNER_HEIGHT = 35;

	window.__applyWallpaperBodyClasses = function applyWallpaperBodyClasses(
		mode,
	) {
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

		window.__applyVisitBannerLayout?.(visit);
	};

	/** ??? banner ????? is-home??????? sticky ?? top ????? */
	window.__applyVisitBannerLayout = function applyVisitBannerLayout(visit) {
		const pathsEqual = window.__pathsEqual;
		if (!pathsEqual) return;

		const isHomePage = pathsEqual(visit.to.url, "/");

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

	/** ?? body ?? class ???? Layout body ???? */
	window.__bootstrapWallpaperBodyClasses =
		function bootstrapWallpaperBodyClasses() {
			const mode =
				document.documentElement.getAttribute("data-wallpaper-mode") ||
				"banner";
			window.__applyWallpaperBodyClasses(mode);
		};
})();

