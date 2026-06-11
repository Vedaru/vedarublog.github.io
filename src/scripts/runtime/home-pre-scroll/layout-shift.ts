import { applyBlendedEnteringShift } from "./blended-styles";
import {
	estimateLayoutShiftPx,
	getExpectedDesktopHomeGridShiftPx,
	getLayoutShiftAnchor,
} from "./layout-measure";
import { getScrollY, setScrollY } from "./scroll";
import type { HomePreScrollVisit } from "./types";

export function beginLeavingHomeLayoutShift(visit: HomePreScrollVisit): number {
	const anchor = getLayoutShiftAnchor();
	const scrollBefore = getScrollY();
	const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;
	const expectedDesktopShift = getExpectedDesktopHomeGridShiftPx();

	window.__applyVisitBodyLayout?.(visit);

	void document.documentElement.offsetHeight;

	const anchorTopAfter = anchor?.getBoundingClientRect().top ?? 0;
	let layoutDelta = anchorTopBefore - anchorTopAfter;

	if (layoutDelta <= 1 && expectedDesktopShift > 1) {
		layoutDelta = expectedDesktopShift;
	}

	if (layoutDelta <= 1) {
		return 0;
	}

	const maxScroll = Math.max(
		0,
		document.documentElement.scrollHeight - window.innerHeight,
	);
	setScrollY(Math.min(maxScroll, Math.max(0, scrollBefore - layoutDelta)));

	// 二次校验：补偿后再读 anchor 位置，若与交换前仍有偏差（例如 content-visibility
	// 导致 scrollHeight 估算变化使补偿不准）则微调 scrollTop，保证交换帧视觉零位移。
	if (anchor) {
		void document.documentElement.offsetHeight;
		const anchorTopFinal = anchor.getBoundingClientRect().top;
		const residual = anchorTopFinal - anchorTopBefore;
		if (Math.abs(residual) > 1) {
			const corrected = Math.min(
				maxScroll,
				Math.max(0, getScrollY() + residual),
			);
			setScrollY(corrected);
		}
	}

	return layoutDelta;
}

/** 进入首页：先应用 is-home 布局，再补偿 scroll（仅 reduced-motion 回退路径） */
export function beginEnteringHomeLayoutShift(
	visit: HomePreScrollVisit,
): number {
	const anchor = getLayoutShiftAnchor();
	const scrollBefore = getScrollY();
	const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;

	window.__applyVisitBodyLayout?.(visit);

	void document.documentElement.offsetHeight;

	const anchorTopAfter = anchor?.getBoundingClientRect().top ?? 0;
	const layoutDelta = anchorTopAfter - anchorTopBefore;

	if (layoutDelta <= 1) {
		return 0;
	}

	const maxScroll = Math.max(
		0,
		document.documentElement.scrollHeight - window.innerHeight,
	);
	setScrollY(Math.min(maxScroll, Math.max(0, scrollBefore + layoutDelta)));
	return layoutDelta;
}

/** 进入首页：应用 is-home 布局并测量位移，不做 scroll 补偿（交给 blended 动画） */
export function measureEnteringHomeLayoutDelta(
	visit: HomePreScrollVisit,
): number {
	const anchor = getLayoutShiftAnchor();
	const anchorTopBefore = anchor?.getBoundingClientRect().top ?? 0;
	const estimatedDelta = estimateLayoutShiftPx();

	window.__applyVisitBodyLayout?.(visit);

	void document.documentElement.offsetHeight;

	const anchorTopAfter = anchor?.getBoundingClientRect().top ?? 0;
	const measuredDelta = anchorTopAfter - anchorTopBefore;

	const layoutDelta =
		measuredDelta > 1
			? measuredDelta
			: estimatedDelta > 1
				? estimatedDelta
				: Math.max(0, measuredDelta);

	const gridExtendPx = getExpectedDesktopHomeGridShiftPx();
	const isDesktop = window.innerWidth >= 1280;
	const shouldPrimeEnteringOffset =
		(isDesktop && gridExtendPx > 1) || layoutDelta > 1;

	if (shouldPrimeEnteringOffset) {
		applyBlendedEnteringShift(0, layoutDelta, gridExtendPx, isDesktop);
	}

	return layoutDelta;
}
