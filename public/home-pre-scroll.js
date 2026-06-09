/** 换页前：若已向下滚动，先平滑回顶再应用布局 / 交给 Swup（须在 Layout 改 banner 之前完成） */

(function () {
	if (window.__homePreScrollBootstrapped) {
		return;
	}
	window.__homePreScrollBootstrapped = true;

	const PRE_SCROLL_MIN_MS = 580;
	const PRE_SCROLL_MAX_MS = 920;
	const NAVBAR_BANNER_HEIGHT = 35;
	const NAVBAR_BANNER_HEIGHT_HOME = 65;
	const SEMIFULL_SCROLL_THRESHOLD = 50;

	function getScrollY() {
		return Math.max(
			window.scrollY || 0,
			document.documentElement.scrollTop || 0,
			document.body.scrollTop || 0,
		);
	}
	function getPreScrollDurationMs() {
		const scrollY = getScrollY();
		// 按滚动距离估算时长，长页面回顶更慢、更自然
		return Math.round(
			Math.min(
				PRE_SCROLL_MAX_MS,
				Math.max(PRE_SCROLL_MIN_MS, scrollY * 0.48),
			),
		);
	}

	let listenersRegistered = false;
	let activePreScrollVisit = null;

	function isHomePagePath(pathname) {
		return (
			pathname === "/" ||
			pathname === "" ||
			/^\/\d+\/?$/.test(pathname)
		);
	}

	function normalizePath(path) {
		return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
	}

	function resolveHomePageIndex(path) {
		const normalized = normalizePath(path);
		if (normalized === "") return 1;
		if (/^\d+$/.test(normalized)) {
			return Number.parseInt(normalized, 10);
		}
		return null;
	}

	function isSameResolvedHomeUrl(fromPathname, toUrl) {
		const fromPage = resolveHomePageIndex(fromPathname);
		const toPage = resolveHomePageIndex(toUrl);

		if (fromPage !== null && toPage !== null) {
			return fromPage === toPage;
		}

		return normalizePath(fromPathname) === normalizePath(toUrl);
	}

	function pathFromVisitUrl(url) {
		try {
			return new URL(url, window.location.origin).pathname;
		} catch {
			return url || "";
		}
	}

	function isSamePageNavigation(fromPathname, toUrl) {
		const toPathname = pathFromVisitUrl(toUrl);
		if (fromPathname === toPathname) {
			return true;
		}
		return isSameResolvedHomeUrl(fromPathname, toUrl);
	}

	function isTargetHomePage(visit) {
		const targetUrl = visit?.to?.url || "";
		if (!targetUrl) return false;
		return isHomePagePath(pathFromVisitUrl(targetUrl));
	}

	function shouldPreScrollBeforeLeave(visit) {
		const targetUrl = visit?.to?.url || "";
		if (!targetUrl) return false;
		if (isSamePageNavigation(window.location.pathname, targetUrl)) {
			return false;
		}

		const scrollY = getScrollY();
		return scrollY > 80;
	}

	function getNavbarHideThreshold() {
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
	}

	function clearNavbarPreScrollInlineStyles() {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper) return;
		navbarWrapper.style.opacity = "";
		navbarWrapper.style.transform = "";
	}

	function syncNavbarWrapperDuringPreScroll() {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper || !document.body.classList.contains("enable-banner")) {
			return;
		}

		// 预滚动期间不用 navbar-hidden（会触发 transition-all 在解冻时跳变）
		navbarWrapper.classList.remove("navbar-hidden");

		const scrollY = getScrollY();
		const threshold = getNavbarHideThreshold();

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
		} else {
			navbarWrapper.style.removeProperty("opacity");
			navbarWrapper.style.removeProperty("transform");
		}
	}

	function syncSemifullNavbarDuringPreScroll(visit) {
		const applyState = window.applySemifullNavbarVisualState;
		if (typeof applyState !== "function") return;

		const scrollY = getScrollY();
		const navbar = document.getElementById("navbar");
		const sourceIsHome = navbar?.getAttribute("data-is-home") === "true";
		const targetIsHome = isTargetHomePage(visit);

		if (scrollY <= SEMIFULL_SCROLL_THRESHOLD) {
			applyState(scrollY, targetIsHome);
			return;
		}

		applyState(scrollY, sourceIsHome);
	}

	function syncNavbarDuringPreScroll(visit) {
		syncNavbarWrapperDuringPreScroll();
		syncSemifullNavbarDuringPreScroll(visit);
	}

	function finishPreScrollTransition(visit) {
		window.__lockSwupScroll?.();
		window.__pinPageScrollTop?.();

		const targetIsHome = isTargetHomePage(visit);
		window.applySemifullNavbarVisualState?.(0, targetIsHome);

		window.__homePreScrollCompleted = true;
		window.__suppressSemifullNavbarReinit = true;
		applyDeferredVisitLayout(visit);
		window.__homePreScrollActive = false;

		clearNavbarPreScrollInlineStyles();

		requestAnimationFrame(function () {
			window.__pinPageScrollTop?.();
			requestAnimationFrame(function () {
				document.documentElement.classList.remove(
					"is-home-pre-scrolling",
					"is-visit-pre-scrolling",
				);
				window.__pinPageScrollTop?.();
				activePreScrollVisit = null;
			});
		});
	}

	function applyDeferredVisitLayout(visit) {
		if (typeof window.__applyVisitStartLayout === "function") {
			window.__applyVisitStartLayout(visit, { deferBodyLayout: true });
			return;
		}

		document.dispatchEvent(
			new CustomEvent("vedaru:home-pre-scroll-done", {
				detail: { visit: visit },
			}),
		);
	}

	window.__shouldHomePreScroll = shouldPreScrollBeforeLeave;

	window.__resetHomePreScrollState = function () {
		window.__homePreScrollCompleted = false;
		window.__homePreScrollWasUsed = false;
		window.__suppressSemifullNavbarReinit = false;
	};

	function registerHomePreScrollListeners() {
		if (listenersRegistered || !window.swup?.hooks) {
			return listenersRegistered;
		}
		listenersRegistered = true;

		window.swup.hooks.on(
			"visit:start",
			function (visit) {
				window.__homePreScrollWasUsed = false;
				window.__homePreScrollCompleted = false;
				window.__suppressSemifullNavbarReinit = false;

				if (!shouldPreScrollBeforeLeave(visit)) {
					return;
				}

				activePreScrollVisit = visit;
				document.documentElement.classList.add(
					"is-home-pre-scrolling",
					"is-visit-pre-scrolling",
				);
				window.__homePreScrollWasUsed = true;
				window.__homePreScrollActive = true;

				if (visit.scroll) {
					visit.scroll.reset = false;
				}

				window.__bannerDriftPause?.();
				syncNavbarDuringPreScroll(visit);

				const smoothScrollToTop =
					window.__smoothScrollToTop ||
					function () {
						window.__pinPageScrollTop?.();
						return Promise.resolve();
					};

				return smoothScrollToTop(
					getPreScrollDurationMs(),
					window.__easeInOutCubic,
					function () {
						syncNavbarDuringPreScroll(visit);
					},
				).then(function () {
					finishPreScrollTransition(visit);
				});
			},
			// Swup：priority 越小越早执行；须在 Layout visit:start 之前设置标志并启动动画
			{ priority: -100 },
		);

		window.swup.hooks.on(
			"content:scroll",
			function (visit) {
				if (!visit?.scroll?.reset) {
					return false;
				}

				const scrollY =
					window.scrollY ||
					document.documentElement.scrollTop ||
					0;
				if (scrollY <= 8) {
					visit.scroll.reset = false;
				}
			},
			{ before: true },
		);

		window.swup.hooks.on("visit:end", function () {
			const hadPreScrollNavbarLock = window.__suppressSemifullNavbarReinit;
			window.__homePreScrollCompleted = false;
			window.__homePreScrollActive = false;
			window.__suppressSemifullNavbarReinit = false;
			activePreScrollVisit = null;

			if (hadPreScrollNavbarLock) {
				requestAnimationFrame(function () {
					window.initSemifullScrollDetection?.();
				});
			}
		});

		return true;
	}

	function bootstrapHomePreScroll() {
		if (registerHomePreScrollListeners()) {
			return;
		}

		document.addEventListener("swup:enable", registerHomePreScrollListeners);

		const retryTimer = window.setInterval(function () {
			if (registerHomePreScrollListeners()) {
				window.clearInterval(retryTimer);
			}
		}, 50);

		window.setTimeout(function () {
			window.clearInterval(retryTimer);
		}, 5000);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapHomePreScroll);
	} else {
		bootstrapHomePreScroll();
	}
})();
