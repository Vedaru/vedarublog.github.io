/** 统一的平滑滚动（绕过 scroll-protection 对 behavior 的干扰） */

import {
	cancelActiveTween,
	isAnimationCancelledError,
	runCancellableTween,
} from "./cancellable-tween";

(function () {
	if (window.__smoothScrollBootstrapped) {
		return;
	}
	window.__smoothScrollBootstrapped = true;

	function getScrollY() {
		return window.scrollY || document.documentElement.scrollTop || 0;
	}

	function setDocumentScrollTop(y: number) {
		const top = Math.max(0, y);
		document.documentElement.scrollTop = top;
		if (document.body) {
			document.body.scrollTop = top;
		}
	}

	function easeOutCubic(t: number) {
		return 1 - Math.pow(1 - t, 3);
	}

	function easeInOutCubic(t: number) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	let activeScrollTrip: {
		goalY: number;
		originalStartY: number;
	} | null = null;

	function syncNavbarDuringSmoothScroll(scrollY: number) {
		if (window.__homePreScrollActive) {
			return;
		}

		window.__syncNavbarWrapperForScrollY?.(scrollY);
		syncSemifullNavbarDuringSmoothScroll(scrollY);
	}

	function syncTocDuringSmoothScroll(scrollY: number) {
		if (window.__homePreScrollActive) {
			return;
		}

		window.__syncTocHideForScroll?.(scrollY, window.innerHeight);
	}

	function finishSmoothScroll(goalY: number) {
		const navbar = document.getElementById("navbar");
		const isHome = navbar?.getAttribute("data-is-home") === "true";

		window.__clearNavbarWrapperInlineStyles?.();
		document.documentElement.classList.remove("is-smooth-scrolling");

		if (!window.__homePreScrollActive) {
			window.applySemifullNavbarVisualState?.(goalY, isHome);
		}

		window.__smoothScrollActive = false;
		activeScrollTrip = null;

		if (
			window.tocClickTimestamp &&
			Date.now() - window.tocClickTimestamp < 2000
		) {
			document
				.getElementById("toc-wrapper")
				?.classList.remove("toc-not-ready");
		}
		window.__syncTocHideForScroll?.(goalY, window.innerHeight);
	}

	function syncSemifullNavbarDuringSmoothScroll(scrollY: number) {
		if (window.__homePreScrollActive) {
			return;
		}

		const applyState = window.applySemifullNavbarVisualState;
		if (typeof applyState !== "function") {
			return;
		}

		const navbar = document.getElementById("navbar");
		const isHome = navbar?.getAttribute("data-is-home") === "true";
		applyState(scrollY, isHome);
	}

	function smoothScrollToY(
		targetY: number,
		duration?: number,
		easingFn?: (t: number) => number,
		onProgress?: (progress: number, scrollY: number) => void,
	) {
		const resolvedDuration =
			typeof duration === "number" && duration > 0 ? duration : 650;
		const ease = typeof easingFn === "function" ? easingFn : easeOutCubic;
		const startY = getScrollY();
		const goalY = Math.max(0, Math.round(targetY));
		const distance = Math.abs(goalY - startY);

		if (distance <= 8) {
			activeScrollTrip = null;
			syncNavbarDuringSmoothScroll(goalY);
			syncTocDuringSmoothScroll(goalY);
			setDocumentScrollTop(goalY);
			if (typeof onProgress === "function") {
				onProgress(1, goalY);
			}
			return Promise.resolve();
		}

		if (
			!activeScrollTrip ||
			activeScrollTrip.goalY !== goalY
		) {
			activeScrollTrip = {
				goalY,
				originalStartY: startY,
			};
		}

		const fullDistance = Math.abs(
			goalY - activeScrollTrip.originalStartY,
		);
		const adjustedDuration =
			fullDistance > 8
				? resolvedDuration * (distance / fullDistance)
				: resolvedDuration;

		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			activeScrollTrip = null;
			syncNavbarDuringSmoothScroll(goalY);
			syncTocDuringSmoothScroll(goalY);
			setDocumentScrollTop(goalY);
			if (typeof onProgress === "function") {
				onProgress(1, goalY);
			}
			return Promise.resolve();
		}

		window.__smoothScrollActive = true;
		document.documentElement.classList.add("is-smooth-scrolling");

		const { promise } = runCancellableTween({
			duration: adjustedDuration,
			ease,
			onFrame: function (t, progress) {
				const nextY = Math.round(startY + (goalY - startY) * t);

				syncNavbarDuringSmoothScroll(nextY);
				syncTocDuringSmoothScroll(nextY);
				if (typeof onProgress === "function") {
					onProgress(progress, nextY);
				}
				setDocumentScrollTop(nextY);
			},
			onComplete: function () {
				setDocumentScrollTop(goalY);
				finishSmoothScroll(goalY);
			},
		});

		return promise.catch(function (err) {
			if (isAnimationCancelledError(err)) {
				window.__smoothScrollActive = false;
				return;
			}
			throw err;
		});
	}

	function smoothScrollToTop(
		duration?: number,
		easingFn?: (t: number) => number,
		onProgress?: (progress: number, scrollY: number) => void,
	) {
		return smoothScrollToY(0, duration, easingFn, onProgress);
	}

	function smoothScrollToElement(
		element: Element | null,
		offset?: number,
		duration?: number,
	) {
		if (!element) {
			return Promise.resolve();
		}

		const navbarOffset = typeof offset === "number" ? offset : 80;
		const targetTop =
			element.getBoundingClientRect().top + getScrollY() - navbarOffset;

		window.tocClickTimestamp = Date.now();
		return smoothScrollToY(targetTop, duration, undefined, undefined);
	}

	window.__cancelSmoothScroll = function () {
		cancelActiveTween("cancelled");
		activeScrollTrip = null;
		window.__smoothScrollActive = false;
		document.documentElement.classList.remove("is-smooth-scrolling");
	};

	window.__smoothScrollToY = smoothScrollToY;
	window.__smoothScrollToTop = smoothScrollToTop;
	window.__smoothScrollToElement = smoothScrollToElement;
	window.__easeInOutCubic = easeInOutCubic;

	var lockedScrollY = 0;
	var isScrollLocked = false;

	window.__pinPageScrollTop = function () {
		setDocumentScrollTop(0);
		if (isScrollLocked) {
			lockedScrollY = 0;
			document.body.style.top = "0px";
		}
	};

	window.__lockSwupScroll = function () {
		if (isScrollLocked) return;
		lockedScrollY =
			window.scrollY || document.documentElement.scrollTop || 0;
		document.body.style.position = "fixed";
		document.body.style.top = "-" + lockedScrollY + "px";
		document.body.style.width = "100%";
		document.documentElement.classList.add("swup-scroll-lock");
		isScrollLocked = true;
	};

	window.__lockSwupScrollAndPin = function () {
		window.__pinPageScrollTop?.();
		lockedScrollY = 0;
		if (isScrollLocked) {
			document.body.style.top = "0px";
			return;
		}
		document.body.style.position = "fixed";
		document.body.style.top = "0px";
		document.body.style.width = "100%";
		document.documentElement.classList.add("swup-scroll-lock");
		isScrollLocked = true;
	};

	window.__unlockSwupScroll = function () {
		if (!isScrollLocked) return;
		document.documentElement.classList.remove("swup-scroll-lock");
		document.body.style.position = "";
		document.body.style.top = "";
		document.body.style.width = "";
		window.scrollTo(0, lockedScrollY);
		isScrollLocked = false;
	};
})();
