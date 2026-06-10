/** 统一的平滑滚动（绕过 scroll-protection 对 behavior 的干扰） */

(function () {
	if (window.__smoothScrollBootstrapped) {
		return;
	}
	window.__smoothScrollBootstrapped = true;

	function getScrollY() {
		return window.scrollY || document.documentElement.scrollTop || 0;
	}

	function setDocumentScrollTop(y) {
		const top = Math.max(0, y);
		// 同时写入，避免 write→read(body.scrollTop) 每帧强制重排
		document.documentElement.scrollTop = top;
		if (document.body) {
			document.body.scrollTop = top;
		}
	}

	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function syncNavbarDuringSmoothScroll(scrollY) {
		if (window.__homePreScrollActive) {
			return;
		}

		window.__syncNavbarWrapperForScrollY?.(scrollY);
		syncSemifullNavbarDuringSmoothScroll(scrollY);
	}

	function finishSmoothScroll(goalY) {
		const navbar = document.getElementById("navbar");
		const isHome = navbar?.getAttribute("data-is-home") === "true";

		window.__clearNavbarWrapperInlineStyles?.();
		document.documentElement.classList.remove("is-smooth-scrolling");

		if (!window.__homePreScrollActive) {
			window.applySemifullNavbarVisualState?.(goalY, isHome);
		}

		window.__smoothScrollActive = false;

		if (
			window.tocClickTimestamp &&
			Date.now() - window.tocClickTimestamp < 2000
		) {
			document.getElementById("toc-wrapper")?.classList.remove("toc-not-ready");
		}
		window.__syncTocHideForScroll?.(goalY, window.innerHeight);
	}

	function syncSemifullNavbarDuringSmoothScroll(scrollY) {
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

	function smoothScrollToY(targetY, duration, easingFn, onProgress) {
		const resolvedDuration =
			typeof duration === "number" && duration > 0 ? duration : 650;
		const ease = typeof easingFn === "function" ? easingFn : easeOutCubic;
		const startY = getScrollY();
		const goalY = Math.max(0, Math.round(targetY));

		if (Math.abs(goalY - startY) <= 8) {
			syncNavbarDuringSmoothScroll(goalY);
			setDocumentScrollTop(goalY);
			if (typeof onProgress === "function") {
				onProgress(1, goalY);
			}
			return Promise.resolve();
		}

		return new Promise<void>(function (resolve) {
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				syncNavbarDuringSmoothScroll(goalY);
				setDocumentScrollTop(goalY);
				if (typeof onProgress === "function") {
					onProgress(1, goalY);
				}
				resolve();
				return;
			}

			window.__smoothScrollActive = true;
			document.documentElement.classList.add("is-smooth-scrolling");
			const startTime = performance.now();

			const step = function (now) {
				const progress = Math.min(
					(now - startTime) / resolvedDuration,
					1,
				);
				const nextY = Math.round(
					startY + (goalY - startY) * ease(progress),
				);

				// 先同步视觉状态再写 scrollTop，避免 write→read 同帧强制重排
				syncNavbarDuringSmoothScroll(nextY);
				if (typeof onProgress === "function") {
					onProgress(progress, nextY);
				}
				setDocumentScrollTop(nextY);

				if (progress < 1) {
					requestAnimationFrame(step);
					return;
				}

				setDocumentScrollTop(goalY);
				finishSmoothScroll(goalY);
				resolve();
			};

			requestAnimationFrame(step);
		});
	}

	function smoothScrollToTop(duration, easingFn, onProgress) {
		return smoothScrollToY(0, duration, easingFn, onProgress);
	}

	function smoothScrollToElement(element, offset, duration) {
		if (!element) {
			return Promise.resolve();
		}

		const navbarOffset = typeof offset === "number" ? offset : 80;
		const targetTop =
			element.getBoundingClientRect().top + getScrollY() - navbarOffset;

		window.tocClickTimestamp = Date.now();
		return smoothScrollToY(targetTop, duration, undefined, undefined);
	}

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

	/** 冻结滚动（body fixed，保留 html scrollbar-gutter） */
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

	/** 换页瞬间回顶 + 冻结（无预滚动、且已在顶部附近时使用） */
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

