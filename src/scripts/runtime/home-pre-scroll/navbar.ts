import { getScrollY } from "../animation/scroll";
import { isTargetMainHomePage } from "./route";
import type { NavbarWrapperStyleSnapshot, Visit } from "./types";

/** Scroll offset below which the navbar keeps its home/banner appearance. */
const SEMIFULL_SCROLL_THRESHOLD = 50;

export function snapshotNavbarWrapperStyles(): NavbarWrapperStyleSnapshot | null {
	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper) return null;

	return {
		opacity: navbarWrapper.style.opacity,
		transform: navbarWrapper.style.transform,
	};
}

export function restoreNavbarWrapperStyles(
	snapshot: NavbarWrapperStyleSnapshot | null,
): void {
	if (!snapshot) return;

	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper) return;

	setInlineProperty(navbarWrapper, "opacity", snapshot.opacity);
	setInlineProperty(navbarWrapper, "transform", snapshot.transform);
}

function setInlineProperty(
	element: HTMLElement,
	property: "opacity" | "transform",
	value: string,
): void {
	if (value) {
		element.style[property] = value;
	} else {
		element.style.removeProperty(property);
	}
}

function applySemifullState(scrollY: number, isHome: boolean): void {
	window.applySemifullNavbarVisualState?.(scrollY, isHome);
}

function syncSemifullNavbar(
	visit: Visit,
	scrollY: number,
	sourceIsMainHome: boolean,
	preferSourceHome: boolean,
): void {
	const targetIsHome = isTargetMainHomePage(visit);

	if (preferSourceHome) {
		// During a blended leave, the old page is still on screen. Keep the
		// source navbar state until the target's home layout takes over.
		const effectiveY =
			!targetIsHome && scrollY < SEMIFULL_SCROLL_THRESHOLD
				? SEMIFULL_SCROLL_THRESHOLD
				: scrollY;
		applySemifullState(effectiveY, sourceIsMainHome);
		return;
	}

	applySemifullState(
		scrollY,
		scrollY <= SEMIFULL_SCROLL_THRESHOLD ? targetIsHome : sourceIsMainHome,
	);
}

export function syncNavbarDuringPreScroll(
	visit: Visit,
	scrollY: number,
	sourceIsMainHome: boolean,
	preferSourceHome: boolean,
): void {
	const y = typeof scrollY === "number" ? scrollY : getScrollY();

	window.__syncNavbarWrapperForScrollY?.(
		y,
		sourceIsMainHome ? { forceHomeBanner: true } : undefined,
	);
	syncSemifullNavbar(visit, y, sourceIsMainHome, preferSourceHome);
}

export function syncNavbarDuringBlendedEnteringHome(
	visit: Visit,
	progress: number,
): void {
	const targetIsHome = isTargetMainHomePage(visit);

	window.__syncNavbarWrapperForScrollY?.(0, {
		forceHomeBanner: targetIsHome,
	});

	// Hand the navbar back to the home appearance for the last stretch of the
	// entering animation.
	applySemifullState(0, progress >= 0.85 ? targetIsHome : false);
}
