import {
	isHomePagePath,
	isMainHomePage,
	isSamePageNavigation,
	pathFromUrl,
} from "../../../utils/route-utils";
import { getScrollY } from "../animation/scroll";
import type { Visit } from "./types";

/** Only scroll back to the top if the page is actually scrolled. */
const PRE_SCROLL_Y_THRESHOLD = 80;

function targetPath(visit: Visit): string {
	return pathFromUrl(visit?.to?.url || "");
}

export function isTargetMainHomePage(visit: Visit): boolean {
	const path = targetPath(visit);
	return path !== "" && isMainHomePage(path);
}

export function isLeavingHomePage(visit: Visit): boolean {
	const target = targetPath(visit);
	if (!target) return false;

	const from = window.location.pathname;
	return (
		(isMainHomePage(from) && !isMainHomePage(target)) ||
		(isHomePagePath(from) && !isHomePagePath(target))
	);
}

export function shouldHandleEnteringHome(visit: Visit): boolean {
	const target = targetPath(visit);
	if (!target) return false;

	const from = window.location.pathname;
	return (
		(!isMainHomePage(from) && isMainHomePage(target)) ||
		(!isHomePagePath(from) && isHomePagePath(target))
	);
}

/** Clicking a nav link to the current page should smooth-scroll instead of reloading. */
export function shouldSmoothScrollSamePage(visit: Visit): boolean {
	const target = visit?.to?.url || "";
	if (!target) return false;
	if (!isSamePageNavigation(window.location.href, target)) return false;
	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}

export function shouldSmoothScrollSamePageHref(href: string): boolean {
	if (!href || href.startsWith("#")) return false;
	if (!isSamePageNavigation(window.location.href, href)) return false;
	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}

export function shouldPreScrollBeforeLeave(visit: Visit): boolean {
	const target = visit?.to?.url || "";
	if (!target) return false;
	if (isSamePageNavigation(window.location.href, target)) return false;

	// Article -> article navigation (prev/next links) can happen thousands of
	// pixels down a long post. Animating that scroll would OOM the compositor,
	// so only home-related navigation opts into the pre-scroll choreography.
	if (!isLeavingHomePage(visit) && !shouldHandleEnteringHome(visit)) {
		return false;
	}

	return getScrollY() > PRE_SCROLL_Y_THRESHOLD;
}
