import { PRE_SCROLL_Y_THRESHOLD } from "./constants";
import { getScrollY } from "./scroll";
import type { HomePreScrollVisit } from "./types";

function pathFromVisitUrl(url: string | undefined): string {
	return window.__pathFromUrl?.(url || "") || url || "";
}

export function isMainHomePage(pathname: string): boolean {
	return window.__isMainHomePage?.(pathname) ?? false;
}

function isHomePagePath(pathname: string): boolean {
	return window.__isHomePagePath?.(pathname) ?? false;
}

function isSamePageNavigation(fromPathname: string, toUrl: string): boolean {
	const toPathname = pathFromVisitUrl(toUrl);
	if (fromPathname === toPathname) {
		return true;
	}
	return window.__pathsEqual?.(fromPathname, toUrl) ?? false;
}

/** 已在当前页时再次点击同页导航：应平滑回顶，而非 Swup 瞬移 */
export function shouldSmoothScrollSamePage(visit: HomePreScrollVisit): boolean {
	const targetUrl = visit?.to?.url || "";
	if (!targetUrl) return false;
	if (!isSamePageNavigation(window.location.pathname, targetUrl)) {
		return false;
	}

	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}

export function shouldSmoothScrollSamePageHref(href: string): boolean {
	if (!href || href.startsWith("#")) return false;
	if (!isSamePageNavigation(window.location.pathname, href)) {
		return false;
	}

	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}

/** @deprecated 使用 shouldSmoothScrollSamePage */
export const shouldSmoothScrollSamePageMainHome = shouldSmoothScrollSamePage;

/** @deprecated 使用 shouldSmoothScrollSamePageHref */
export const shouldSmoothScrollSamePageMainHomeHref =
	shouldSmoothScrollSamePageHref;

export function isTargetMainHomePage(visit: HomePreScrollVisit): boolean {
	const targetUrl = visit?.to?.url || "";
	if (!targetUrl) return false;
	return isMainHomePage(pathFromVisitUrl(targetUrl));
}

export function isLeavingHomePage(visit: HomePreScrollVisit): boolean {
	const fromPath = window.location.pathname;
	const targetPath = pathFromVisitUrl(visit?.to?.url || "");
	if (!targetPath) return false;

	if (isMainHomePage(fromPath) && !isMainHomePage(targetPath)) {
		return true;
	}

	if (isHomePagePath(fromPath) && !isHomePagePath(targetPath)) {
		return true;
	}

	return false;
}

export function isEnteringHomePage(visit: HomePreScrollVisit): boolean {
	const fromPath = window.location.pathname;
	const targetPath = pathFromVisitUrl(visit?.to?.url || "");
	if (!targetPath) return false;

	if (!isMainHomePage(fromPath) && isMainHomePage(targetPath)) {
		return true;
	}

	if (!isHomePagePath(fromPath) && isHomePagePath(targetPath)) {
		return true;
	}

	return false;
}

export function isMobileLayoutShiftViewport(): boolean {
	return window.matchMedia("(max-width: 1279px)").matches;
}

export function shouldHandleEnteringHome(visit: HomePreScrollVisit): boolean {
	return isEnteringHomePage(visit);
}

/** @deprecated 使用 shouldHandleEnteringHome */
export function shouldHandleMobileEnteringHome(
	visit: HomePreScrollVisit,
): boolean {
	return shouldHandleEnteringHome(visit);
}

export function shouldPreScrollBeforeLeave(visit: HomePreScrollVisit): boolean {
	const targetUrl = visit?.to?.url || "";
	if (!targetUrl) return false;
	if (isSamePageNavigation(window.location.pathname, targetUrl)) {
		return false;
	}

	// 仅在首页相关导航时触发预滚动动画。
	// 文章页间导航（如上一篇/下一篇）在长文章底部触发时，
	// 全程渲染数千像素的滚动动画会导致浏览器 OOM，
	// 直接让 Swup 自行重置滚动位置即可。
	if (!isLeavingHomePage(visit) && !isEnteringHomePage(visit)) {
		return false;
	}

	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}
