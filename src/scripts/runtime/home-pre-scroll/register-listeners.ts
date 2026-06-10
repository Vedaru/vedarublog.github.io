import { animateBlendedLeavingHome } from "./animate-leaving";
import { runMobileEnteringHomeLayoutTransition } from "./animate-entering";
import {
	addPreScrollClasses,
	clearPreScrollOnVisitEnd,
	finishPreScrollTransition,
	setActivePreScrollVisit,
} from "./dom-state";
import { beginLeavingHomeLayoutShift } from "./layout-shift";
import {
	estimateLayoutShiftPx,
	shouldUseBlendedLayoutShift,
} from "./layout-measure";
import {
	restoreNavbarWrapperStyles,
	snapshotNavbarWrapperStyles,
	syncNavbarDuringPreScroll,
} from "./navbar-sync";
import {
	getLayoutShiftDurationMs,
	getPreScrollDurationMs,
	getScrollY,
} from "./scroll";
import {
	isLeavingHomePage,
	isMainHomePage,
	shouldHandleMobileEnteringHome,
	shouldPreScrollBeforeLeave,
} from "./visit";
import type { HomePreScrollVisit } from "./types";

let listenersRegistered = false;

function handleVisitStart(visit: HomePreScrollVisit): Promise<void> | undefined {
	window.__homePreScrollWasUsed = false;
	window.__homePreScrollCompleted = false;
	window.__suppressSemifullNavbarReinit = false;

	const needsPreScroll = shouldPreScrollBeforeLeave(visit);
	const enteringHome = shouldHandleMobileEnteringHome(visit);

	if (!needsPreScroll && !enteringHome) {
		return;
	}

	const leavingHome = isLeavingHomePage(visit);
	const sourceIsMainHome = isMainHomePage(window.location.pathname);
	const scrollBefore = getScrollY();
	const layoutDelta = estimateLayoutShiftPx();
	const useBlendedShift =
		leavingHome && shouldUseBlendedLayoutShift(scrollBefore, layoutDelta);
	const navbarWrapperSnapshot =
		leavingHome && !useBlendedShift && sourceIsMainHome
			? snapshotNavbarWrapperStyles()
			: null;

	setActivePreScrollVisit(visit);
	addPreScrollClasses(leavingHome, enteringHome);
	window.__homePreScrollWasUsed = true;
	window.__homePreScrollActive = true;

	if (visit.scroll) {
		visit.scroll.reset = false;
	}

	window.__bannerDriftPause?.();

	if (leavingHome && !useBlendedShift) {
		beginLeavingHomeLayoutShift(visit);
		restoreNavbarWrapperStyles(navbarWrapperSnapshot);
	}

	const startScrollY = getScrollY();
	syncNavbarDuringPreScroll(
		visit,
		startScrollY,
		sourceIsMainHome,
		useBlendedShift,
	);

	const duration =
		leavingHome || enteringHome
			? getLayoutShiftDurationMs()
			: getPreScrollDurationMs();
	const easing = window.__easeInOutCubic;
	const onPreScrollProgress = function (_progress: number, scrollY: number) {
		syncNavbarDuringPreScroll(
			visit,
			scrollY,
			sourceIsMainHome,
			useBlendedShift,
		);
	};

	const smoothScrollToY =
		window.__smoothScrollToY ||
		function () {
			window.__pinPageScrollTop?.();
			return Promise.resolve();
		};

	let scrollPromise: Promise<void>;

	if (useBlendedShift) {
		scrollPromise = animateBlendedLeavingHome(
			visit,
			scrollBefore,
			layoutDelta,
			duration,
			easing,
			onPreScrollProgress,
			sourceIsMainHome,
		);
	} else if (enteringHome) {
		scrollPromise = needsPreScroll
			? smoothScrollToY(0, duration, easing, onPreScrollProgress).then(
					function () {
						return runMobileEnteringHomeLayoutTransition(
							visit,
							duration,
							easing,
							onPreScrollProgress,
						);
					},
				)
			: runMobileEnteringHomeLayoutTransition(
					visit,
					duration,
					easing,
					onPreScrollProgress,
				);
	} else {
		scrollPromise = smoothScrollToY(
			0,
			duration,
			easing,
			onPreScrollProgress,
		);
	}

	return scrollPromise.then(function () {
		finishPreScrollTransition(visit);
	});
}

export function registerHomePreScrollListeners(swup: {
	hooks: {
		on: (
			hook: string,
			fn: (visit: HomePreScrollVisit) => unknown,
			options?: { priority?: number; before?: boolean },
		) => void;
	};
}): boolean {
	if (listenersRegistered || !swup?.hooks) {
		return listenersRegistered;
	}
	listenersRegistered = true;

	swup.hooks.on("visit:start", handleVisitStart, { priority: -100 });

	swup.hooks.on(
		"content:scroll",
		function (visit: HomePreScrollVisit) {
			if (!visit?.scroll?.reset) {
				return false;
			}

			if (getScrollY() <= 8) {
				visit.scroll.reset = false;
			}
		},
		{ before: true },
	);

	swup.hooks.on("visit:end", clearPreScrollOnVisitEnd);

	return true;
}
