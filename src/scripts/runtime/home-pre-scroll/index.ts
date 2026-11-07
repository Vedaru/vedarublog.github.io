import { easeInOutCubic } from "../animation/easing";
import {
	getLayoutShiftDurationMs,
	getPreScrollDurationMs,
	getScrollY,
} from "../animation/scroll";
import { isMainHomePage } from "../../../utils/route-utils";
import {
	animateBlendedLeavingHome,
	runEnteringHomeLayoutTransition,
} from "./animate";
import {
	beginLeavingHomeLayoutShift,
	estimateLayoutShiftPx,
	shouldUseBlendedLayoutShift,
} from "./layout";
import {
	restoreNavbarWrapperStyles,
	snapshotNavbarWrapperStyles,
	syncNavbarDuringPreScroll,
} from "./navbar";
import {
	isLeavingHomePage,
	shouldHandleEnteringHome,
	shouldPreScrollBeforeLeave,
	shouldSmoothScrollSamePage,
	shouldSmoothScrollSamePageHref,
} from "./route";
import {
	addPreScrollClasses,
	bumpPreScrollGeneration,
	clearPreScrollOnVisitEnd,
	finishPreScrollTransition,
	getActivePreScrollGeneration,
	resetHomePreScrollState,
} from "./state";
import type { SwupLike, Visit } from "./types";

let listenersRegistered = false;

function runSamePageSmoothScrollToTop(): Promise<void> {
	window.__cancelSmoothScroll?.();
	const duration = getPreScrollDurationMs();
	document.documentElement.classList.add("is-smooth-scrolling");

	const scrollPromise =
		window.__smoothScrollToTop?.(duration, easeInOutCubic) ??
		Promise.resolve();

	return Promise.resolve(scrollPromise).finally(() => {
		document.documentElement.classList.remove("is-smooth-scrolling");
		const navbar = document.getElementById("navbar");
		const isHome = navbar?.getAttribute("data-is-home") === "true";
		window.applySemifullNavbarVisualState?.(0, isHome);
		window.__syncNavbarWrapperForScrollY?.(0);
		window.__syncTocHideForScroll?.(0, window.innerHeight);
	});
}

function handleSamePageNavLinkClick(
	_visit: unknown,
	context?: { el?: Element; event?: Event },
): boolean | void {
	const el = context?.el;
	if (!(el instanceof HTMLAnchorElement)) return;
	if (el.target === "_blank" || el.hasAttribute("download")) return;

	const href = el.getAttribute("href");
	if (!shouldSmoothScrollSamePageHref(href || "")) return;

	context?.event?.preventDefault();
	context?.event?.stopPropagation();
	void runSamePageSmoothScrollToTop();
	return false;
}

interface PreScrollChainOptions {
	useBlendedShift: boolean;
	enteringHome: boolean;
	needsPreScroll: boolean;
	scrollBefore: number;
	layoutDelta: number;
	sourceIsMainHome: boolean;
	duration: number;
	easing: ((t: number) => number) | undefined;
	onPreScrollProgress: (progress: number, scrollY: number) => void;
	smoothScrollToY: (
		targetY: number,
		duration?: number,
		easingFn?: (t: number) => number,
		onProgress?: (progress: number, scrollY: number) => void,
	) => Promise<void>;
}

async function runPreScrollChain(
	visit: Visit,
	generation: number,
	options: PreScrollChainOptions,
): Promise<void> {
	const {
		useBlendedShift,
		enteringHome,
		needsPreScroll,
		scrollBefore,
		layoutDelta,
		sourceIsMainHome,
		duration,
		easing,
		onPreScrollProgress,
		smoothScrollToY,
	} = options;

	if (useBlendedShift) {
		await animateBlendedLeavingHome(
			visit,
			scrollBefore,
			layoutDelta,
			duration,
			easing,
			onPreScrollProgress,
			sourceIsMainHome,
		);
		return;
	}

	if (enteringHome) {
		if (needsPreScroll) {
			await smoothScrollToY(0, duration, easing, onPreScrollProgress);
			if (generation !== getActivePreScrollGeneration()) return;
		}

		await runEnteringHomeLayoutTransition(
			visit,
			duration,
			easing,
			onPreScrollProgress,
		);
		return;
	}

	await smoothScrollToY(0, duration, easing, onPreScrollProgress);
}

function handleVisitStart(visit: Visit): Promise<void> | undefined {
	window.__cancelSmoothScroll?.();

	if (shouldSmoothScrollSamePage(visit)) {
		if (visit.scroll) visit.scroll.reset = false;
		window.__homePreScrollWasUsed = true;
		window.__homePreScrollActive = true;
		return runSamePageSmoothScrollToTop().finally(() => {
			window.__homePreScrollActive = false;
			window.__homePreScrollWasUsed = false;
		});
	}

	const generation = bumpPreScrollGeneration();

	window.__homePreScrollWasUsed = false;
	window.__homePreScrollCompleted = false;
	window.__suppressSemifullNavbarReinit = false;

	const needsPreScroll = shouldPreScrollBeforeLeave(visit);
	const enteringHome = shouldHandleEnteringHome(visit);

	// Desktop article -> home: let Swup's cross-fade handle the transition. The
	// DOM-side blended animation only works while leaving home (the outgoing
	// article has no banner offset to compensate for).
	if (
		window.innerWidth >= 1280 &&
		enteringHome &&
		!isLeavingHomePage(visit)
	) {
		return;
	}

	if (!needsPreScroll && !enteringHome) return;

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

	addPreScrollClasses(leavingHome, enteringHome);
	window.__homePreScrollWasUsed = true;
	window.__homePreScrollActive = true;

	if (visit.scroll) visit.scroll.reset = false;

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
	const easing = easeInOutCubic;
	const onPreScrollProgress = (_progress: number, scrollY: number) => {
		syncNavbarDuringPreScroll(
			visit,
			scrollY,
			sourceIsMainHome,
			useBlendedShift,
		);
	};

	const smoothScrollToY =
		window.__smoothScrollToY ??
		(() => {
			window.__pinPageScrollTop?.();
			return Promise.resolve();
		});

	return runPreScrollChain(visit, generation, {
		useBlendedShift,
		enteringHome,
		needsPreScroll,
		scrollBefore,
		layoutDelta,
		sourceIsMainHome,
		duration,
		easing,
		onPreScrollProgress,
		smoothScrollToY,
	}).then(() => {
		if (generation !== getActivePreScrollGeneration()) return;
		finishPreScrollTransition(visit, generation);
	});
}

export function registerHomePreScrollListeners(swup: SwupLike): boolean {
	if (listenersRegistered || !swup?.hooks) return listenersRegistered;
	listenersRegistered = true;

	swup.hooks.on("link:click", handleSamePageNavLinkClick, {
		before: true,
		priority: -200,
	});

	swup.hooks.on("visit:start", handleVisitStart, { priority: -100 });

	swup.hooks.on(
		"content:scroll",
		(visit: Visit) => {
			if (!visit?.scroll?.reset) return;
			if (getScrollY() <= 8) visit.scroll.reset = false;
		},
		{ before: true },
	);

	swup.hooks.on("visit:end", clearPreScrollOnVisitEnd);

	return true;
}

export function bootstrapHomePreScroll(): void {
	if (window.__homePreScrollBootstrapped) return;
	window.__homePreScrollBootstrapped = true;

	window.__resetHomePreScrollState = resetHomePreScrollState;

	window.onSwupReady?.(registerHomePreScrollListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			window.onSwupReady?.(registerHomePreScrollListeners);
		});
	}
}

bootstrapHomePreScroll();
