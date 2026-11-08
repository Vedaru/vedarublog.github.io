/**
 * Minimal post-transition work queue.
 *
 * Swup owns the content fade, and the grid/banner slide is CSS. Widgets
 * register here so their DOM work starts only after that 700ms slide has
 * settled, then drains in idle time. No polling, no compositor pausing.
 */

const idlePhaseCallbacks: Array<() => void> = [];
const idleWorkQueue: Array<() => void> = [];
let idleScheduled = false;

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
		window.requestIdleCallback ??
		((callback: IdleRequestCallback) =>
			window.setTimeout(
				() =>
					callback({
						didTimeout: false,
						timeRemaining: () => 16,
					} as IdleDeadline),
				48,
			));
	schedule(drainIdleQueue, { timeout: 800 });
}

/** Drop queued work when a new visit starts; registrations stay. */
export function resetSwupIdle() {
	idleWorkQueue.length = 0;
}

/** Signal that the slide is done, then run the registered work. */
export function runSwupIdle() {
	document.dispatchEvent(
		new CustomEvent("swup:transition-ready", {
			detail: { path: window.location.pathname },
		}),
	);

	for (const fn of idlePhaseCallbacks) {
		try {
			fn();
		} catch (error) {
			console.error("Swup idle phase callback failed:", error);
		}
	}

	scheduleIdle();
}

window.__onSwupPageIdlePhase = function onSwupPageIdlePhase(fn) {
	if (typeof fn === "function") idlePhaseCallbacks.push(fn);
};

window.__scheduleSwupIdleWork = function scheduleSwupIdleWork(fn) {
	if (typeof fn !== "function") return;
	idleWorkQueue.push(fn);
	scheduleIdle();
};

export {};
