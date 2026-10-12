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

	// 桌面进入首页：该动画运行在“尚未换页的文章页 DOM”上，而 is-home 布局并不会给
	// 文章页网格加出 banner 占位，导致 translate 补偿没有对应的布局位移可抵消，出现
	// “网格瞬移贴 navbar 再滑下”或顶部纯色背景上下抽动等突兀效果。故桌面不在离场 DOM
	// 上做错位动画：清理任何预置 transform、归零滚动，交由 swup 交叉淡入与换页后的
	// 正常布局应用完成进入首页（与普通 article→article 导航一致，视觉更干净）。
	if (isDesktop) {
		clearBlendedLayoutInlineStyles();
		setScrollY(0);
		return Promise.resolve();
	}

	const layoutDelta = measureEnteringHomeLayoutDelta(visit);
	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();
	const shouldAnimate = layoutDelta > 1;

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
