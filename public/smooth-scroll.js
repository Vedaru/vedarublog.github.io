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
		document.documentElement.scrollTop = y;
		document.body.scrollTop = y;
	}

	function easeOutCubic(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	function easeInOutCubic(t) {
		return t < 0.5
			? 4 * t * t * t
			: 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	function smoothScrollToY(targetY, duration, easingFn) {
		const resolvedDuration =
			typeof duration === "number" && duration > 0 ? duration : 650;
		const ease = typeof easingFn === "function" ? easingFn : easeOutCubic;
		const startY = getScrollY();
		const goalY = Math.max(0, Math.round(targetY));

		if (Math.abs(goalY - startY) <= 8) {
			setDocumentScrollTop(goalY);
			return Promise.resolve();
		}

		return new Promise(function (resolve) {
			if (
				window.matchMedia("(prefers-reduced-motion: reduce)").matches
			) {
				setDocumentScrollTop(goalY);
				resolve();
				return;
			}

			const startTime = performance.now();

			const step = function (now) {
				const progress = Math.min(
					(now - startTime) / resolvedDuration,
					1,
				);
				const nextY = Math.round(
					startY + (goalY - startY) * ease(progress),
				);

				setDocumentScrollTop(nextY);

				if (progress < 1) {
					requestAnimationFrame(step);
					return;
				}

				setDocumentScrollTop(goalY);
				resolve();
			};

			requestAnimationFrame(step);
		});
	}

	function smoothScrollToTop(duration, easingFn) {
		return smoothScrollToY(0, duration, easingFn);
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
})();
