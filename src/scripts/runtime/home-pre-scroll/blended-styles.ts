export function clearBlendedLayoutInlineStyles(): void {
	const mainGrid = document.getElementById("main-grid");
	const mainPanel = document.querySelector(".absolute.w-full.z-30");
	const bannerWrapper = document.getElementById("banner-wrapper");

	if (mainGrid) {
		mainGrid.style.removeProperty("transform");
		mainGrid.style.removeProperty("transition");
	}
	if (mainPanel instanceof HTMLElement) {
		mainPanel.style.removeProperty("transform");
		mainPanel.style.removeProperty("transition");
	}
	if (bannerWrapper) {
		bannerWrapper.style.removeProperty("transform");
		bannerWrapper.style.removeProperty("transition");
		bannerWrapper.style.removeProperty("opacity");
	}
}

export function applyBlendedLeavingShift(
	t: number,
	gridExtendPx: number,
	layoutDelta: number,
	isDesktop: boolean,
): void {
	const mainGrid = document.getElementById("main-grid");
	const mainPanel = document.querySelector(".absolute.w-full.z-30");
	const bannerWrapper = document.getElementById("banner-wrapper");

	if (isDesktop && gridExtendPx > 0) {
		const transform = "translateY(" + gridExtendPx * (1 - t) + "px)";

		if (mainGrid) {
			mainGrid.style.transition = "none";
			mainGrid.style.transform = transform;
		}
		if (bannerWrapper) {
			bannerWrapper.style.transition = "none";
			bannerWrapper.style.transform = transform;
		}
		return;
	}

	if (mainPanel instanceof HTMLElement && layoutDelta > 0) {
		mainPanel.style.transition = "none";
		mainPanel.style.transform = "translateY(" + -layoutDelta * t + "px)";
	}

	if (bannerWrapper && layoutDelta > 0) {
		bannerWrapper.style.transition = "none";
		bannerWrapper.style.opacity = String(Math.max(0, 1 - t));
		bannerWrapper.style.transform = "translate3d(0, " + -100 * t + "%, 0)";
	}
}

export function applyBlendedEnteringShift(
	t: number,
	layoutDelta: number,
	gridExtendPx = 0,
	isDesktop = window.innerWidth >= 1280,
): void {
	const mainGrid = document.getElementById("main-grid");
	const mainPanel = document.querySelector(".absolute.w-full.z-30");
	const bannerWrapper = document.getElementById("banner-wrapper");

	if (isDesktop && gridExtendPx > 0) {
		// 进入首页：is-home 已把 banner+grid 整体下推 gridExtendPx，
		// 这里需先用 -gridExtendPx 把它补偿回文章位置（t=0），再动画归零（t=1）。
		// 与下方 mainPanel 分支的 -layoutDelta*(1-t) 同构，避免 t=1 残留偏移在
		// 清除内联样式时瞬间 snap 回 0，导致顶部纯色背景上下抽动。
		const transform = "translateY(" + -gridExtendPx * (1 - t) + "px)";

		if (mainGrid) {
			mainGrid.style.transition = "none";
			mainGrid.style.transform = transform;
		}
		if (bannerWrapper) {
			bannerWrapper.style.transition = "none";
			bannerWrapper.style.transform = transform;
		}
		return;
	}

	if (mainPanel instanceof HTMLElement && layoutDelta > 0) {
		mainPanel.style.transition = "none";
		mainPanel.style.transform =
			"translateY(" + -layoutDelta * (1 - t) + "px)";
	}

	if (bannerWrapper && layoutDelta > 0) {
		bannerWrapper.style.transition = "none";
		bannerWrapper.style.opacity = String(Math.max(0, Math.min(1, t)));
		bannerWrapper.style.setProperty(
			"transform",
			"translate3d(0, " + -100 * (1 - t) + "%, 0)",
			"important",
		);
	}
}
