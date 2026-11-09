/**
 * Fuwari-style page transitions, sequenced so only one thing moves at a time.
 *
 *   1. `visit:start` flips the body's home class, which starts the single
 *      700ms banner/grid transform while the outgoing page is still visible.
 *   2. Swup fades the old content out. Between-page scroll is not animated,
 *      so the transform is the only motion.
 *   3. `content:replace` swaps the containers and syncs the persistent shell
 *      (navbar, mobile banner). The scroll plugin commits the new position
 *      immediately.
 *   4. Swup fades the new content in while the transform continues.
 *
 * There is no competing scroll tween, no page-height spacer and no layout
 * timer.
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

function setBodyHome(isHome: boolean): void {
	document.body.classList.toggle("is-home", isHome);
	document.body.classList.toggle("lg:is-home", isHome);
}

function setNavbarHome(isHome: boolean): void {
	document.getElementById("navbar")?.setAttribute(
		"data-is-home",
		String(isHome),
	);
}

/**
 * Mobile hides the banner on content pages. Apply it at `content:replace`,
 * when the old DOM is gone and the new content is still invisible.
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
let layoutSlides = false;
let layoutSlideGeneration = 0;

function stopLayoutSlide(): void {
	layoutSlideGeneration++;
	if (!layoutSlides) return;
	layoutSlides = false;
	HTML.classList.remove("is-layout-sliding");
}

/**
 * While the grid is moving between the home and content layouts, take the
 * sticky columns out of sticky positioning so they travel with the grid.
 * Their normal sticky behavior returns when the transform ends.
 */
function startLayoutSlide(wasHome: boolean, isHome: boolean): void {
	stopLayoutSlide();
	if (
		wasHome === isHome ||
		!window.matchMedia("(min-width: 1280px)").matches ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		return;
	}
	const grid = document.getElementById("main-grid");
	if (!grid) return;

	const generation = layoutSlideGeneration;
	HTML.classList.add("is-layout-sliding");
	layoutSlides = true;

	const onTransitionEnd = (event: TransitionEvent) => {
		if (event.target !== grid || event.propertyName !== "transform") return;
		grid.removeEventListener("transitionend", onTransitionEnd);
		if (generation === layoutSlideGeneration) stopLayoutSlide();
	};
	grid.addEventListener("transitionend", onTransitionEnd);
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
		// Start the transform on the outgoing page so it runs continuously
		// through the fade and the content swap, as in Fuwari. The scroll
		// reset is committed separately and does not animate between pages.
		const wasHome = document.body.classList.contains("is-home");
		const isHome = isHomeVisit(visit);
		setBodyHome(isHome);
		startLayoutSlide(wasHome, isHome);
		HTML.style.setProperty("--content-delay", "0ms");
	});

	swup.hooks.on("content:replace", (visit: Visit) => {
		const isHome = isHomeVisit(visit);
		setNavbarHome(isHome);
		setBannerVisibility(isHome);
		updateScrollChrome();
	});

	swup.hooks.on("animation:in:end", () => {
		scheduleEnhancements();
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
