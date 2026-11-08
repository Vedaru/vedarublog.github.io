/**
 * Fuwari-style page transitions.
 *
 * The whole motion model is:
 *   1. `visit:start` (link click) flips the body's home class, which starts the
 *      700ms banner/grid transform on the compositor.
 *   2. Swup fades `main` out (200ms), swaps it, and smooth-scrolls to the top.
 *   3. The transform is still running through the swap, so the movement reads
 *      as one continuous glide instead of "fade, then slide".
 *   4. After the content fade, optional widgets boot once the transform ends.
 *
 * There is intentionally no layout timer, no transition-ready pub/sub, no
 * per-visit navbar/theme re-sync and no second navigation block. Swup owns the
 * visit; this file only flips classes that CSS already knows how to animate.
 */
import { BANNER_HEIGHT, BANNER_HEIGHT_HOME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	cancelEnhancements,
	scheduleEnhancements,
} from "./page-enhancements";
import "./runtime/comment-boot";

interface Visit {
	to: { url: string };
	history?: { popstate?: boolean };
}

const HTML = document.documentElement;

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

function setHomeLayout(isHome: boolean): void {
	document.body.classList.toggle("is-home", isHome);
	document.body.classList.toggle("lg:is-home", isHome);
	document.getElementById("navbar")?.setAttribute(
		"data-is-home",
		String(isHome),
	);
}

/**
 * Mobile hides the banner on content pages. Do it after the swap: the top
 * offset is a layout property, so flipping it while the outgoing page is
 * still visible would make that page jump.
 */
function setBannerVisibility(isHome: boolean): void {
	// Desktop does not hide the banner on content pages. Skipping the class
	// mutation keeps the composited banner layer untouched during the swap.
	if (window.innerWidth >= 1280) return;

	document
		.getElementById("banner-wrapper")
		?.classList.toggle("mobile-hide-banner", !isHome);
	document
		.querySelector<HTMLElement>(".main-panel")
		?.classList.toggle("mobile-main-no-banner", !isHome);
}

const STICKY_SIDEBAR_IDS = ["sidebar-sticky", "right-sidebar-sticky"];

/**
 * Home and content pages put the sticky columns at different `top` values.
 * Changing that value while the old page is still on screen makes the
 * sidebar jump by the banner offset. Freeze the current computed top for the
 * visit; once the reset has carried the page back to the top the column is
 * unstuck, so releasing it cannot move anything.
 */
function freezeStickySidebarTop(): void {
	for (const id of STICKY_SIDEBAR_IDS) {
		const el = document.getElementById(id);
		if (!el) continue;
		el.style.top = getComputedStyle(el).top;
	}
}

function releaseStickySidebarTop(): void {
	for (const id of STICKY_SIDEBAR_IDS) {
		document.getElementById(id)?.style.removeProperty("top");
	}
}

/**
 * The outgoing grid transform moves the visual bottom of the old content up.
 * When the page is scrolled to that bottom, the browser sees a shorter scroll
 * range and clamps the scroll while the content is still fading. Hold the
 * document at its current height for the fade-out only; it is released at
 * `content:replace`, where any clamp happens while the new container is
 * still invisible.
 */
function freezePageHeight(): void {
	document.body.style.minHeight = `${document.documentElement.scrollHeight}px`;
}

function releasePageHeight(): void {
	document.body.style.removeProperty("min-height");
}

// ── Scroll-driven chrome ───────────────────────────────────────────────────
function getScrollY(): number {
	return (
		window.scrollY ||
		document.documentElement.scrollTop ||
		document.body.scrollTop ||
		0
	);
}

let lastSemifullFade = "";

/**
 * `semi` / `full`: transparent only at the top of the home page.
 * `semifull`: fully transparent at the top, fading to translucent as the
 * first 50px are scrolled. Everywhere else the navbar is the solid card.
 */
function updateNavbarChrome(scrollY: number): void {
	const navbar = document.getElementById("navbar");
	if (!navbar) return;

	const bannerEnabled = document.body.classList.contains("enable-banner");
	const isHome = navbar.getAttribute("data-is-home") === "true";
	const mode = navbar.getAttribute("data-transparent-mode");
	const scrolled = !bannerEnabled || !isHome || scrollY >= 50;

	navbar.classList.toggle("scrolled", scrolled);

	if (mode !== "semifull") {
		if (lastSemifullFade !== "") {
			navbar.style.removeProperty("--semifull-fade");
			lastSemifullFade = "";
		}
		return;
	}

	const fade = String(
		isHome && bannerEnabled ? Math.min(1, scrollY / 50) : 1,
	);
	if (fade === lastSemifullFade) return;
	lastSemifullFade = fade;
	navbar.style.setProperty("--semifull-fade", fade);
}

function updateScrollChrome(): void {
	const scrollY = getScrollY();
	const bannerEnabled = document.body.classList.contains("enable-banner");
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);

	document
		.getElementById("back-to-top-btn")
		?.classList.toggle("hide", scrollY <= bannerHeight);

	updateNavbarChrome(scrollY);

	if (!bannerEnabled) return;

	document
		.getElementById("toc-wrapper")
		?.classList.toggle("toc-hide", scrollY <= bannerHeight);

	const isHome =
		document.body.classList.contains("lg:is-home") &&
		window.innerWidth >= 1024;
	const navbarHeight = isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT;
	const threshold = window.innerHeight * (navbarHeight / 100) - 88;
	document
		.getElementById("navbar-wrapper")
		?.classList.toggle("navbar-hidden", scrollY >= threshold);
}

let scrollScheduled = false;

function onScroll(): void {
	if (scrollScheduled) return;
	scrollScheduled = true;
	requestAnimationFrame(() => {
		scrollScheduled = false;
		releaseStickyAtTop();
		updateScrollChrome();
	});
}

// ── Swup hooks ─────────────────────────────────────────────────────────────
let hooksRegistered = false;
let awaitingScrollReset = false;
let contentReplaced = false;
let scrollFallbackTimer: number | null = null;
let releaseStickyOnTop = false;

/**
 * If the user interrupts the reset (wheel/touch), the scroll ends away from
 * the top. Keep the frozen inline top until they return to the top instead of
 * snapping the sticky column by the banner offset at an arbitrary position.
 */
function releaseStickyAtTop(): void {
	if (!releaseStickyOnTop || window.scrollY > 1) return;
	releaseStickyOnTop = false;
	releaseStickySidebarTop();
}

function finishScrollReset(): void {
	if (!awaitingScrollReset) return;
	awaitingScrollReset = false;
	if (scrollFallbackTimer !== null) {
		window.clearTimeout(scrollFallbackTimer);
		scrollFallbackTimer = null;
	}
	releasePageHeight();
	if (window.scrollY <= 1) releaseStickySidebarTop();
	else releaseStickyOnTop = true;
}

function startScrollFallback(): void {
	if (!awaitingScrollReset || scrollFallbackTimer !== null) return;
	scrollFallbackTimer = window.setTimeout(() => {
		scrollFallbackTimer = null;
		// The plugin normally drives the reset and fires `scroll:end`. If it
		// never does (for example because it failed to mount), release the
		// frozen sidebar without leaving it stuck forever.
		finishScrollReset();
	}, 4000);
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	swup.hooks.on("link:click", () => {
		// Fuwari removes the entrance-animation delay on real navigations.
		HTML.style.setProperty("--content-delay", "0ms");
	});

	swup.hooks.on("visit:start", (visit: Visit) => {
		cancelEnhancements();
		contentReplaced = false;
		if (scrollFallbackTimer !== null) {
			window.clearTimeout(scrollFallbackTimer);
			scrollFallbackTimer = null;
		}
		const isPopstate = visit.history?.popstate === true;
		// History visits restore the browser's own scroll position. There is
		// no reset to wait for and the incoming page is the one we came from,
		// so it is already tall enough for that position.
		const needsScrollReset = !isPopstate && window.scrollY > 1;
		awaitingScrollReset = needsScrollReset;
		if (needsScrollReset) freezePageHeight();
		else releasePageHeight();
		// Drop any inline top left by an interrupted visit, then freeze the
		// current page's top before the body class flips to the new layout.
		releaseStickyOnTop = false;
		releaseStickySidebarTop();
		if (!isPopstate) freezeStickySidebarTop();
		setHomeLayout(isHomeVisit(visit));
		HTML.style.setProperty("--content-delay", "0ms");
		updateScrollChrome();
	});

	swup.hooks.on("content:replace", (visit: Visit) => {
		contentReplaced = true;
		// The outgoing content is at opacity 0 here. Let the browser clamp
		// against the incoming page while it is invisible; the scroll plugin
		// then starts from that natural position.
		releasePageHeight();
		setBannerVisibility(isHomeVisit(visit));
		// The scroll plugin starts the reset after this hook (content:scroll).
		// Start the safety timer here, not at click time: a slow network can
		// otherwise exhaust it before the new page is even in the DOM.
		startScrollFallback();
	});

	swup.hooks.on("animation:in:end", () => {
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", () => {
		// The reset can still be running here. If it has already finished
		// (or was never needed), release the frozen sticky top now. Otherwise
		// `swup:scroll:end` owns the release.
		if (awaitingScrollReset && window.scrollY <= 1) finishScrollReset();
		if (!awaitingScrollReset) {
			if (window.scrollY <= 1) releaseStickySidebarTop();
			else releaseStickyOnTop = true;
			releasePageHeight();
		}
	});

}

// The plugin dispatches `scroll:end` when scrl finishes or is cancelled.
document.addEventListener("swup:scroll:end", () => {
	// Ignore a late event from a previous visit until the new page has been
	// swapped in and the new reset can actually have started.
	if (contentReplaced) finishScrollReset();
});

/** Back-to-top is a plain native smooth scroll, like Fuwari. */
function setupBackToTop(): void {
	window.backToTop = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};
}

/** Page scaling only changes on resize; it is not part of a visit. */
function setupPageScaling(): void {
	const pageScaling = window.__themePageScaling;
	if (!pageScaling?.enable || typeof window.__adjustPageScale !== "function") {
		return;
	}
	window.addEventListener("resize", window.__adjustPageScale, {
		passive: true,
	});
	window.addEventListener("orientationchange", window.__adjustPageScale, {
		passive: true,
	});
}

export function initTransitions(): void {
	setupBackToTop();
	setupPageScaling();

	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener(
		"resize",
		() => {
			updateScrollChrome();
			setBannerVisibility(
				document.body.classList.contains("is-home"),
			);
		},
		{ passive: true },
	);

	updateScrollChrome();
	releaseStickySidebarTop();
	setBannerVisibility(document.body.classList.contains("is-home"));

	if (window.swup?.hooks) {
		setup(window.swup);
	} else {
		document.addEventListener("swup:enable", () => {
			if (window.swup?.hooks) setup(window.swup);
		});
	}
}
