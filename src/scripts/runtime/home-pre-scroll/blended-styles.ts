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
		bannerWrapper.style.transform =
			"translate3d(0, " + -100 * t + "%, 0)";
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
		const transform = "translateY(" + gridExtendPx * t + "px)";

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
