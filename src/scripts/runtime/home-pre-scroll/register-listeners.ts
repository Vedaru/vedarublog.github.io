import { animateBlendedLeavingHome } from "./animate-leaving";
import { runEnteringHomeLayoutTransition } from "./animate-entering";
import { cancelActivePreScrollTween } from "./cancel-tween";
import {
	addPreScrollClasses,
	bumpPreScrollGeneration,
	clearPreScrollOnVisitEnd,
	finishPreScrollTransition,
	getActivePreScrollGeneration,
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
	shouldHandleEnteringHome,
	shouldPreScrollBeforeLeave,
	shouldSmoothScrollSamePage,
	shouldSmoothScrollSamePageHref,
} from "./visit";
import type { HomePreScrollVisit } from "./types";

let listenersRegistered = false;

function runSamePageSmoothScrollToTop(): Promise<void> {
	window.__cancelSmoothScroll?.();
	const duration = getPreScrollDurationMs();
	const easing = window.__easeInOutCubic;
	document.documentElement.classList.add("is-smooth-scrolling");

	const scrollPromise =
		window.__smoothScrollToTop?.(duration, easing) ?? Promise.resolve();

	return Promise.resolve(scrollPromise).finally(function () {
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
	if (!(el instanceof HTMLAnchorElement)) {
		return;
	}
	if (el.target === "_blank" || el.hasAttribute("download")) {
		return;
	}

	const href = el.getAttribute("href");
	if (!shouldSmoothScrollSamePageHref(href || "")) {
		return;
	}

	context?.event?.preventDefault();
	context?.event?.stopPropagation();
	void runSamePageSmoothScrollToTop();
	return false;
}

async function runPreScrollChain(
	visit: HomePreScrollVisit,
	generation: number,
	options: {
		useBlendedShift: boolean;
		enteringHome: boolean;
		needsPreScroll: boolean;
		leavingHome: boolean;
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
	},
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
			if (generation !== getActivePreScrollGeneration()) {
				return;
			}
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

function handleVisitStart(
	visit: HomePreScrollVisit,
): Promise<void> | undefined {
	cancelActivePreScrollTween();
	window.__cancelSmoothScroll?.();

	if (shouldSmoothScrollSamePage(visit)) {
		if (visit.scroll) {
			visit.scroll.reset = false;
		}
		window.__homePreScrollWasUsed = true;
		window.__homePreScrollActive = true;
		return runSamePageSmoothScrollToTop().finally(function () {
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

	// 桌面“纯进入首页”(article→home，且非离开首页)：不启用预滚动机制，
	// 交给 Swup 默认换页动画(交叉淡入 + 卡片入场)。预滚动机制会加抑制类并锁滚动，
	// 把动画整个关掉；其“混合进入”动画又只能跑在离场的文章 DOM 上、布局不成立，
	// 必然出现瞬移 / 顶部纯色背景抽动。普通导航路径稳定且有动画——
	// 此时 __homePreScrollWasUsed 保持 false，swup-lifecycle 的 visit:start(优先级 0，
	// 先于本钩子的 -100)已应用首页 banner/is-home 布局，Swup 会正常播放换页动画。
	if (
		window.innerWidth >= 1280 &&
		enteringHome &&
		!isLeavingHomePage(visit)
	) {
		return;
	}

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

	return runPreScrollChain(visit, generation, {
		useBlendedShift,
		enteringHome,
		needsPreScroll,
		leavingHome,
		scrollBefore,
		layoutDelta,
		sourceIsMainHome,
		duration,
		easing,
		onPreScrollProgress,
		smoothScrollToY,
	}).then(function () {
		if (generation !== getActivePreScrollGeneration()) {
			return;
		}
		finishPreScrollTransition(visit, generation);
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

	swup.hooks.on("link:click", handleSamePageNavLinkClick, {
		before: true,
		priority: -200,
	});

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
