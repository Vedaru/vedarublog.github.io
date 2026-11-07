import { easeInOutCubic } from "../animation/easing";
import {
	isDesktopViewport,
	prefersReducedMotion,
	setScrollY,
} from "../animation/scroll";
import {
	isAnimationCancelledError,
	runCancellableTween,
} from "../animation/tween";
import {
	applyBlendedShift,
	beginEnteringHomeLayoutShift,
	beginLeavingHomeLayoutShift,
	clearBlendedLayoutInlineStyles,
	getExpectedDesktopHomeGridShiftPx,
	measureEnteringHomeLayoutDelta,
} from "./layout";
import {
	syncNavbarDuringBlendedEnteringHome,
	syncNavbarDuringPreScroll,
} from "./navbar";
import { isTargetMainHomePage } from "./route";
import type { PreScrollProgressFn, Visit } from "./types";

let activeRun = 0;

function finishRun(runId: number): void {
	// A newer run owns the shared visual state now.
	if (runId !== activeRun) return;
	window.__smoothScrollActive = false;
	document.documentElement.classList.remove("is-smooth-scrolling");
}

interface BlendedTweenOptions {
	duration: number;
	easing?: (t: number) => number;
	onFrame: (t: number, progress: number) => void;
	onComplete: () => void;
}

/** Run one blended layout tween, owning the shared smooth-scroll visual state. */
function runBlendedTween(options: BlendedTweenOptions): Promise<void> {
	const runId = ++activeRun;

	window.__smoothScrollActive = true;
	document.documentElement.classList.add("is-smooth-scrolling");

	const { promise } = runCancellableTween({
		duration: options.duration,
		ease: options.easing ?? easeInOutCubic,
		onFrame: (t, progress) => options.onFrame(t, progress),
		onComplete: () => {
			options.onComplete();
			finishRun(runId);
		},
	});

	return promise.catch((err: unknown) => {
		if (isAnimationCancelledError(err)) {
			finishRun(runId);
			return;
		}
		throw err;
	});
}

export function animateBlendedLeavingHome(
	visit: Visit,
	scrollBefore: number,
	layoutDelta: number,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
	sourceIsMainHome: boolean,
): Promise<void> {
	if (prefersReducedMotion()) {
		beginLeavingHomeLayoutShift(visit);
		setScrollY(0);
		return Promise.resolve();
	}

	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();

	return runBlendedTween({
		duration,
		easing,
		onFrame: (t, progress) => {
			const scrollY = Math.round(scrollBefore * (1 - t));

			setScrollY(scrollY);
			applyBlendedShift("leaving", t, gridExtendPx, layoutDelta);
			onProgress?.(progress, scrollY);
			syncNavbarDuringPreScroll(visit, scrollY, sourceIsMainHome, true);
		},
		onComplete: () => {
			window.__applyVisitBodyLayout?.(visit);
			clearBlendedLayoutInlineStyles();
			setScrollY(0);
			window.applySemifullNavbarVisualState?.(
				0,
				isTargetMainHomePage(visit),
			);
		},
	});
}

export function runEnteringHomeLayoutTransition(
	visit: Visit,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
): Promise<void> {
	if (prefersReducedMotion()) {
		beginEnteringHomeLayoutShift(visit);
		setScrollY(0);
		return Promise.resolve();
	}

	// Desktop: the animation would run on the outgoing article DOM, which has no
	// banner offset to compensate. Swup's cross-fade plus the post-navigation
	// layout applies cleanly, so skip the DOM-side animation.
	if (isDesktopViewport()) {
		clearBlendedLayoutInlineStyles();
		setScrollY(0);
		return Promise.resolve();
	}

	const layoutDelta = measureEnteringHomeLayoutDelta(visit);
	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();

	if (layoutDelta <= 1) {
		setScrollY(0);
		return Promise.resolve();
	}

	setScrollY(0);

	return runBlendedTween({
		duration,
		easing,
		onFrame: (t, progress) => {
			setScrollY(0);
			applyBlendedShift("entering", t, gridExtendPx, layoutDelta);
			onProgress?.(progress, 0);
			syncNavbarDuringBlendedEnteringHome(visit, progress);
		},
		onComplete: () => {
			clearBlendedLayoutInlineStyles();
			setScrollY(0);
			window.applySemifullNavbarVisualState?.(
				0,
				isTargetMainHomePage(visit),
			);
		},
	});
}
