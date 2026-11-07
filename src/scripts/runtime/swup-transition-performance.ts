/**
 * Minimal Swup post-transition layer.
 *
 * The old implementation paused compositing work, locked the page, forced
 * decodes and split the visit into write/layout/idle phases. That machinery
 * existed to keep the grid slide from stuttering, and was itself a source of
 * long tasks during the slide. All we need now is one place to run
 * non-critical work after the grid/banner slide has finished.
 */

(function () {
	if (window.__swupPerfBootstrapped) {
		return;
	}
	window.__swupPerfBootstrapped = true;

	const idlePhaseCallbacks: Array<() => void> = [];
	const idleWorkQueue: Array<() => void> = [];
	let idleScheduled = false;
	let readyScheduled = false;
	let readyDone = false;
	let visitGeneration = 0;

	function runIdlePhaseCallbacks() {
		for (const fn of idlePhaseCallbacks) {
			try {
				fn();
			} catch (error) {
				console.error("Swup idle phase callback failed:", error);
			}
		}
	}

	function drainIdleQueue() {
		idleScheduled = false;
		const queue = idleWorkQueue.splice(0);
		for (const fn of queue) {
			try {
				fn();
			} catch (error) {
				console.error("Swup idle work failed:", error);
			}
		}
	}

	function scheduleIdle() {
		if (idleScheduled || idleWorkQueue.length === 0) return;
		idleScheduled = true;
		const schedule =
			window.requestIdleCallback ||
			function (cb: IdleRequestCallback) {
				return window.setTimeout(
					() =>
						cb({
							didTimeout: false,
							timeRemaining: () => 16,
						} as IdleDeadline),
					48,
				);
			};
		schedule(drainIdleQueue, { timeout: 800 });
	}

	function announceTransitionReady() {
		if (readyDone || readyScheduled) return;
		const html = document.documentElement;
		if (
			html.classList.contains("is-layout-sliding") ||
			html.classList.contains("is-changing") ||
			html.classList.contains("is-animating")
		) {
			window.setTimeout(announceTransitionReady, 100);
			return;
		}
		readyScheduled = true;
		const generation = visitGeneration;
		requestAnimationFrame(() => {
			if (generation !== visitGeneration || readyDone) return;
			readyScheduled = false;
			readyDone = true;
			document.dispatchEvent(
				new CustomEvent("swup:transition-ready", {
					detail: { path: window.location.pathname },
				}),
			);
			runIdlePhaseCallbacks();
			scheduleIdle();
		});
	}

	// Kept as globals because sidebar widgets and the theme scaler register
	// through them from independently bundled scripts.
	window.__onSwupPageIdlePhase = function (fn) {
		if (typeof fn === "function") idlePhaseCallbacks.push(fn);
	};

	window.__scheduleSwupIdleWork = function (fn) {
		if (typeof fn !== "function") return;
		idleWorkQueue.push(fn);
		scheduleIdle();
	};

	function attach() {
		if (!window.swup?.hooks) return false;
		window.swup.hooks.on("visit:start", () => {
			visitGeneration++;
			readyDone = false;
			readyScheduled = false;
		});
		window.swup.hooks.on("visit:end", announceTransitionReady);
		document.addEventListener("vedaru:layout-settled", () => {
			announceTransitionReady();
		});
		return true;
	}

	if (!attach()) {
		document.addEventListener("swup:enable", attach, { once: true });
	}

	window.addEventListener("load", scheduleIdle, { once: true });
})();

export {};
