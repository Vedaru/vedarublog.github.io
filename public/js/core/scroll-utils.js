/** 滚动读取与 pin 工具 — 全站共享 */

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
