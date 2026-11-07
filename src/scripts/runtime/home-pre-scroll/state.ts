import { clearBlendedLayoutInlineStyles } from "./layout";
import { isTargetMainHomePage, shouldHandleEnteringHome } from "./route";
import type { Visit } from "./types";

let activeVisitGeneration = 0;

export function bumpPreScrollGeneration(): number {
	activeVisitGeneration += 1;
	return activeVisitGeneration;
}

export function getActivePreScrollGeneration(): number {
	return activeVisitGeneration;
}

function removePreScrollClasses(): void {
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

function applyDeferredVisitLayout(visit: Visit): void {
	if (typeof window.__applyVisitStartLayout === "function") {
		window.__applyVisitStartLayout(visit, { deferBodyLayout: true });
		return;
	}

	document.dispatchEvent(
		new CustomEvent("vedaru:home-pre-scroll-done", {
			detail: { visit },
		}),
	);
}

function pinScrollTopWithFrames(frames = 2): void {
	let remaining = frames;
	const step = () => {
		window.__pinPageScrollTop?.();
		remaining -= 1;
		if (remaining > 0) requestAnimationFrame(step);
	};
	window.__pinPageScrollTop?.();
	requestAnimationFrame(step);
}

export function finishPreScrollTransition(
	visit: Visit,
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

	window.applySemifullNavbarVisualState?.(0, isTargetMainHomePage(visit));

	window.__homePreScrollCompleted = true;
	window.__suppressSemifullNavbarReinit = true;
	applyDeferredVisitLayout(visit);

	window.__homePreScrollActive = false;
	window.__clearNavbarWrapperInlineStyles?.();
	pinScrollTopWithFrames(2);

	const keepLayoutShiftUntilVisitEnd = shouldHandleEnteringHome(visit);

	requestAnimationFrame(() => {
		if (keepLayoutShiftUntilVisitEnd) {
			document.documentElement.classList.remove(
				"is-home-pre-scrolling",
				"is-visit-pre-scrolling",
				"is-smooth-scrolling",
			);
		} else {
			removePreScrollClasses();
		}
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
	removePreScrollClasses();
}
