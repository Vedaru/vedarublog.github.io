/**
 * Swup wiring. This follows Fuwari's model: flip the layout class at
 * `visit:start`, keep a tall temporary page tail while Swup's scroll plugin
 * animates back to the top, and let the 700ms CSS transforms run on their own
 * clock. No custom scroll writer and no transform/scroll handoff.
 */
import { BANNER_HEIGHT, BANNER_HEIGHT_HOME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	cancelEnhancements,
	scheduleEnhancements,
} from "./page-enhancements";
import { notifyLayoutSettled } from "./runtime/layout-events";
import { setScrollTweening } from "./runtime/motion-state";
import "./runtime/comment-boot";

interface Visit {
	to: { url: string; hash?: string; document?: Document };
}

const HOME_CLASS = "lg:is-home";

/** The committed page, not the transition-time home class state. */
let contentIsHome = document.body.classList.contains(HOME_CLASS);

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

function setBodyHome(isHome: boolean): void {
	document.body.classList.toggle(HOME_CLASS, isHome);
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
		document.body.classList.contains(HOME_CLASS) &&
		window.innerWidth >= 1024;
	const navbarHeight = isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT;
	const threshold = window.innerHeight * (navbarHeight / 100) - 88;
	document
		.getElementById("navbar-wrapper")
		?.classList.toggle("navbar-hidden", scrollY >= threshold);
}

let scrollScheduled = false;

function onScroll(): void {
	// The banner transform owns the visual motion. Recomputing navbar, TOC and
	// back-to-top state on every scroll frame dirties the same root layer under
	// the composited banner; apply the final state once layout settles.
	if (document.documentElement.classList.contains("is-layout-moving")) return;
	if (scrollScheduled) return;
	scrollScheduled = true;
	requestAnimationFrame(() => {
		scrollScheduled = false;
		updateScrollChrome();
	});
}

// ── Swup hooks ─────────────────────────────────────────────────────────────
let hooksRegistered = false;
let activeVisit: Visit | null = null;
let contentDelayCleared = false;
let heightExtendTimer: ReturnType<typeof setTimeout> | undefined;
let finishLayoutCleanup: (() => void) | null = null;
let layoutPromise: Promise<void> | null = null;
let layoutToken = 0;

function setLayoutMoving(moving: boolean): void {
	document.documentElement.classList.toggle("is-layout-moving", moving);
}

function showPageHeightExtend(show: boolean): void {
	clearTimeout(heightExtendTimer);
	const element = document.getElementById("page-height-extend");
	if (!element) return;
	if (show) {
		element.classList.remove("hidden");
		return;
	}
	heightExtendTimer = setTimeout(() => {
		element.classList.add("hidden");
	}, 200);
}

function finishLayoutNow(): void {
	finishLayoutCleanup?.();
	finishLayoutCleanup = null;
	setLayoutMoving(false);
	setNavbarHome(document.body.classList.contains(HOME_CLASS));
	updateScrollChrome(getScrollY());
	showPageHeightExtend(false);
	document
		.getElementById("toc-wrapper")
		?.classList.remove("is-toc-deferred");
	notifyLayoutSettled();
}

function settle(): void {
	if (!document.documentElement.classList.contains("is-layout-moving")) {
		finishLayoutNow();
		return;
	}
	if (finishLayoutCleanup) return;
	const grid = document.getElementById("main-grid");
	if (!grid) {
		finishLayoutNow();
		return;
	}
	const onEnd = (event: TransitionEvent) => {
		if (event.target !== grid || event.propertyName !== "transform") return;
		finishLayoutNow();
	};
	grid.addEventListener("transitionend", onEnd);
	finishLayoutCleanup = () => grid.removeEventListener("transitionend", onEnd);
	if (
		!grid
			.getAnimations()
			.some((animation) => animation.transitionProperty === "transform")
	) {
		finishLayoutNow();
	}
}

function waitForGridTransition(token: number): Promise<void> {
	const grid = document.getElementById("main-grid");
	if (!grid) return Promise.resolve();
	return new Promise((resolve) => {
		const onEnd = (event: TransitionEvent) => {
			if (event.target !== grid || event.propertyName !== "transform") return;
			grid.removeEventListener("transitionend", onEnd);
			resolve();
		};
		grid.addEventListener("transitionend", onEnd);
		if (
			!grid
				.getAnimations()
				.some((animation) => animation.transitionProperty === "transform")
		) {
			grid.removeEventListener("transitionend", onEnd);
			resolve();
		}
		if (token !== layoutToken) {
			grid.removeEventListener("transitionend", onEnd);
			resolve();
		}
	});
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	swup.hooks.on("visit:start", (visit: Visit) => {
		activeVisit = visit;
		cancelEnhancements();
		const wasHome = document.body.classList.contains(HOME_CLASS);
		const isHome = isHomeVisit(visit);
		const layoutSlides =
			wasHome !== isHome &&
			window.matchMedia("(min-width: 1280px)").matches;

		if (layoutSlides) {
			document
				.getElementById("toc-wrapper")
				?.classList.add("is-toc-deferred");
		}

		if (!contentDelayCleared && !layoutSlides) {
			const grid = document.getElementById("main-grid");
			if (grid) {
				grid.style.setProperty("--content-delay", "0ms");
				contentDelayCleared = true;
			}
		}

		setBodyHome(isHome);
		setLayoutMoving(layoutSlides);
		showPageHeightExtend(true);
		if (layoutSlides) {
			layoutToken += 1;
			layoutPromise = waitForGridTransition(layoutToken);
		} else {
			layoutPromise = null;
		}
	}, { priority: 10 });

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
		contentIsHome = isHome;
		setBannerVisibility(contentIsHome);
		if (layoutPromise) {
			layoutPromise = null;
			setLayoutMoving(false);
		}
	});

	swup.hooks.on("animation:in:await", () => layoutPromise ?? undefined);

	swup.hooks.on("animation:in:end", () => {
		settle();
		scheduleEnhancements();
	});

	swup.hooks.on("visit:end", (visit: Visit) => {
		settle();
		if (activeVisit === visit) activeVisit = null;
	});

	// The ScrollPlugin owns the spring. Mirror its lifetime for deferred TOC
	// work, exactly as the previous local spring did.
	swup.hooks.on("scroll:start", () => setScrollTweening(true));
	swup.hooks.on("scroll:end", () => setScrollTweening(false));

	swup.hooks.on("visit:abort", (visit: Visit) => {
		if (activeVisit !== visit) return;
		activeVisit = null;
		layoutToken += 1;
		layoutPromise = null;
		showPageHeightExtend(false);
		setBodyHome(contentIsHome);
		finishLayoutNow();
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
