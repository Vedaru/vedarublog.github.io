/**
 * Swup wiring. CSS owns the layout transforms and the existing scroll spring
 * owns the outgoing scroll offset. The root keeps that offset reachable until
 * the transform transition finishes.
 */
import { BANNER_HEIGHT, BANNER_HEIGHT_HOME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	cancelEnhancements,
	scheduleEnhancements,
} from "./page-enhancements";
import {
	cancelScrollToTop,
	startScrollToTop,
} from "./runtime/layout-engine";
import { notifyLayoutSettled } from "./runtime/layout-events";
import "./runtime/comment-boot";

interface Visit {
	to: { url: string; hash?: string; document?: Document };
	history?: { popstate?: boolean };
	scroll?: { reset?: boolean; animate?: boolean };
}

type HistoryScrollPlugin = {
	getCachedScrollPositions(url: string): { window?: { top?: number } } | undefined;
};

/** The committed page, not the transition-time `body.is-home` state. */
let contentIsHome = document.body.classList.contains("is-home");

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
	// Cached viewport value; never fall back to a layout-reading scrollTop.
	return window.scrollY;
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
let layoutPromise: Promise<void> | null = null;
let activeVisit: Visit | null = null;
let layoutToken = 0;
let contentDelayCleared = false;

function setLayoutMoving(moving: boolean): void {
	document.documentElement.classList.toggle("is-layout-moving", moving);
}

function setLayoutScrollDelta(scrollY: number): void {
	document.documentElement.style.setProperty(
		"--layout-scroll-delta",
		`${scrollY}px`,
	);
}

function clearLayoutScrollDelta(): void {
	setLayoutScrollDelta(0);
}

/**
 * The layout transition and native scroll have both reached their destination.
 * Remove the temporary scroll range and make the final scroll position exact.
 */
function commitLayoutMove(): void {
	clearLayoutScrollDelta();
	window.scrollTo(0, 0);
}

/** Clear all visit state. Aborted visits never receive `visit:end`. */
function settle(): void {
	cancelScrollToTop();
	layoutPromise = null;
	layoutToken += 1;
	knownScrollY = null;
	setLayoutMoving(false);
	document
		.getElementById("toc-wrapper")
		?.classList.remove("is-toc-deferred");
	notifyLayoutSettled();
}

function waitForGridTransition(token: number): Promise<void> {
	const grid = document.getElementById("main-grid");
	if (!grid) return Promise.resolve();
	return new Promise((resolve) => {
		const onEnd = (event: TransitionEvent) => {
			if (event.target !== grid || event.propertyName !== "transform") return;
			grid.removeEventListener("transitionend", onEnd);
			if (token === layoutToken) commitLayoutMove();
			resolve();
		};
		grid.addEventListener("transitionend", onEnd);
	});
}

function restoreHistoryScroll(swup: NonNullable<Window["swup"]>, visit: Visit): void {
	if (!visit.history?.popstate || visit.to.hash) return;
	const plugin = (swup.plugins as unknown as Array<{ name: string }> | undefined)?.find(
		(candidate) => candidate.name === "SwupScrollPlugin",
	) as HistoryScrollPlugin | undefined;
	const top = plugin?.getCachedScrollPositions(visit.to.url)?.window?.top;
	if (typeof top === "number") swup.scrollTo(top, false);
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	// Priority 1 runs after the scroll plugin has cached the outgoing position.
	swup.hooks.on("visit:start", async (visit: Visit) => {
		activeVisit = visit;
		// Read before any class or style writes.
		const scrollAtStart = getScrollY();
		cancelEnhancements();
		const wasHome = document.body.classList.contains("is-home");
		const isHome = isHomeVisit(visit);
		const isPopstate = visit.history?.popstate === true;
		// Forward visits must stop any previous scroll spring before starting
		// this visit's motion. History visits leave scroll restoration to Swup.
		if (!isPopstate) cancelScrollToTop();
		const layoutSlides =
			wasHome !== isHome &&
			window.matchMedia("(min-width: 1280px)").matches;

		// A layout slide swaps while the grid is still moving; keep the TOC
		// deferred so it does not reflow mid-slide.
		if (layoutSlides) {
			document
				.getElementById("toc-wrapper")
				?.classList.add("is-toc-deferred");
		}

		// Remove the entrance stagger once; the grid survives the swap.
		if (!contentDelayCleared && !layoutSlides) {
			const grid = document.getElementById("main-grid");
			if (grid) {
				grid.style.setProperty("--content-delay", "0ms");
				contentDelayCleared = true;
			}
		}

		const nativeScrollLayout = layoutSlides && !isPopstate;
		if (isPopstate) {
			// History visits must let Swup's scroll plugin restore the
			// destination entry. Forward layout visits opt out below. The
			// restore itself is immediate; animating it would keep moving the
			// page after the history offset has been restored.
			if (visit.scroll) {
				visit.scroll.reset = true;
				visit.scroll.animate = false;
			}
			layoutToken += 1;
			cancelScrollToTop();
			clearLayoutScrollDelta();
			setLayoutMoving(false);
		}
		if (nativeScrollLayout) setLayoutScrollDelta(scrollAtStart);
		setBodyHome(isHome);

		if (nativeScrollLayout) {
			// Match Fuwari's independent scroll and layout ownership. The
			// existing cancellable spring owns scroll while CSS owns transforms.
			if (scrollAtStart > 1) startScrollToTop(scrollAtStart);
			if (visit.scroll) visit.scroll.reset = false;
		} else if (!isPopstate && !visit.to.hash && scrollAtStart > 1) {
			startScrollToTop(scrollAtStart);
			if (visit.scroll) visit.scroll.reset = false;
		}
		setLayoutMoving(nativeScrollLayout);
		if (nativeScrollLayout) {
			layoutToken += 1;
			layoutPromise = waitForGridTransition(layoutToken);
		} else {
			layoutPromise = null;
		}

		knownScrollY = layoutSlides ? 0 : null;
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

	swup.hooks.on("content:scroll", (visit: Visit) => {
		restoreHistoryScroll(swup, visit);
	});

	swup.hooks.on("content:replace", (visit: Visit) => {
		const isHome = isHomeVisit(visit);
		// Mobile banner visibility is a layout property. Commit it together
		// with the content it describes, before the incoming fade starts.
		contentIsHome = isHome;
		setBannerVisibility(contentIsHome);
	});

	swup.hooks.on("animation:in:await", () => {
		if (!layoutPromise) return;
		return layoutPromise;
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

	swup.hooks.on("visit:end", (visit: Visit) => {
		settle();
		if (activeVisit === visit) activeVisit = null;
	});

	// Swup aborts a visit when another link is clicked mid-transition; it
	// never fires `visit:end` for that one.
	swup.hooks.on("visit:abort", (visit: Visit) => {
		if (activeVisit !== visit) return;
		activeVisit = null;
		cancelScrollToTop();
		clearLayoutScrollDelta();
		setBodyHome(contentIsHome);
		settle();
	});

}

/**
 * In-page anchors (the TOC) jump instead of animating.
 *
 * `@swup/astro` runs Swup's scroll plugin with `animateScroll`, which walks the
 * page frame by frame. Every content-visibility code block it passes has to be
 * rendered on the way, so a 2300px jump took 1.6s with two stalls of 330ms and
 * 480ms. A single scrollIntoView lands in one frame and keeps scroll-margin-top.
 */
function setupAnchorJumps(): void {
	document.addEventListener(
		"click",
		(event) => {
			if (event.defaultPrevented || event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
			if (!anchor) return;
			const hash = anchor.getAttribute("href");
			if (!hash || hash === "#") return;
			const id = decodeURIComponent(hash.slice(1));
			const target = id ? document.getElementById(id) : null;
			if (!target) return;

			event.preventDefault();
			event.stopPropagation();
			const offset =
				Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
			const top = Math.round(
				window.scrollY + target.getBoundingClientRect().top - offset,
			);
			window.scrollTo({ top, behavior: "auto" });
			history.pushState(history.state, "", hash);
		},
		true,
	);
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
	setupAnchorJumps();
	setupBackToTop();
	setupPageScaling();

	// 用户自己滚动时立刻让出控制权，不和浏览器抢滚动条。
	for (const type of ["wheel", "touchstart", "keydown"] as const) {
		window.addEventListener(type, cancelScrollToTop, { passive: true });
	}

	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener(
		"resize",
		() => {
			updateScrollChrome();
			// A resize can change the viewport category (>= 1280 or not), so
			// re-sync the mobile class from the committed content. Using
			// `body.is-home` here would apply the next page's layout as soon as
			// the visit starts, moving `.main-panel` mid-fade.
			setBannerVisibility(contentIsHome);
		},
		{ passive: true },
	);

	updateScrollChrome();
	setBannerVisibility(contentIsHome);

	if (window.swup?.hooks) {
		setup(window.swup);
	} else {
		document.addEventListener("swup:enable", () => {
			if (window.swup?.hooks) setup(window.swup);
		});
	}
}
