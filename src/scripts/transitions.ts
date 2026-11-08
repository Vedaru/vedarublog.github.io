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
}

const HTML = document.documentElement;

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

function setHomeLayout(isHome: boolean): void {
	document.body.classList.toggle("is-home", isHome);
	document.body.classList.toggle("lg:is-home", isHome);
}

/**
 * Mobile hides the banner on content pages. Do it after the swap: the top
 * offset is a layout property, so flipping it while the outgoing page is
 * still visible would make that page jump.
 */
function setBannerVisibility(isHome: boolean): void {
	document
		.getElementById("banner-wrapper")
		?.classList.toggle("mobile-hide-banner", !isHome);
	document
		.querySelector<HTMLElement>(".main-panel")
		?.classList.toggle("mobile-main-no-banner", !isHome);
}

function setPageHeightExtend(visible: boolean): void {
	document
		.getElementById("page-height-extend")
		?.classList.toggle("hidden", !visible);
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

function updateScrollChrome(): void {
	const scrollY = getScrollY();
	const bannerEnabled = document.body.classList.contains("enable-banner");
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);

	document
		.getElementById("back-to-top-btn")
		?.classList.toggle("hide", scrollY <= bannerHeight);

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

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	swup.hooks.on("link:click", () => {
		// Fuwari removes the entrance-animation delay on real navigations.
		HTML.style.setProperty("--content-delay", "0ms");
	});

	swup.hooks.on("visit:start", (visit: Visit) => {
		cancelEnhancements();
		setPageHeightExtend(true);
		setHomeLayout(isHomeVisit(visit));
		HTML.style.setProperty("--content-delay", "0ms");
		updateScrollChrome();
	});

	swup.hooks.on("content:replace", (visit: Visit) => {
		setBannerVisibility(isHomeVisit(visit));
	});

	swup.hooks.on("animation:in:end", () => {
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", () => {
		window.setTimeout(() => setPageHeightExtend(false), 200);
	});
}

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
