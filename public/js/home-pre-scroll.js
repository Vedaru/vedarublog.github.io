/** 换页前：若已向下滚动，先平滑回顶再应用布局 / 交给 Swup（须在 Layout 改 banner 之前完成） */

(function () {
	if (window.__homePreScrollBootstrapped) {
		return;
	}
	window.__homePreScrollBootstrapped = true;

	const PRE_SCROLL_MIN_MS = 580;
	const PRE_SCROLL_MAX_MS = 920;
	const SEMIFULL_SCROLL_THRESHOLD = 50;

	function getScrollY() {
		return window.__getScrollY?.() ?? 0;
	}

	function getPreScrollDurationMs() {
		const scrollY = getScrollY();
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
		return window.__isHomePagePath?.(pathname) ?? false;
	}

	function pathFromVisitUrl(url) {
		return window.__pathFromUrl?.(url) ?? url ?? "";
	}

	function isSamePageNavigation(fromPathname, toUrl) {
		const toPathname = pathFromVisitUrl(toUrl);
		if (fromPathname === toPathname) {
			return true;
		}
		return window.__pathsEqual?.(fromPathname, toUrl) ?? false;
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

	function syncSemifullNavbarDuringPreScroll(visit, scrollY) {
		const applyState = window.applySemifullNavbarVisualState;
		if (typeof applyState !== "function") return;

		if (typeof scrollY !== "number") {
			scrollY = getScrollY();
		}
		const navbar = document.getElementById("navbar");
		const sourceIsHome = navbar?.getAttribute("data-is-home") === "true";
		const targetIsHome = isTargetHomePage(visit);

		if (scrollY <= SEMIFULL_SCROLL_THRESHOLD) {
			applyState(scrollY, targetIsHome);
			return;
		}

		applyState(scrollY, sourceIsHome);
	}

	function syncNavbarDuringPreScroll(visit, scrollY) {
		window.__syncNavbarWrapperForScrollY?.(scrollY);
		syncSemifullNavbarDuringPreScroll(visit, scrollY);
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

		window.__clearNavbarWrapperInlineStyles?.();

		window.__pinScrollTopWithFrames?.(2);
		requestAnimationFrame(function () {
			document.documentElement.classList.remove(
				"is-home-pre-scrolling",
				"is-visit-pre-scrolling",
			);
			activePreScrollVisit = null;
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

	function registerHomePreScrollListeners(swup) {
		if (listenersRegistered || !swup?.hooks) {
			return listenersRegistered;
		}
		listenersRegistered = true;

		swup.hooks.on(
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
					function (_progress, scrollY) {
						syncNavbarDuringPreScroll(visit, scrollY);
					},
				).then(function () {
					finishPreScrollTransition(visit);
				});
			},
			{ priority: -100 },
		);

		swup.hooks.on(
			"content:scroll",
			function (visit) {
				if (!visit?.scroll?.reset) {
					return false;
				}

				const scrollY = getScrollY();
				if (scrollY <= 8) {
					visit.scroll.reset = false;
				}
			},
			{ before: true },
		);

		swup.hooks.on("visit:end", function () {
			window.__homePreScrollCompleted = false;
			window.__homePreScrollActive = false;
			activePreScrollVisit = null;
		});

		return true;
	}

	window.onSwupReady?.(registerHomePreScrollListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			window.onSwupReady?.(registerHomePreScrollListeners);
		});
	}
})();
