import { PRE_SCROLL_Y_THRESHOLD } from "./constants";
import { getScrollY } from "./scroll";
import type { HomePreScrollVisit } from "./types";

function pathFromVisitUrl(url: string | undefined): string {
	return window.__pathFromUrl?.(url) ?? url ?? "";
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

export function shouldHandleMobileEnteringHome(
	visit: HomePreScrollVisit,
): boolean {
	return isMobileLayoutShiftViewport() && isEnteringHomePage(visit);
}

export function shouldPreScrollBeforeLeave(
	visit: HomePreScrollVisit,
): boolean {
	const targetUrl = visit?.to?.url || "";
	if (!targetUrl) return false;
	if (isSamePageNavigation(window.location.pathname, targetUrl)) {
		return false;
	}

	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}
