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

	function setScrollY(y) {
		const top = Math.max(0, Math.round(y));
		document.documentElement.scrollTop = top;
		if (document.body) {
			document.body.scrollTop = top;
		}
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

	function getLayoutShiftDurationMs() {
		if (!window.matchMedia("(max-width: 1279px)").matches) {
			return getPreScrollDurationMs();
		}

		const raw = getComputedStyle(document.documentElement)
			.getPropertyValue("--mobile-shift-duration")
			.trim();
		const parsed = Number.parseInt(raw, 10);
		const mobileDuration = Number.isFinite(parsed) ? parsed : 700;
		return Math.max(getPreScrollDurationMs(), mobileDuration);
	}

	let listenersRegistered = false;
	let activePreScrollVisit = null;

	function isMainHomePage(pathname) {
		return window.__isMainHomePage?.(pathname) ?? false;
	}

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

	function isTargetMainHomePage(visit) {
		const targetUrl = visit?.to?.url || "";
		if (!targetUrl) return false;
		return isMainHomePage(pathFromVisitUrl(targetUrl));
	}

	function isLeavingHomePage(visit) {
		const fromPath = window.location.pathname;
		const targetPath = pathFromVisitUrl(visit?.to?.url || "");
		if (!targetPath) return false;

		if (isMainHomePage(fromPath) && !isMainHomePage(targetPath)) {
			return true;
		}

		if (isHomePagePath(fromPath) && !isHomePagePath(targetPath)) {
			return true;
		}

		return false;
	}

	function shouldPreScrollBeforeLeave(visit) {
		const targetUrl = visit?.to?.url || "";
		if (!targetUrl) return false;
		if (isSamePageNavigation(window.location.pathname, targetUrl)) {
			return false;
		}

		return getScrollY() > 80;
	}

	function removePreScrollClasses() {
		document.documentElement.classList.remove(
			"is-home-pre-scrolling",
			"is-visit-pre-scrolling",
			"is-visit-layout-shifting",
		);
	}

	function addPreScrollClasses(leavingHome) {
		document.documentElement.classList.add(
			"is-home-pre-scrolling",
			"is-visit-pre-scrolling",
		);
		if (leavingHome) {
			document.documentElement.classList.add("is-visit-layout-shifting");
		}
	}

	function parseCssLengthToPx(value) {
		const raw = (value || "").trim();
		if (!raw) return 0;
		if (raw.endsWith("dvh")) {
			return (window.innerHeight * parseFloat(raw)) / 100;
		}
		if (raw.endsWith("vh")) {
			return (window.innerHeight * parseFloat(raw)) / 100;
		}
		if (raw.endsWith("px")) {
			return parseFloat(raw);
		}
		const parsed = parseFloat(raw);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	function getLayoutShiftAnchor() {
		return (
			document.getElementById("content-wrapper") ||
			document.getElementById("main-grid") ||
			document.getElementById("swup-container")
		);
	}

	function getExpectedDesktopHomeGridShiftPx() {
		if (window.innerWidth < 1280) {
			return 0;
		}
		if (
			!document.body.classList.contains("is-home") &&
			!document.body.classList.contains("lg:is-home")
		) {
			return 0;
		}

		const extend = getComputedStyle(document.documentElement).getPropertyValue(
			"--banner-height-extend",
		);
		return parseCssLengthToPx(extend);
	}

	function snapshotNavbarWrapperStyles() {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper) {
			return null;
		}

		return {
			opacity: navbarWrapper.style.opacity,
			transform: navbarWrapper.style.transform,
		};
	}

	function restoreNavbarWrapperStyles(snapshot) {
		if (!snapshot) return;

		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper) return;

		if (snapshot.opacity) {
			navbarWrapper.style.opacity = snapshot.opacity;
		} else {
			navbarWrapper.style.removeProperty("opacity");
		}

		if (snapshot.transform) {
			navbarWrapper.style.transform = snapshot.transform;
		} else {
			navbarWrapper.style.removeProperty("transform");
		}
	}

	function beginLeavingHomeLayoutShift(visit) {
		const anchor = getLayoutShiftAnchor();
		const scrollBefore = getScrollY();
		const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;
		const expectedDesktopShift = getExpectedDesktopHomeGridShiftPx();

		window.__applyVisitBodyLayout?.(visit);

		void document.documentElement.offsetHeight;

		const anchorTopAfter = anchor?.getBoundingClientRect().top ?? 0;
		let layoutDelta = anchorTopBefore - anchorTopAfter;

		if (layoutDelta <= 1 && expectedDesktopShift > 1) {
			layoutDelta = expectedDesktopShift;
		}

		if (layoutDelta <= 1) {
			return;
		}

		const maxScroll = Math.max(
			0,
			document.documentElement.scrollHeight - window.innerHeight,
		);
		setScrollY(Math.min(maxScroll, Math.max(0, scrollBefore - layoutDelta)));
	}

	function getNavbarSyncOptions(sourceIsMainHome) {
		if (!sourceIsMainHome) {
			return undefined;
		}
		return { forceHomeBanner: true };
	}

	function syncSemifullNavbarDuringPreScroll(visit, scrollY, sourceIsMainHome) {
		const applyState = window.applySemifullNavbarVisualState;
		if (typeof applyState !== "function") return;

		if (typeof scrollY !== "number") {
			scrollY = getScrollY();
		}

		const targetIsHome = isTargetMainHomePage(visit);

		if (scrollY <= SEMIFULL_SCROLL_THRESHOLD) {
			applyState(scrollY, targetIsHome);
			return;
		}

		applyState(scrollY, sourceIsMainHome);
	}

	function syncNavbarDuringPreScroll(
		visit,
		scrollY,
		sourceIsMainHome,
		leavingHome,
	) {
		if (!leavingHome) {
			window.__syncNavbarWrapperForScrollY?.(
				scrollY,
				getNavbarSyncOptions(sourceIsMainHome),
			);
		}

		syncSemifullNavbarDuringPreScroll(visit, scrollY, sourceIsMainHome);
	}

	function finishPreScrollTransition(visit) {
		window.__lockSwupScroll?.();
		window.__pinPageScrollTop?.();

		const targetIsHome = isTargetMainHomePage(visit);
		window.applySemifullNavbarVisualState?.(0, targetIsHome);

		window.__homePreScrollCompleted = true;
		window.__suppressSemifullNavbarReinit = true;
		applyDeferredVisitLayout(visit);

		window.__homePreScrollActive = false;
		window.__clearNavbarWrapperInlineStyles?.();
		window.__pinScrollTopWithFrames?.(2);

		requestAnimationFrame(function () {
			removePreScrollClasses();
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

				const leavingHome = isLeavingHomePage(visit);
				const sourceIsMainHome = isMainHomePage(
					window.location.pathname,
				);
				const navbarWrapperSnapshot =
					leavingHome && sourceIsMainHome
						? snapshotNavbarWrapperStyles()
						: null;

				activePreScrollVisit = visit;
				addPreScrollClasses(leavingHome);
				window.__homePreScrollWasUsed = true;
				window.__homePreScrollActive = true;

				if (visit.scroll) {
					visit.scroll.reset = false;
				}

				window.__bannerDriftPause?.();

				if (leavingHome) {
					beginLeavingHomeLayoutShift(visit);
					restoreNavbarWrapperStyles(navbarWrapperSnapshot);
				}

				const startScrollY = getScrollY();
				syncNavbarDuringPreScroll(
					visit,
					startScrollY,
					sourceIsMainHome,
					leavingHome,
				);

				const duration = leavingHome
					? getLayoutShiftDurationMs()
					: getPreScrollDurationMs();
				const easing = window.__easeInOutCubic;
				const onProgress = function (_progress, scrollY) {
					syncNavbarDuringPreScroll(
						visit,
						scrollY,
						sourceIsMainHome,
						leavingHome,
					);
				};

				const smoothScrollToY =
					window.__smoothScrollToY ||
					function () {
						window.__pinPageScrollTop?.();
						return Promise.resolve();
					};

				return smoothScrollToY(0, duration, easing, onProgress).then(
					function () {
						finishPreScrollTransition(visit);
					},
				);
			},
			{ priority: -100 },
		);

		swup.hooks.on(
			"content:scroll",
			function (visit) {
				if (!visit?.scroll?.reset) {
					return false;
				}

				if (getScrollY() <= 8) {
					visit.scroll.reset = false;
				}
			},
			{ before: true },
		);

		swup.hooks.on("visit:end", function () {
			window.__homePreScrollCompleted = false;
			window.__homePreScrollActive = false;
			activePreScrollVisit = null;
			removePreScrollClasses();
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
