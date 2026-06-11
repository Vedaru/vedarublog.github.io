/** Swup 换页性能：分阶段编排 DOM 写入/布局读/idle 重活，减轻换页尖峰强制重排 */

(function () {
	if (window.__swupPerfBootstrapped) {
		return;
	}
	window.__swupPerfBootstrapped = true;

	let perfListenersRegistered = false;
	let resumeTimer: ReturnType<typeof setTimeout> | null = null;
	let transitionDepth = 0;
	// 每次新换页递增，用于让上一轮换页遗留的异步恢复回调失效，
	// 避免在 Pio 隐藏未恢复的间隙再次换页时，旧回调中途解锁滚动导致页面跳回。
	let transitionEpoch = 0;
	const writePhaseCallbacks: Array<(detail: { scrollTop: number }) => void> =
		[];
	const layoutPhaseCallbacks: Array<(detail: { scrollTop: number }) => void> =
		[];
	const idlePhaseCallbacks: Array<() => void> = [];
	let idleWorkQueue: Array<() => void> = [];

	function getMobileShiftDurationMs() {
		const raw = getComputedStyle(document.documentElement)
			.getPropertyValue("--mobile-shift-duration")
			.trim();
		const parsed = Number.parseInt(raw, 10);
		return Number.isFinite(parsed) ? parsed : 700;
	}

	function setPioTransitionHidden(hidden) {
		document.querySelectorAll(".pio-container").forEach(function (el) {
			el.classList.toggle("pio-swup-hidden", hidden);
		});
	}

	function setPioReducedDuringTransition() {
		if (!window.__PIO_RENDER_CONTROL) {
			return;
		}

		window.__PIO_RENDER_CONTROL._wasPaused = false;
		window.__PIO_RENDER_CONTROL.mode = "reduced";
		window.__PIO_RENDER_CONTROL.reduceFPS = 10;
		window.__PIO_RENDER_CONTROL._softResumeUntil = 0;
	}

	function resumePioSoftly() {
		setPioTransitionHidden(false);

		if (window.__PIO_RENDER_CONTROL) {
			window.__PIO_RENDER_CONTROL._wasPaused = false;
			window.__PIO_RENDER_CONTROL.mode = "reduced";
			window.__PIO_RENDER_CONTROL.reduceFPS = 20;
			window.__PIO_RENDER_CONTROL._lastRender = 0;
			window.__PIO_RENDER_CONTROL._softResumeUntil =
				(performance.now?.() ?? Date.now()) + 800;
		}
	}

	function settlePageLayoutBeforeResume(epoch, done) {
		if (epoch !== transitionEpoch) return;

		window.__pinPageScrollTop?.();
		window.__unlockSwupScroll?.();

		requestAnimationFrame(function () {
			if (epoch !== transitionEpoch) return;
			window.__pinPageScrollTop?.();
			requestAnimationFrame(function () {
				if (epoch !== transitionEpoch) return;
				window.__pinPageScrollTop?.();
				done();
			});
		});
	}

	function removeTocNotReady() {
		const toc = document.getElementById("toc-wrapper");
		if (toc) {
			toc.classList.remove("toc-not-ready");
		}
	}

	function readDocumentScrollTop() {
		return window.scrollY || document.documentElement.scrollTop || 0;
	}

	function runWritePhase(scrollTop) {
		removeTocNotReady();
		window.__swupPhaseScrollTop = scrollTop;
		window.__swupPhaseInnerHeight = window.innerHeight;

		if (window.__pendingWallpaperSync) {
			window.__pendingWallpaperSync = false;
			window.__runWallpaperNavbarSyncOnTransition?.(scrollTop);
		}

		for (let i = 0; i < writePhaseCallbacks.length; i++) {
			writePhaseCallbacks[i]({ scrollTop: scrollTop });
		}
	}

	function runLayoutPhase(scrollTop) {
		const detail = { scrollTop: scrollTop };
		for (let i = 0; i < layoutPhaseCallbacks.length; i++) {
			layoutPhaseCallbacks[i](detail);
		}
	}

	function runIdleWorkQueue() {
		for (let i = 0; i < idleWorkQueue.length; i++) {
			idleWorkQueue[i]();
		}
		idleWorkQueue = [];
	}

	function runIdlePhaseCallbacks() {
		for (let i = 0; i < idlePhaseCallbacks.length; i++) {
			idlePhaseCallbacks[i]();
		}
	}

	function runPioAndBannerResume() {
		resumePioSoftly();
		window.__bannerDriftResume?.();
		window.__resetHomePreScrollState?.();
	}

	function dispatchTransitionReady() {
		document.dispatchEvent(
			new CustomEvent("swup:transition-ready", {
				detail: { path: window.location.pathname },
			}),
		);
	}

	function scheduleIdlePhase(epoch, done) {
		const schedule =
			window.requestIdleCallback ||
			function (cb) {
				setTimeout(cb, 48);
			};
		schedule(
			function () {
				if (epoch !== transitionEpoch) return;
				runIdleWorkQueue();
				requestAnimationFrame(function () {
					if (epoch !== transitionEpoch) return;
					runIdlePhaseCallbacks();
					requestAnimationFrame(function () {
						if (epoch !== transitionEpoch) return;
						runPioAndBannerResume();
						if (typeof done === "function") {
							done();
						}
					});
				});
			},
			{ timeout: 500 },
		);
	}

	function finishTransitionResume(epoch) {
		settlePageLayoutBeforeResume(epoch, function () {
			if (epoch !== transitionEpoch) return;

			document.documentElement.classList.remove("swup-perf-active");

			const scrollTop = window.__homePreScrollWasUsed
				? 0
				: readDocumentScrollTop();
			runWritePhase(scrollTop);

			requestAnimationFrame(function () {
				if (epoch !== transitionEpoch) return;
				runLayoutPhase(scrollTop);
				scheduleIdlePhase(epoch, function () {
					requestAnimationFrame(dispatchTransitionReady);
				});
			});
		});
	}

	function scheduleTransitionResume() {
		if (resumeTimer !== null) {
			clearTimeout(resumeTimer);
		}

		const epoch = transitionEpoch;
		const isMobile = window.matchMedia("(max-width: 1279px)").matches;
		const hadHomePreScroll = !!window.__homePreScrollWasUsed;
		const baseDelay = isMobile ? getMobileShiftDurationMs() + 80 : 48;
		const delay = hadHomePreScroll ? baseDelay + 80 : baseDelay;

		resumeTimer = setTimeout(function () {
			// 已有新换页开始，放弃这一轮恢复，交由新换页自己的恢复流程处理。
			if (epoch !== transitionEpoch) {
				return;
			}

			if (
				document.documentElement.classList.contains("is-animating") ||
				document.documentElement.classList.contains("is-changing")
			) {
				scheduleTransitionResume();
				return;
			}

			finishTransitionResume(epoch);
		}, delay);
	}

	function pauseTransitionHeavyWork() {
		if (window.__homePreScrollActive) {
			return;
		}

		transitionDepth += 1;
		if (transitionDepth > 1) return;

		// 新一轮换页开始：递增 epoch，使上一轮遗留的恢复回调全部失效。
		transitionEpoch += 1;

		if (resumeTimer !== null) {
			clearTimeout(resumeTimer);
			resumeTimer = null;
		}
		document.documentElement.classList.add("swup-perf-active");
		setPioTransitionHidden(true);
		setPioReducedDuringTransition();
	}

	function resumeTransitionHeavyWork() {
		transitionDepth = Math.max(0, transitionDepth - 1);
		if (transitionDepth > 0) return;
		scheduleTransitionResume();
	}

	function registerSwupPerfListeners() {
		if (perfListenersRegistered || !window.swup?.hooks) return;
		perfListenersRegistered = true;

		window.swup.hooks.on("visit:start", pauseTransitionHeavyWork);
		window.swup.hooks.on("animation:out:start", pauseTransitionHeavyWork);
		window.swup.hooks.on("animation:in:end", resumeTransitionHeavyWork);
		window.swup.hooks.on("visit:end", resumeTransitionHeavyWork);
	}

	function bootstrapSwupPerf() {
		registerSwupPerfListeners();
	}

	window.__swupPerfPause = pauseTransitionHeavyWork;
	window.__swupPerfResume = resumeTransitionHeavyWork;

	window.__onSwupPageWritePhase = function (fn) {
		if (typeof fn === "function") {
			writePhaseCallbacks.push(fn);
		}
	};

	window.__onSwupPageLayoutPhase = function (fn) {
		if (typeof fn === "function") {
			layoutPhaseCallbacks.push(fn);
		}
	};

	window.__onSwupPageIdlePhase = function (fn) {
		if (typeof fn === "function") {
			idlePhaseCallbacks.push(fn);
		}
	};

	window.__scheduleSwupIdleWork = function (fn) {
		if (typeof fn === "function") {
			idleWorkQueue.push(fn);
		}
	};

	window.__deferWallpaperNavbarSync = function () {
		window.__pendingWallpaperSync = true;
	};

	document.dispatchEvent(new CustomEvent("swup:swup-perf-ready"));

	document.addEventListener("swup:enable", registerSwupPerfListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapSwupPerf);
	} else {
		bootstrapSwupPerf();
	}
})();
