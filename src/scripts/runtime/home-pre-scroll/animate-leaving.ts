import {
	applyBlendedLeavingShift,
	clearBlendedLayoutInlineStyles,
} from "./blended-styles";
import { cancelActivePreScrollTween } from "./cancel-tween";
import { beginLeavingHomeLayoutShift } from "./layout-shift";
import { getExpectedDesktopHomeGridShiftPx } from "./layout-measure";
import { syncNavbarDuringPreScroll } from "./navbar-sync";
import { prefersReducedMotion, setScrollY } from "./scroll";
import { isTargetMainHomePage } from "./visit";
import type { HomePreScrollVisit, PreScrollProgressFn } from "./types";
import {
	isAnimationCancelledError,
	runCancellableTween,
} from "../cancellable-tween";

export { cancelActivePreScrollTween };

export function animateBlendedLeavingHome(
	visit: HomePreScrollVisit,
	scrollBefore: number,
	layoutDelta: number,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
	sourceIsMainHome: boolean,
): Promise<void> {
	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();
	const isDesktop = window.innerWidth >= 1280;
	const ease = easing || window.__easeInOutCubic;

	if (prefersReducedMotion()) {
		beginLeavingHomeLayoutShift(visit);
		setScrollY(0);
		return Promise.resolve();
	}

	window.__smoothScrollActive = true;
	document.documentElement.classList.add("is-smooth-scrolling");

	const { promise } = runCancellableTween({
		duration,
		ease,
		onFrame: function (t, progress) {
			const scrollY = Math.round(scrollBefore * (1 - t));

			setScrollY(scrollY);
			applyBlendedLeavingShift(t, gridExtendPx, layoutDelta, isDesktop);

			if (typeof onProgress === "function") {
				onProgress(progress, scrollY);
			}

			syncNavbarDuringPreScroll(
				visit,
				scrollY,
				sourceIsMainHome,
				true,
			);
		},
		onComplete: function () {
			window.__applyVisitBodyLayout?.(visit);
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
