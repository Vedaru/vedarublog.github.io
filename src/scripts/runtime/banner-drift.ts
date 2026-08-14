/**
 * Banner / 全屏壁纸微移飘动（CSS @keyframes 驱动）
 *
 * 动画本身由 banner-drift.css 的纯 CSS @keyframes 完成（compositor-only：
 * 运行在合成线程，无 rAF 主线程开销，换页/回顶/平滑滚动时按需冻结）。
 * 本脚本只负责三件事：
 *   1. 换页 / 回顶时通过 .banner-drift-paused 类冻结动画（animation-play-state）
 *   2. banner 滚出视口后暂停合成该层（IntersectionObserver，阅读时零开销）
 *   3. 暴露与旧 rAF 版相同的 window API（__bannerSessionApplyDrift / Pause / Resume）
 */

(function () {
	if (window.__bannerDriftBootstrapped) return;
	window.__bannerDriftBootstrapped = true;

	const PAUSED_CLASS = "banner-drift-paused";
	const OBSERVED_MARK = "data-banner-drift-observed";

	function prefersReducedMotion() {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	function getDriftImages(root?: ParentNode | null) {
		// 仅 banner 模式下的横幅图参与 drift（全屏壁纸位于毛玻璃之下，不宜动画）
		return (root || document).querySelectorAll(
			"#banner-single-container .banner-breathe-wrap img",
		);
	}

	/** 与旧 rAF 版相同的滚动守卫：换页回顶 / 平滑滚动期间保持冻结 */
	function isScrollAnimating() {
		return (
			window.__homePreScrollActive ||
			window.__smoothScrollActive ||
			document.documentElement.classList.contains("is-smooth-scrolling")
		);
	}

	function pauseBannerDrift() {
		getDriftImages().forEach(function (img) {
			img.classList.add(PAUSED_CLASS);
		});
	}

	function resumeBannerDrift() {
		if (prefersReducedMotion() || isScrollAnimating()) return;
		getDriftImages().forEach(function (img) {
			img.classList.remove(PAUSED_CLASS);
		});
	}

	/**
	 * 按图片实际宽度写入 px 幅度（≈0.44% 图宽，与原设计一致）。
	 * px 幅度是 Firefox 将动画留在合成线程的关键（百分比 transform 会退回主线程）。
	 */
	const DRIFT_AMP_RATIO = 0.0044;

	function updateDriftAmplitude(img: HTMLImageElement) {
		const width =
			img.clientWidth || (img.getBoundingClientRect?.().width ?? 0);
		if (width > 0) {
			const amp = Math.round(width * DRIFT_AMP_RATIO * 10) / 10;
			img.style.setProperty("--drift-amp", `${amp}px`);
		}
	}

	function updateAllDriftAmplitudes() {
		getDriftImages().forEach(function (img) {
			updateDriftAmplitude(img as HTMLImageElement);
		});
	}

	let resizeRafId = 0;
	function onViewportResize() {
		if (resizeRafId) return;
		resizeRafId = requestAnimationFrame(function () {
			resizeRafId = 0;
			updateAllDriftAmplitudes();
		});
	}

	function ensureResizeListener() {
		if (window.__bannerDriftResizeBound) return;
		window.__bannerDriftResizeBound = true;
		window.addEventListener("resize", onViewportResize);
	}

	/**
	 * 为单个 drift 图片挂载离屏暂停（IntersectionObserver）。
	 * observe 后浏览器会立即回调一次当前可见性，因此首屏状态无需额外处理。
	 */
	function applyDriftToImage(img: HTMLImageElement) {
		if (prefersReducedMotion() || img.hasAttribute(OBSERVED_MARK)) return;
		if (typeof IntersectionObserver === "undefined") return;
		img.setAttribute(OBSERVED_MARK, "");

		updateDriftAmplitude(img);
		ensureResizeListener();

		const io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					if (!entry.isIntersecting) {
						img.classList.add(PAUSED_CLASS);
						return;
					}
					// 回到视口：尊重滚动守卫，避免与换页/回顶动画叠加
					if (!isScrollAnimating()) {
						img.classList.remove(PAUSED_CLASS);
					}
				});
			},
			{ threshold: 0 },
		);
		io.observe(img);
	}

	function applyBannerDriftVariation(root?: ParentNode | null) {
		getDriftImages(root).forEach(function (img) {
			applyDriftToImage(img as HTMLImageElement);
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
