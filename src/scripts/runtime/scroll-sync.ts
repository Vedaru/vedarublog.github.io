/** 合并页面 scroll 回调到单帧 rAF，减少 Chrome Violation 与强制重排 */

(function () {
	if (window.__scrollSyncBootstrapped) return;
	window.__scrollSyncBootstrapped = true;

	let rafId = 0;
	const callbacks = new Set<
		(scrollTop: number, innerHeight: number) => void
	>();

	function flushScrollSync() {
		const scrollTop =
			window.scrollY || document.documentElement.scrollTop || 0;
		const innerHeight = window.innerHeight;
		const pending = Array.from(callbacks);
		callbacks.clear();

		for (let i = 0; i < pending.length; i++) {
			pending[i](scrollTop, innerHeight);
		}
	}

	window.__scheduleScrollSync = function scheduleScrollSync(fn) {
		if (typeof fn !== "function") return;
		callbacks.add(fn);
		if (rafId) return;
		rafId = requestAnimationFrame(function () {
			rafId = 0;
			flushScrollSync();
		});
	};

	window.__cancelScrollSync = function cancelScrollSync(fn) {
		callbacks.delete(fn);
	};

	window.__flushScrollSync = function flushScrollSyncNow() {
		if (rafId) {
			cancelAnimationFrame(rafId);
			rafId = 0;
		}
		if (callbacks.size > 0) {
			flushScrollSync();
		}
	};
})();
