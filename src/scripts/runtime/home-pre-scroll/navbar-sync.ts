import { SEMIFULL_SCROLL_THRESHOLD } from "./constants";
import { getScrollY } from "./scroll";
import { isTargetMainHomePage } from "./visit";
import type { HomePreScrollVisit, NavbarWrapperStyleSnapshot } from "./types";

export function snapshotNavbarWrapperStyles(): NavbarWrapperStyleSnapshot | null {
	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper) {
		return null;
	}

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

	if (snapshot.opacity) {
		navbarWrapper.style.opacity = snapshot.opacity;
	} else {
		navbarWrapper.style.removeProperty("opacity");
	}

	if (snapshot.transform) {
		navbarWrapper.style.transform = snapshot.transform;
	} else {
		navbarWrapper.style.removeProperty("transform");
	}
}

function getNavbarSyncOptions(sourceIsMainHome: boolean) {
	if (!sourceIsMainHome) {
		return undefined;
	}
	return { forceHomeBanner: true };
}

export function syncSemifullNavbarDuringPreScroll(
	visit: HomePreScrollVisit,
	scrollY: number,
	sourceIsMainHome: boolean,
	preferSourceHome: boolean,
): void {
	const applyState = window.applySemifullNavbarVisualState;
	if (typeof applyState !== "function") return;

	if (typeof scrollY !== "number") {
		scrollY = getScrollY();
	}

	const targetIsHome = isTargetMainHomePage(visit);

	if (preferSourceHome) {
		if (!targetIsHome && scrollY < SEMIFULL_SCROLL_THRESHOLD) {
			applyState(SEMIFULL_SCROLL_THRESHOLD, sourceIsMainHome);
			return;
		}
		applyState(scrollY, sourceIsMainHome);
		return;
	}

	if (scrollY <= SEMIFULL_SCROLL_THRESHOLD) {
		applyState(scrollY, targetIsHome);
		return;
	}

	applyState(scrollY, sourceIsMainHome);
}

export function syncNavbarDuringPreScroll(
	visit: HomePreScrollVisit,
	scrollY: number,
	sourceIsMainHome: boolean,
	preferSourceHome: boolean,
): void {
	window.__syncNavbarWrapperForScrollY?.(
		scrollY,
		getNavbarSyncOptions(sourceIsMainHome),
	);

	syncSemifullNavbarDuringPreScroll(
		visit,
		scrollY,
		sourceIsMainHome,
		preferSourceHome,
	);
}

export function syncNavbarDuringBlendedEnteringHome(
	visit: HomePreScrollVisit,
	progress: number,
): void {
	const targetIsHome = isTargetMainHomePage(visit);
	window.__syncNavbarWrapperForScrollY?.(0, {
		forceHomeBanner: targetIsHome,
	});

	const applyState = window.applySemifullNavbarVisualState;
	if (typeof applyState !== "function") {
		return;
	}

	if (progress >= 0.85) {
		applyState(0, targetIsHome);
		return;
	}

	applyState(0, false);
}
