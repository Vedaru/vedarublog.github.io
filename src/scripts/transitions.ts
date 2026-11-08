/**
 * Fuwari-style page transitions, sequenced so only one thing moves at a time.
 *
 *   1. `visit:start` only starts the fade-out. The outgoing page keeps its
 *      layout and scroll position.
 *   2. `content:replace` swaps the containers. The scroll plugin commits the
 *      new scroll position immediately: between-page scroll is not animated.
 *   3. `scroll:end` applies the target layout. Flipping the body's home class
 *      here starts the single 700ms banner/grid transform, with the page
 *      already at its final scroll position.
 *   4. Swup fades the new content in while that transform runs.
 *
 * There is no competing scroll tween, no page-height spacer and no layout
 * timer. The only ordering primitive is the plugin's `scroll:end`.
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
 * Mobile hides the banner on content pages. Apply it with the rest of the
 * target layout after the scroll commit, while the incoming content is still
 * invisible.
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
		updateScrollChrome();
	});
}

// ── Swup hooks ─────────────────────────────────────────────────────────────
let hooksRegistered = false;
let pendingLayout: boolean | null = null;
let popstateVisit = false;

function applyLayout(isHome: boolean): void {
	setHomeLayout(isHome);
	setBannerVisibility(isHome);
	updateScrollChrome();
}

/**
 * Apply the incoming page's layout after its scroll position has been
 * committed. The body-class flip starts the banner/grid transform; there is
 * no scroll animation running at the same time.
 */
function commitPendingLayout(): void {
	if (pendingLayout === null) return;
	const isHome = pendingLayout;
	pendingLayout = null;
	applyLayout(isHome);
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
		popstateVisit = visit.history?.popstate === true;
		// Keep the outgoing layout until the new content is in and the scroll
		// plugin has committed the target scroll position. `scroll:end` then
		// applies the layout and starts the one transform.
		pendingLayout = isHomeVisit(visit);
		HTML.style.setProperty("--content-delay", "0ms");
		updateScrollChrome();
	});

	swup.hooks.on("content:replace", () => {
		// History visits have no between-page scroll commit (the browser
		// restores the position itself), so apply their layout immediately.
		if (popstateVisit) commitPendingLayout();
	});

	swup.hooks.on("animation:in:start", commitPendingLayout);

	swup.hooks.on("animation:in:end", () => {
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", commitPendingLayout);

}

// The plugin dispatches `scroll:end` after committing the between-page
// position. With `animateScroll.betweenPages = false` this is the same frame
// as the swap, before the new content fades in.
document.addEventListener("swup:scroll:end", commitPendingLayout);

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
	setBannerVisibility(document.body.classList.contains("is-home"));

	if (window.swup?.hooks) {
		setup(window.swup);
	} else {
		document.addEventListener("swup:enable", () => {
			if (window.swup?.hooks) setup(window.swup);
		});
	}
}
