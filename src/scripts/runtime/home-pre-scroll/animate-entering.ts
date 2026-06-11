import {
	applyBlendedEnteringShift,
	clearBlendedLayoutInlineStyles,
} from "./blended-styles";
import { cancelActivePreScrollTween } from "./cancel-tween";
import { getExpectedDesktopHomeGridShiftPx } from "./layout-measure";
import {
	beginEnteringHomeLayoutShift,
	measureEnteringHomeLayoutDelta,
} from "./layout-shift";
import { syncNavbarDuringBlendedEnteringHome } from "./navbar-sync";
import { prefersReducedMotion, setScrollY } from "./scroll";
import { isTargetMainHomePage } from "./visit";
import type { HomePreScrollVisit, PreScrollProgressFn } from "./types";
import {
	isAnimationCancelledError,
	runCancellableTween,
} from "../cancellable-tween";

export { cancelActivePreScrollTween };

export function animateBlendedEnteringHome(
	visit: HomePreScrollVisit,
	layoutDelta: number,
	gridExtendPx: number,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
): Promise<void> {
	const ease = easing || window.__easeInOutCubic;
	const isDesktop = window.innerWidth >= 1280;

	window.__smoothScrollActive = true;
	document.documentElement.classList.add("is-smooth-scrolling");
	setScrollY(0);
	applyBlendedEnteringShift(0, layoutDelta, gridExtendPx, isDesktop);

	const { promise } = runCancellableTween({
		duration,
		ease,
		onFrame: function (t, progress) {
			setScrollY(0);
			applyBlendedEnteringShift(t, layoutDelta, gridExtendPx, isDesktop);

			if (typeof onProgress === "function") {
				onProgress(progress, 0);
			}

			syncNavbarDuringBlendedEnteringHome(visit, progress);
		},
		onComplete: function () {
			clearBlendedLayoutInlineStyles();
			setScrollY(0);
			window.applySemifullNavbarVisualState?.(
				0,
				isTargetMainHomePage(visit),
			);
			document.documentElement.classList.remove("is-smooth-scrolling");
			window.__smoothScrollActive = false;
		},
	});

	return promise.catch(function (err) {
		if (isAnimationCancelledError(err)) {
			window.__smoothScrollActive = false;
			return;
		}
		throw err;
	});
}

export function runEnteringHomeLayoutTransition(
	visit: HomePreScrollVisit,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
): Promise<void> {
	if (prefersReducedMotion()) {
		beginEnteringHomeLayoutShift(visit);
		setScrollY(0);
		return Promise.resolve();
	}

	const isDesktop = window.innerWidth >= 1280;
	const layoutDelta = measureEnteringHomeLayoutDelta(visit);
	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();
	const shouldAnimate = isDesktop ? gridExtendPx > 1 : layoutDelta > 1;

	if (!shouldAnimate) {
		setScrollY(0);
		return Promise.resolve();
	}

	return animateBlendedEnteringHome(
		visit,
		layoutDelta,
		gridExtendPx,
		duration,
		easing,
		onProgress,
	);
}

/** @deprecated 使用 runEnteringHomeLayoutTransition */
export const runMobileEnteringHomeLayoutTransition =
	runEnteringHomeLayoutTransition;
