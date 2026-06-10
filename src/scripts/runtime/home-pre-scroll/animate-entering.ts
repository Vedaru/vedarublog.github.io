import {
	applyBlendedEnteringShift,
	clearBlendedLayoutInlineStyles,
} from "./blended-styles";
import {
	beginEnteringHomeLayoutShift,
	measureEnteringHomeLayoutDelta,
} from "./layout-shift";
import { syncNavbarDuringBlendedEnteringHome } from "./navbar-sync";
import { prefersReducedMotion, setScrollY } from "./scroll";
import { isTargetMainHomePage } from "./visit";
import type { HomePreScrollVisit, PreScrollProgressFn } from "./types";

export function animateBlendedEnteringHome(
	visit: HomePreScrollVisit,
	layoutDelta: number,
	duration: number,
	easing: ((t: number) => number) | undefined,
	onProgress: PreScrollProgressFn | undefined,
): Promise<void> {
	const ease = easing || window.__easeInOutCubic;

	window.__smoothScrollActive = true;
	document.documentElement.classList.add("is-smooth-scrolling");
	setScrollY(0);
	applyBlendedEnteringShift(0, layoutDelta);

	return new Promise<void>(function (resolve) {
		const startTime = performance.now();

		function step(now: number) {
			const progress = Math.min(1, (now - startTime) / duration);
			const t = ease!(progress);

			setScrollY(0);
			applyBlendedEnteringShift(t, layoutDelta);

			if (typeof onProgress === "function") {
				onProgress(progress, 0);
			}

			syncNavbarDuringBlendedEnteringHome(visit, progress);

			if (progress < 1) {
				requestAnimationFrame(step);
				return;
			}

			clearBlendedLayoutInlineStyles();
			setScrollY(0);
			window.applySemifullNavbarVisualState?.(
				0,
				isTargetMainHomePage(visit),
			);
			document.documentElement.classList.remove("is-smooth-scrolling");
			window.__smoothScrollActive = false;
			resolve();
		}

		requestAnimationFrame(step);
	});
}

export function runMobileEnteringHomeLayoutTransition(
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

	const layoutDelta = measureEnteringHomeLayoutDelta(visit);
	if (layoutDelta <= 1) {
		window.__applyVisitBodyLayout?.(visit);
		setScrollY(0);
		return Promise.resolve();
	}

	return animateBlendedEnteringHome(
		visit,
		layoutDelta,
		duration,
		easing,
		onProgress,
	);
}
