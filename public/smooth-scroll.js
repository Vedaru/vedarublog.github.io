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
		return t < 0.5
			? 4 * t * t * t
			: 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function smoothScrollToY(targetY, duration, easingFn, onProgress) {
		const resolvedDuration =
			typeof duration === "number" && duration > 0 ? duration : 650;
		const ease = typeof easingFn === "function" ? easingFn : easeOutCubic;
		const startY = getScrollY();
		const goalY = Math.max(0, Math.round(targetY));

		if (Math.abs(goalY - startY) <= 8) {
			setDocumentScrollTop(goalY);
			if (typeof onProgress === "function") {
				onProgress(1, goalY);
			}
			return Promise.resolve();
		}

		return new Promise(function (resolve) {
			if (
				window.matchMedia("(prefers-reduced-motion: reduce)").matches
			) {
				setDocumentScrollTop(goalY);
				if (typeof onProgress === "function") {
					onProgress(1, goalY);
				}
				resolve();
				return;
			}

			window.__smoothScrollActive = true;
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
				if (typeof onProgress === "function") {
					onProgress(progress, nextY);
				}
				setDocumentScrollTop(nextY);

				if (progress < 1) {
					requestAnimationFrame(step);
					return;
				}

				setDocumentScrollTop(goalY);
				window.__smoothScrollActive = false;
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

		const navbarOffset =
			typeof offset === "number" ? offset : 80;
		const targetTop =
			element.getBoundingClientRect().top + getScrollY() - navbarOffset;

		window.tocClickTimestamp = Date.now();
		return smoothScrollToY(targetTop, duration);
	}

	window.__smoothScrollToY = smoothScrollToY;
	window.__smoothScrollToTop = smoothScrollToTop;
	window.__smoothScrollToElement = smoothScrollToElement;
	window.__easeInOutCubic = easeInOutCubic;
	window.__pinPageScrollTop = function () {
		setDocumentScrollTop(0);
	};

	/** 仅冻结 overflow，不改动 scrollTop（供预滚动动画使用） */
	window.__lockSwupScroll = function () {
		document.documentElement.classList.add("swup-scroll-lock");
	};

	/** 换页瞬间回顶 + 冻结（无预滚动、且已在顶部附近时使用） */
	window.__lockSwupScrollAndPin = function () {
		window.__pinPageScrollTop?.();
		window.__lockSwupScroll();
	};

	window.__unlockSwupScroll = function () {
		document.documentElement.classList.remove("swup-scroll-lock");
	};
})();
