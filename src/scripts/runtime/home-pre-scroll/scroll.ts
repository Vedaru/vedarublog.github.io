import { PRE_SCROLL_MAX_MS, PRE_SCROLL_MIN_MS } from "./constants";

export function getScrollY(): number {
	return window.__getScrollY?.() ?? 0;
}

export function setScrollY(y: number): void {
	const top = Math.max(0, Math.round(y));
	document.documentElement.scrollTop = top;
	if (document.body) {
		document.body.scrollTop = top;
	}
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
	if (!window.matchMedia("(max-width: 1279px)").matches) {
		return getPreScrollDurationMs();
	}

	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue("--mobile-shift-duration")
		.trim();
	const parsed = Number.parseInt(raw, 10);
	const mobileDuration = Number.isFinite(parsed) ? parsed : 700;
	return Math.max(getPreScrollDurationMs(), mobileDuration);
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
