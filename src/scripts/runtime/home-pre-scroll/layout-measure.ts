import { MIN_ANIMATED_SCROLL_AFTER_COMP } from "./constants";

export function parseCssLengthToPx(value: string): number {
	const raw = (value || "").trim();
	if (!raw) return 0;
	if (raw.endsWith("dvh")) {
		return (window.innerHeight * parseFloat(raw)) / 100;
	}
	if (raw.endsWith("vh")) {
		return (window.innerHeight * parseFloat(raw)) / 100;
	}
	if (raw.endsWith("px")) {
		return parseFloat(raw);
	}
	const parsed = parseFloat(raw);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function getLayoutShiftAnchor(): HTMLElement | null {
	return (
		document.getElementById("content-wrapper") ||
		document.getElementById("main-grid") ||
		document.getElementById("swup-container")
	);
}

export function getExpectedDesktopHomeGridShiftPx(): number {
	if (window.innerWidth < 1280) {
		return 0;
	}
	if (
		!document.body.classList.contains("is-home") &&
		!document.body.classList.contains("lg:is-home")
	) {
		return 0;
	}

	const extend = getComputedStyle(document.documentElement).getPropertyValue(
		"--banner-height-extend",
	);
	return parseCssLengthToPx(extend);
}

export function estimateLayoutShiftPx(): number {
	const desktopShift = getExpectedDesktopHomeGridShiftPx();
	if (desktopShift > 1) {
		return desktopShift;
	}

	const panel = document.querySelector(".absolute.w-full.z-30");
	if (
		!panel ||
		(!document.body.classList.contains("is-home") &&
			!document.body.classList.contains("lg:is-home"))
	) {
		return 0;
	}

	const homeTopPx = parseCssLengthToPx(getComputedStyle(panel).top);
	const rootFontSize = parseFloat(
		getComputedStyle(document.documentElement).fontSize || "16",
	);
	const nonHomeTopPx = 6.5 * rootFontSize;
	return Math.max(0, homeTopPx - nonHomeTopPx);
}

export function shouldUseBlendedLayoutShift(
	scrollBefore: number,
	layoutDelta: number,
): boolean {
	if (layoutDelta <= 1) {
		return false;
	}
	const remainingAfterComp = scrollBefore - layoutDelta;
	return (
		remainingAfterComp < MIN_ANIMATED_SCROLL_AFTER_COMP ||
		scrollBefore <= layoutDelta + MIN_ANIMATED_SCROLL_AFTER_COMP
	);
}
