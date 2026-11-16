/**
 * Swup wiring. The move engine owns scroll and the two transforms; this file
 * reads once at visit:start, flips the class in the same tick, prepares the
 * detached document, and settles the shell after the swap.
 */
import { BANNER_HEIGHT, BANNER_HEIGHT_HOME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	cancelEnhancements,
	scheduleEnhancements,
} from "./page-enhancements";
import {
	cancelLayoutMove,
	runLayoutMove,
	type LayoutMoveHandle,
} from "./runtime/layout-engine";
import "./runtime/comment-boot";

interface Visit {
	to: { url: string; hash?: string; document?: Document };
	history?: { popstate?: boolean };
	scroll?: { reset?: boolean };
}

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
let layoutMove: LayoutMoveHandle | null = null;
let contentDelayCleared = false;
let pendingScrollTweenMs = 0;

/** Clear all visit state. Aborted visits never receive `visit:end`. */
function settle(): void {
	cancelLayoutMove();
	layoutMove = null;
	knownScrollY = null;
	document
		.getElementById("toc-wrapper")
		?.classList.remove("is-toc-deferred");
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	// Priority 1 runs after the scroll plugin has cached the outgoing position.
	swup.hooks.on("visit:start", async (visit: Visit) => {
		// Read before any class or style writes.
		const scrollAtStart = getScrollY();
		cancelEnhancements();
		const wasHome = document.body.classList.contains("is-home");
		const isHome = isHomeVisit(visit);
		const isPopstate = visit.history?.popstate === true;
		if (isPopstate) cancelLayoutMove();
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

		// Use the position captured at the top of the hook.
		const shouldMove =
			!isPopstate &&
			!visit.to.hash &&
			(layoutSlides || scrollAtStart > 1);
		layoutMove = null;
		if (shouldMove) {
			layoutMove = runLayoutMove({
				startY: scrollAtStart,
				toHome: isHome,
				layout: layoutSlides,
				onFlip: () => setBodyHome(isHome),
			});
			if (visit.scroll) visit.scroll.reset = false;
		}
		// Scope the fade duration to the fade element, not the grid.
		pendingScrollTweenMs = layoutSlides ? 0 : layoutMove?.duration || 0;
		if (pendingScrollTweenMs > 0) {
			document
				.getElementById("swup-container")
				?.style.setProperty(
					"--scroll-tween-duration",
					`${pendingScrollTweenMs}ms`,
				);
		}

		if (!shouldMove) {
			cancelLayoutMove();
			setBodyHome(isHome);
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

	swup.hooks.on("content:replace", (visit: Visit) => {
		const isHome = isHomeVisit(visit);
		// Re-apply the fade duration to the new container; the old one was
		// replaced and the grid-scoped variable is intentionally gone.
		if (pendingScrollTweenMs > 0) {
			document
				.getElementById("swup-container")
				?.style.setProperty(
					"--scroll-tween-duration",
					`${pendingScrollTweenMs}ms`,
				);
		}
		// Mobile banner visibility is a layout property. Commit it together
		// with the content it describes, before the incoming fade starts.
		contentIsHome = isHome;
		setBannerVisibility(contentIsHome);
	});

	swup.hooks.on("animation:in:await", () => {
		if (!layoutMove?.layout) return;
		return layoutMove.finished;
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
	swup.hooks.on("visit:abort", () => {
		cancelLayoutMove();
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
		window.addEventListener(type, cancelLayoutMove, { passive: true });
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
