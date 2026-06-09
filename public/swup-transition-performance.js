/** Swup 换页性能：换页期间暂停 Live2D/轮播，换页后再恢复（不改动画参数） */

(function () {
	if (window.__swupPerfBootstrapped) {
		// updateHead 会再次执行本脚本，切勿在此处 resume
		return;
	}
	window.__swupPerfBootstrapped = true;

	let perfListenersRegistered = false;
	let resumeTimer = null;
	let transitionDepth = 0;

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

		// 不用 paused：l2d 恢复时会 RESET_ANIMATION_DELTA，模型会明显抽一下
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

	function settlePageLayoutBeforeResume(done) {
		window.__pinPageScrollTop?.();
		window.__unlockSwupScroll?.();

		requestAnimationFrame(() => {
			window.__pinPageScrollTop?.();
			requestAnimationFrame(() => {
				window.__pinPageScrollTop?.();
				done();
			});
		});
	}

	function finishTransitionResume() {
		settlePageLayoutBeforeResume(() => {
			document.documentElement.classList.remove("swup-perf-active");

			requestAnimationFrame(() => {
				window.__pinPageScrollTop?.();
				resumePioSoftly();
				window.__bannerDriftResume?.();
				window.__resetHomePreScrollState?.();
				document.dispatchEvent(
					new CustomEvent("swup:transition-ready", {
						detail: { path: window.location.pathname },
					}),
				);
			});
		});
	}

	function scheduleTransitionResume() {
		clearTimeout(resumeTimer);

		const isMobile = window.matchMedia("(max-width: 1279px)").matches;
		const hadHomePreScroll = !!window.__homePreScrollWasUsed;
		const baseDelay = isMobile ? getMobileShiftDurationMs() + 80 : 48;
		const delay = hadHomePreScroll ? baseDelay + 80 : baseDelay;

		resumeTimer = setTimeout(() => {
			if (
				document.documentElement.classList.contains("is-animating") ||
				document.documentElement.classList.contains("is-changing")
			) {
				scheduleTransitionResume();
				return;
			}

			finishTransitionResume();
		}, delay);
	}

	function pauseTransitionHeavyWork() {
		// 首页回顶期间不抢 GPU，等 home-pre-scroll 完成后再 pause
		if (window.__homePreScrollActive) {
			return;
		}

		transitionDepth += 1;
		if (transitionDepth > 1) return;

		clearTimeout(resumeTimer);
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

	document.addEventListener("swup:enable", registerSwupPerfListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapSwupPerf);
	} else {
		bootstrapSwupPerf();
	}
})();
