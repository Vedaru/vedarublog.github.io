import { clearBlendedLayoutInlineStyles } from "./blended-styles";
import { isTargetMainHomePage, shouldHandleEnteringHome } from "./visit";
import type { HomePreScrollVisit } from "./types";

let activePreScrollVisit: HomePreScrollVisit | null = null;
let activeVisitGeneration = 0;

export function getActivePreScrollVisit(): HomePreScrollVisit | null {
	return activePreScrollVisit;
}

export function bumpPreScrollGeneration(): number {
	activeVisitGeneration += 1;
	return activeVisitGeneration;
}

export function getActivePreScrollGeneration(): number {
	return activeVisitGeneration;
}

export function setActivePreScrollVisit(
	visit: HomePreScrollVisit | null,
): void {
	activePreScrollVisit = visit;
}

export function removePreScrollClasses(): void {
	clearBlendedLayoutInlineStyles();
	document.documentElement.classList.remove(
		"is-home-pre-scrolling",
		"is-visit-pre-scrolling",
		"is-visit-layout-shifting",
		"is-smooth-scrolling",
	);
}

export function addPreScrollClasses(
	leavingHome: boolean,
	enteringHome: boolean,
): void {
	document.documentElement.classList.add(
		"is-home-pre-scrolling",
		"is-visit-pre-scrolling",
	);
	if (leavingHome || enteringHome) {
		document.documentElement.classList.add("is-visit-layout-shifting");
	}
}

function applyDeferredVisitLayout(visit: HomePreScrollVisit): void {
	if (typeof window.__applyVisitStartLayout === "function") {
		window.__applyVisitStartLayout(visit, { deferBodyLayout: true });
		return;
	}

	document.dispatchEvent(
		new CustomEvent("vedaru:home-pre-scroll-done", {
			detail: { visit: visit },
		}),
	);
}

export function finishPreScrollTransition(
	visit: HomePreScrollVisit,
	generation?: number,
): void {
	if (
		typeof generation === "number" &&
		generation !== activeVisitGeneration
	) {
		return;
	}
	window.__lockSwupScroll?.();
	window.__pinPageScrollTop?.();

	const targetIsHome = isTargetMainHomePage(visit);
	window.applySemifullNavbarVisualState?.(0, targetIsHome);

	window.__homePreScrollCompleted = true;
	window.__suppressSemifullNavbarReinit = true;
	applyDeferredVisitLayout(visit);

	window.__homePreScrollActive = false;
	window.__clearNavbarWrapperInlineStyles?.();
	window.__pinScrollTopWithFrames?.(2);

	const keepLayoutShiftUntilVisitEnd = shouldHandleEnteringHome(visit);

	requestAnimationFrame(function () {
		if (keepLayoutShiftUntilVisitEnd) {
			document.documentElement.classList.remove(
				"is-home-pre-scrolling",
				"is-visit-pre-scrolling",
				"is-smooth-scrolling",
			);
		} else {
			removePreScrollClasses();
		}
		activePreScrollVisit = null;
	});
}

export function resetHomePreScrollState(): void {
	window.__homePreScrollCompleted = false;
	window.__homePreScrollWasUsed = false;
	window.__suppressSemifullNavbarReinit = false;
}

export function clearPreScrollOnVisitEnd(): void {
	window.__homePreScrollCompleted = false;
	window.__homePreScrollActive = false;
	activePreScrollVisit = null;
	removePreScrollClasses();
}
