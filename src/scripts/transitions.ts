/**
 * Fuwari-style page transitions.
 *
 *   1. `visit:start` reads the scroll position, kicks off the scroll-to-top
 *      tween and flips the body's home class in the same tick, so the 700ms
 *      banner/grid transform starts on the click frame — not after the scroll
 *      finishes. Fuwari runs both animations concurrently; serialising them
 *      is what makes the banner look late.
 *   2. The outgoing content fades for the same duration. The incoming
 *      document is prepared while detached (no entrance animations, lazy
 *      images) before Swup swaps it in.
 *   3. `content:replace` happens after the transform. The sidebar TOC is
 *      deferred.
 *   4. The incoming content fades in; the shell and optional enhancements
 *      sync once the content has painted.
 *
 * The scroll tween finishes well inside the 700ms window, so the document is
 * already at the top when Swup replaces the container; no page-height spacer
 * is involved.
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

/**
 * Clear everything a visit may have turned on. Called when the content has
 * painted and again on `visit:end` / `visit:abort`: Swup does not run
 * `visit:end` for an aborted visit (a second click, a failed fetch, an
 * external navigation), so an abort must not leave the TOC hidden or the
 * layout marker on <html>.
 */
function settle(): void {
	stopLayoutMove();
	knownScrollY = null;
	document
		.getElementById("toc-wrapper")
		?.classList.remove("is-toc-deferred");
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

/** Start Fuwari's animated scroll and resolve; the banner slides alongside it. */
function startScrollToTop(): void {
	const swup = window.swup;
	if (typeof swup?.scrollTo === "function") swup.scrollTo(0, true);
	else window.scrollTo(0, 0);
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

		// Read the position before any class changes so this does not force a
		// style/layout pass over the whole document.
		let scrollY = getScrollY();
		if (!isPopstate && layoutSlides && scrollY > 1) {
			// Start the tween in the same tick as the class flip. Fuwari runs
			// the scroll and the banner slide concurrently; waiting for
			// `scroll:end` here is what made the banner start ~1s late.
			startScrollToTop();
			// The tween started above owns the scroll; skip the plugin's
			// redundant post-replace pass, which would restart it.
			if (visit.scroll) visit.scroll.reset = false;
			scrollY = 0;
		}

		// Start the marker and the transform together, after the scroll has
		// settled. The marker has to be present before the body flip so the
		// navbar, enhancements and fade duration see the slide immediately.
		if (!isPopstate && layoutSlides) startLayoutMove();
		else stopLayoutMove();

		if (!isPopstate && layoutSlides) {
			knownScrollY = scrollY;
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
		const scrollNow = knownScrollY ?? getScrollY();
		settle();
		setNavbarHome(isHome);
		updateScrollChrome(scrollNow);
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", settle);

	// Swup aborts a visit when another link is clicked mid-transition; it
	// never fires `visit:end` for that one.
	swup.hooks.on("visit:abort", settle);

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
