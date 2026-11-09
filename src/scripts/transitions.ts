/**
 * Fuwari-style page transitions.
 *
 *   1. `visit:start` reads the scroll position, finishes any pre-scroll and
 *      flips the body's home class, starting the 700ms banner/grid transform.
 *   2. The outgoing content fades for the same duration. The incoming
 *      document is prepared while detached (no entrance animations, lazy
 *      images) before Swup swaps it in.
 *   3. `content:replace` happens after the transform. The main column gets
 *      paint containment for the swap, and the sidebar TOC is deferred.
 *   4. The incoming content fades in; the shell, TOC and optional
 *      enhancements sync once the content has painted.
 *
 * There is no page-height spacer and no JavaScript scroll loop.
 */
import { BANNER_HEIGHT, BANNER_HEIGHT_HOME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	cancelEnhancements,
	scheduleEnhancements,
} from "./page-enhancements";
import "./runtime/comment-boot";

interface Visit {
	to: { url: string; hash?: string; document?: Document };
	history?: { popstate?: boolean };
	scroll?: { reset?: boolean };
}

const HTML = document.documentElement;

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

function setBodyHome(isHome: boolean): void {
	document.body.classList.toggle("is-home", isHome);
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

function updateScrollChrome(scrollY = getScrollY()): void {
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
		document.body.classList.contains("is-home") &&
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
let knownScrollY: number | null = null;
let layoutMovePromise: Promise<void> | null = null;
let contentDelayCleared = false;

const LAYOUT_FALLBACK_MS = 900;

function stopLayoutMove(): void {
	layoutMovePromise = null;
	HTML.classList.remove("is-layout-moving");
}

function startLayoutMove(): void {
	stopLayoutMove();
	HTML.classList.add("is-layout-moving");
	const grid = document.getElementById("main-grid");
	if (!grid) return;

	layoutMovePromise = new Promise<void>((resolve) => {
		const onEnd = (event: TransitionEvent) => {
			if (event.target !== grid || event.propertyName !== "transform") {
				return;
			}
			grid.removeEventListener("transitionend", onEnd);
			window.clearTimeout(timer);
			resolve();
		};
		const timer = window.setTimeout(() => {
			grid.removeEventListener("transitionend", onEnd);
			resolve();
		}, LAYOUT_FALLBACK_MS);
		grid.addEventListener("transitionend", onEnd);
	});
}

/**
 * Finish Fuwari's animated scroll before any layout class changes. Resolving
 * on the plugin's `scroll:end` means the outgoing document is still present
 * and at its real height for the whole scroll. No timer or second scroll
 * loop is involved.
 */
function scrollToTopAndWait(): Promise<void> {
	const swup = window.swup;
	if (typeof swup?.scrollTo !== "function" || window.scrollY <= 1) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		document.addEventListener("swup:scroll:end", () => resolve(), {
			once: true,
		});
		swup.scrollTo(0, true);
	});
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	// The scroll plugin's own visit:start handler has priority 1 and caches
	// the outgoing position first. Run after it, then finish the scroll before
	// flipping the layout and starting the transform.
	swup.hooks.on("visit:start", async (visit: Visit) => {
		cancelEnhancements();
		// The TOC is secondary during a swap; keep its layout out of the
		// content-replacement task.
		document
			.getElementById("toc-wrapper")
			?.classList.add("is-toc-deferred");
		const wasHome = document.body.classList.contains("is-home");
		const isHome = isHomeVisit(visit);
		const isPopstate = visit.history?.popstate === true;
		const layoutSlides =
			wasHome !== isHome &&
			window.matchMedia("(min-width: 1280px)").matches;

		// Remove the entrance-animation stagger for subsequent pages once.
		// The grid survives the swap; writing to <html> would invalidate the
		// whole document on the click path.
		if (!contentDelayCleared) {
			const grid = document.getElementById("main-grid");
			if (grid) {
				grid.style.setProperty("--content-delay", "0ms");
				contentDelayCleared = true;
			}
		}

		// Scroll first, while the outgoing page is still in the DOM at its
		// real height. Read the position before any class changes so this
		// does not force a style/layout pass over the whole document.
		let scrollY = getScrollY();
		if (!isPopstate && layoutSlides && scrollY > 1) {
			await scrollToTopAndWait();
			scrollY = 0;
		}

		// Start the marker and the transform together, after the scroll has
		// settled. The marker has to be present before the body flip so the
		// navbar, enhancements and fade duration see the slide immediately.
		if (!isPopstate && layoutSlides) startLayoutMove();
		else stopLayoutMove();

		if (!isPopstate && layoutSlides) {
			// Paint containment helps the incoming content swap, but it
			// changes how the transformed grid is layered. The outgoing
			// container is replaced by Swup, so disabling it here is enough;
			// the incoming container gets the default back.
			document
				.getElementById("swup-container")
				?.style.setProperty("contain", "none");
			knownScrollY = scrollY;
			if (scrollY <= 1 && !visit.to.hash && visit.scroll) {
				// The pre-scroll already reset the position. Skip the
				// plugin's redundant content-scroll pass, which otherwise
				// forces layout of the new article.
				visit.scroll.reset = false;
			}
		}
		if (!layoutSlides || isPopstate) knownScrollY = null;

		setBodyHome(isHome);
	}, { priority: 10 });

	// Prepare the incoming document while it is still detached. The page
	// transition already provides the entrance, and images must not start
	// fetching or decoding while Swup is swapping the container.
	swup.hooks.before("content:replace", (visit: Visit) => {
		const incoming = visit.to.document;
		if (!incoming) return;

		incoming
			.querySelectorAll("#swup-container .onload-animation")
			.forEach((element) => element.classList.remove("onload-animation"));

		incoming.querySelectorAll("#swup-container img").forEach((image) => {
			if (!image.hasAttribute("loading")) {
				image.setAttribute("loading", "lazy");
			}
			if (!image.hasAttribute("decoding")) {
				image.setAttribute("decoding", "async");
			}
		});
	});

	swup.hooks.on("content:replace", (visit: Visit) => {
		const isHome = isHomeVisit(visit);
		// Mobile banner visibility is a layout property. Apply it before the
		// incoming fade starts, after the outgoing slide has finished.
		setBannerVisibility(isHome);
	});

	swup.hooks.on("animation:in:await", () => {
		if (!layoutMovePromise) return;
		return layoutMovePromise;
	});

	swup.hooks.on("animation:in:end", (visit: Visit) => {
		const isHome = isHomeVisit(visit);
		// The incoming content is painted now. Sync the shell in one pass,
		// outside the container replacement.
		setNavbarHome(isHome);
		updateScrollChrome(knownScrollY ?? getScrollY());
		knownScrollY = null;
		stopLayoutMove();
		document
			.getElementById("toc-wrapper")
			?.classList.remove("is-toc-deferred");
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", () => {
		stopLayoutMove();
		document
			.getElementById("toc-wrapper")
			?.classList.remove("is-toc-deferred");
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
