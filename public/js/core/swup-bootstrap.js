/** Swup 钩子注册引导 — 统一 onSwupReady / onSwupHook 模板 */

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
