import {
	getScrollY,
	getMaxScrollY,
	isDesktopViewport,
	setScrollY,
} from "../animation/scroll";
import type { Visit } from "./types";

export type BlendedDirection = "leaving" | "entering";

/** Below this remaining scroll distance, the layout shift is blended into the scroll tween. */
const MIN_ANIMATED_SCROLL_AFTER_COMP = 180;

function parseCssLengthToPx(value: string): number {
	const raw = (value || "").trim();
	if (!raw) return 0;
	const parsed = Number.parseFloat(raw);
	if (!Number.isFinite(parsed)) return 0;
	if (raw.endsWith("dvh") || raw.endsWith("vh")) {
		return (window.innerHeight * parsed) / 100;
	}
	return parsed;
}

function mainGrid(): HTMLElement | null {
	return document.getElementById("main-grid");
}

function mainPanel(): HTMLElement | null {
	return document.querySelector<HTMLElement>(".absolute.w-full.z-30");
}

function bannerWrapper(): HTMLElement | null {
	return document.getElementById("banner-wrapper");
}

function applyVisitLayout(visit: Visit): void {
	window.__applyVisitBodyLayout?.(visit);
}

/** Desktop home layout pushes banner + grid down by --banner-height-extend. */
export function getExpectedDesktopHomeGridShiftPx(): number {
	if (!isDesktopViewport()) return 0;

	const body = document.body;
	if (
		!body.classList.contains("is-home") &&
		!body.classList.contains("lg:is-home")
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
	if (desktopShift > 1) return desktopShift;

	const panel = mainPanel();
	const body = document.body;
	if (
		!panel ||
		(!body.classList.contains("is-home") &&
			!body.classList.contains("lg:is-home"))
	) {
		return 0;
	}

	const homeTopPx = parseCssLengthToPx(getComputedStyle(panel).top);
	const rootFontSize = Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize || "16",
	);
	const nonHomeTopPx = 6.5 * rootFontSize;
	return Math.max(0, homeTopPx - nonHomeTopPx);
}

export function shouldUseBlendedLayoutShift(
	scrollBefore: number,
	layoutDelta: number,
): boolean {
	if (layoutDelta <= 1) return false;
	const remainingAfterComp = scrollBefore - layoutDelta;
	return (
		remainingAfterComp < MIN_ANIMATED_SCROLL_AFTER_COMP ||
		scrollBefore <= layoutDelta + MIN_ANIMATED_SCROLL_AFTER_COMP
	);
}

export function clearBlendedLayoutInlineStyles(): void {
	const grid = mainGrid();
	const panel = mainPanel();
	const banner = bannerWrapper();

	if (grid) {
		grid.style.removeProperty("transform");
		grid.style.removeProperty("transition");
	}
	if (panel) {
		panel.style.removeProperty("transform");
		panel.style.removeProperty("transition");
	}
	if (banner) {
		banner.style.removeProperty("transform");
		banner.style.removeProperty("transition");
		banner.style.removeProperty("opacity");
	}
}

/**
 * Animate the banner/grid layout shift while the page scrolls.
 *
 * Desktop: the whole home layout is offset by --banner-height-extend, so both
 * the grid and the banner get the same translate. Mobile: the main panel and
 * banner fade/slide independently.
 */
export function applyBlendedShift(
	direction: BlendedDirection,
	t: number,
	gridExtendPx: number,
	layoutDelta: number,
): void {
	const isDesktop = isDesktopViewport();
	const grid = mainGrid();
	const panel = mainPanel();
	const banner = bannerWrapper();
	const leaving = direction === "leaving";

	if (isDesktop && gridExtendPx > 0) {
		const sign = leaving ? 1 : -1;
		const transform = `translateY(${sign * gridExtendPx * (1 - t)}px)`;
		for (const el of [grid, banner]) {
			if (!el) continue;
			el.style.transition = "none";
			el.style.transform = transform;
		}
		return;
	}

	if (panel && layoutDelta > 0) {
		const offset = leaving ? -layoutDelta * t : -layoutDelta * (1 - t);
		panel.style.transition = "none";
		panel.style.transform = `translateY(${offset}px)`;
	}

	if (banner && layoutDelta > 0) {
		const opacity = leaving ? 1 - t : t;
		const translatePercent = leaving ? -100 * t : -100 * (1 - t);
		banner.style.transition = "none";
		banner.style.opacity = String(Math.max(0, Math.min(1, opacity)));
		banner.style.setProperty(
			"transform",
			`translate3d(0, ${translatePercent}%, 0)`,
			leaving ? "" : "important",
		);
	}
}

function layoutShiftAnchor(): HTMLElement | null {
	return (
		document.getElementById("content-wrapper") ||
		document.getElementById("main-grid") ||
		document.getElementById("swup-container")
	);
}

/** Measure the layout delta, apply the new layout, and return the delta. */
function measureLayoutShift(visit: Visit): {
	anchor: HTMLElement | null;
	anchorTopBefore: number;
	anchorTopAfter: number;
	layoutDelta: number;
} {
	const anchor = layoutShiftAnchor();
	const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;

	applyVisitLayout(visit);
	// Force a synchronous layout so the "after" measurement is accurate.
	void document.documentElement.offsetHeight;

	const anchorTopAfter = anchor?.getBoundingClientRect().top ?? 0;
	return {
		anchor,
		anchorTopBefore,
		anchorTopAfter,
		layoutDelta: anchorTopAfter - anchorTopBefore,
	};
}

export function beginLeavingHomeLayoutShift(visit: Visit): number {
	const scrollBefore = getScrollY();
	// Read the home offset before applying the target layout: once the target
	// route removes `is-home`, the CSS variable no longer resolves.
	const expectedDesktopShift = getExpectedDesktopHomeGridShiftPx();
	const { anchor, anchorTopBefore, anchorTopAfter } =
		measureLayoutShift(visit);

	// Leaving home moves the content up, so the delta is positive when the
	// anchor's "before" top sits below its "after" top.
	const measured = anchorTopBefore - anchorTopAfter;
	const layoutDelta =
		measured > 1 ? measured : Math.max(0, expectedDesktopShift);

	if (layoutDelta <= 1) return 0;

	setScrollY(
		Math.min(getMaxScrollY(), Math.max(0, scrollBefore - layoutDelta)),
	);

	// Second pass: content-visibility can change scrollHeight between reads, so
	// correct any residual anchor drift to keep the swap frame visually still.
	if (anchor) {
		const residual = anchor.getBoundingClientRect().top - anchorTopBefore;
		if (Math.abs(residual) > 1) {
			setScrollY(
				Math.min(getMaxScrollY(), Math.max(0, getScrollY() + residual)),
			);
		}
	}

	return layoutDelta;
}

/** Reduced-motion fallback: apply the home layout and compensate scroll. */
export function beginEnteringHomeLayoutShift(visit: Visit): number {
	const scrollBefore = getScrollY();
	const { layoutDelta } = measureLayoutShift(visit);

	if (layoutDelta <= 1) return 0;

	setScrollY(
		Math.min(getMaxScrollY(), Math.max(0, scrollBefore + layoutDelta)),
	);
	return layoutDelta;
}

/** Apply the home layout and measure its delta, priming the blended animation. */
export function measureEnteringHomeLayoutDelta(visit: Visit): number {
	const estimatedDelta = estimateLayoutShiftPx();
	const { layoutDelta: measured } = measureLayoutShift(visit);

	const layoutDelta =
		measured > 1
			? measured
			: estimatedDelta > 1
				? estimatedDelta
				: Math.max(0, measured);

	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();
	if ((isDesktopViewport() && gridExtendPx > 1) || layoutDelta > 1) {
		applyBlendedShift("entering", 0, gridExtendPx, layoutDelta);
	}

	return layoutDelta;
}
