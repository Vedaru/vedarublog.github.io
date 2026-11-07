/** Scroll primitives shared by the animation runtime. */

/** Pre-scroll duration bounds (ms) for article <-> home navigation. */
const PRE_SCROLL_MIN_MS = 580;
const PRE_SCROLL_MAX_MS = 920;
const DEFAULT_MOBILE_SHIFT_MS = 700;

export function getScrollY(): number {
	return (
		window.scrollY ||
		document.documentElement.scrollTop ||
		document.body.scrollTop ||
		0
	);
}

export function setScrollY(y: number): void {
	const top = Math.max(0, Math.round(y));
	const scroller = document.scrollingElement || document.documentElement;
	scroller.scrollTop = top;
}

export function getMaxScrollY(): number {
	return Math.max(
		0,
		document.documentElement.scrollHeight - window.innerHeight,
	);
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isDesktopViewport(): boolean {
	return window.innerWidth >= 1280;
}

export function getPreScrollDurationMs(): number {
	const scrollY = getScrollY();
	return Math.round(
		Math.min(
			PRE_SCROLL_MAX_MS,
			Math.max(PRE_SCROLL_MIN_MS, scrollY * 0.48),
		),
	);
}

export function getLayoutShiftDurationMs(): number {
	if (isDesktopViewport()) {
		return getPreScrollDurationMs();
	}

	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue("--mobile-shift-duration")
		.trim();
	const parsed = Number.parseInt(raw, 10);
	const mobileDuration = Number.isFinite(parsed)
		? parsed
		: DEFAULT_MOBILE_SHIFT_MS;

	return Math.max(getPreScrollDurationMs(), mobileDuration);
}
