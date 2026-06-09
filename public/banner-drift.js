/** Banner / 全屏壁纸：匀速圆周 drift（rAF，换页/回顶期间 pause） */

(function () {
	if (window.__bannerDriftBootstrapped) return;
	window.__bannerDriftBootstrapped = true;

	const DRIFT_MARK = "data-banner-drift-ready";
	const DRIFT_DURATION_MS = 18000;
	const DRIFT_AMPLITUDE = 0.44;
	const DRIFT_OMEGA = (Math.PI * 2) / DRIFT_DURATION_MS;

	function prefersReducedMotion() {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	function randomBetween(min, max) {
		return min + Math.random() * (max - min);
	}

	function getDriftImages(root) {
		return (root || document).querySelectorAll(".banner-breathe-wrap img");
	}

	function createDriftState() {
		return {
			phase: randomBetween(0, Math.PI * 2),
			direction: Math.random() < 0.5 ? 1 : -1,
			startMs: null,
			elapsedMs: 0,
			rafId: 0,
			paused: false,
		};
	}

	function applyDriftTransform(img, state, nowMs) {
		if (state.startMs == null) {
			state.startMs = nowMs;
		}

		if (!state.paused) {
			state.elapsedMs = nowMs - state.startMs;
		}

		const angle =
			state.direction * DRIFT_OMEGA * state.elapsedMs + state.phase;
		const x = (Math.cos(angle) * DRIFT_AMPLITUDE).toFixed(4);
		const y = (Math.sin(angle) * DRIFT_AMPLITUDE).toFixed(4);
		img.style.transform = `translate3d(${x}%, ${y}%, 0)`;
	}

	function tick(img, state, nowMs) {
		if (state.paused || !img.isConnected) return;

		applyDriftTransform(img, state, nowMs);
		state.rafId = requestAnimationFrame(function (nextNow) {
			tick(img, state, nextNow);
		});
	}

	function startDriftLoop(img) {
		const state = img.__driftState || createDriftState();
		state.paused = false;
		img.__driftState = state;

		if (state.rafId) {
			cancelAnimationFrame(state.rafId);
		}

		state.rafId = requestAnimationFrame(function (nowMs) {
			tick(img, state, nowMs);
		});
	}

	function startDriftOnImage(img) {
		if (prefersReducedMotion() || img.hasAttribute(DRIFT_MARK)) return;

		img.setAttribute(DRIFT_MARK, "");
		img.__driftState = createDriftState();
		startDriftLoop(img);
	}

	function applyBannerDriftVariation(root) {
		getDriftImages(root).forEach(startDriftOnImage);
	}

	function pauseBannerDrift() {
		getDriftImages().forEach(function (img) {
			const state = img.__driftState;
			if (!state || state.paused) return;

			state.paused = true;
			if (state.rafId) {
				cancelAnimationFrame(state.rafId);
				state.rafId = 0;
			}
			if (state.startMs != null) {
				state.elapsedMs = performance.now() - state.startMs;
			}
		});
	}

	function resumeBannerDrift() {
		if (prefersReducedMotion()) return;

		getDriftImages().forEach(function (img) {
			if (!img.__driftState) {
				startDriftOnImage(img);
				return;
			}

			const state = img.__driftState;
			state.paused = false;
			state.startMs = performance.now() - state.elapsedMs;
			startDriftLoop(img);
		});
	}

	window.__bannerSessionApplyDrift = applyBannerDriftVariation;
	window.__bannerDriftPause = pauseBannerDrift;
	window.__bannerDriftResume = resumeBannerDrift;

	let swupGuardRegistered = false;

	function registerSwupDriftGuard() {
		if (swupGuardRegistered || !window.swup?.hooks) return false;
		swupGuardRegistered = true;

		window.swup.hooks.on(
			"visit:start",
			function () {
				pauseBannerDrift();
			},
			{ priority: 110 },
		);

		document.addEventListener("swup:transition-ready", function () {
			resumeBannerDrift();
		});

		return true;
	}

	function bootstrapSwupDriftGuard() {
		if (registerSwupDriftGuard()) return;
		document.addEventListener("swup:enable", registerSwupDriftGuard, {
			once: true,
		});
	}

	bootstrapSwupDriftGuard();
})();
