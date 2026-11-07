/**
 * Shell-level scroll/layout helpers.
 *
 * These live in the critical bundle and expose only the functions that the
 * separately bundled scripts (swup-lifecycle, navbar-scroll, widgets) need on
 * `window`. Everything used only inside the critical bundle is imported
 * directly from its module instead of going through a global.
 */
import { isMainHomePage, pathFromUrl } from "../../utils/route-utils";
import { getScrollY } from "./animation/scroll";

const BANNER_HEIGHT = 35;
const NAVBAR_BANNER_HEIGHT = 35;
const NAVBAR_BANNER_HEIGHT_HOME = 65;

interface Visit {
	to: { url: string };
}

// ── Scroll position ────────────────────────────────────────────────────────
// Re-assert the current scroll position after a layout write. Used by the
// pre-scroll flow, which writes transforms and then needs the scroll offset to
// stay pinned to where it already was.
window.__pinPageScrollTop =
	window.__pinPageScrollTop ||
	function pinPageScrollTop() {
		window.scrollTo(0, getScrollY());
	};

// ── Navbar wrapper fade ───────────────────────────────────────────────────
interface NavbarSyncOptions {
	forceHomeBanner?: boolean;
}

let lastNavbarFadeKey = "";

function getNavbarHideThreshold(options?: NavbarSyncOptions): number {
	if (!document.body.classList.contains("enable-banner")) {
		return Number.POSITIVE_INFINITY;
	}

	const isHome =
		typeof options?.forceHomeBanner === "boolean"
			? options.forceHomeBanner
			: document.body.classList.contains("lg:is-home") &&
				(window.__cachedInnerWidth ?? window.innerWidth) >= 1024;

	const bannerHeight = isHome
		? NAVBAR_BANNER_HEIGHT_HOME
		: NAVBAR_BANNER_HEIGHT;

	return window.innerHeight * (bannerHeight / 100) - 88;
}

function computeNavbarWrapperFade(scrollY: number, threshold: number) {
	const fadeRange = Math.max(120, threshold * 0.2);
	if (scrollY <= threshold) {
		return { opacity: 1, translateRem: 0 };
	}
	const progress = Math.min(1, (scrollY - threshold) / fadeRange);
	return { opacity: 1 - progress, translateRem: progress * 4 };
}

function clearNavbarWrapperInlineStyles(): void {
	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper) return;
	navbarWrapper.style.removeProperty("opacity");
	navbarWrapper.style.removeProperty("transform");
	lastNavbarFadeKey = "";
}

window.__clearNavbarWrapperInlineStyles = clearNavbarWrapperInlineStyles;

function syncNavbarWrapperForScrollY(
	scrollY?: number,
	options?: NavbarSyncOptions,
): void {
	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper || !document.body.classList.contains("enable-banner")) {
		return;
	}

	const y = typeof scrollY === "number" ? scrollY : getScrollY();
	const threshold = getNavbarHideThreshold(options);
	const fade = computeNavbarWrapperFade(y, threshold);
	const fadeKey = `${fade.opacity.toFixed(3)}:${fade.translateRem.toFixed(3)}`;

	navbarWrapper.classList.remove("navbar-hidden");

	if (fadeKey === lastNavbarFadeKey) return;
	lastNavbarFadeKey = fadeKey;

	navbarWrapper.style.opacity = String(fade.opacity);
	if (fade.opacity < 0.05) {
		navbarWrapper.style.transform = "translateY(-4rem)";
	} else if (fade.translateRem > 0) {
		navbarWrapper.style.transform = `translateY(${-fade.translateRem}rem)`;
	} else {
		navbarWrapper.style.removeProperty("transform");
	}
}

window.__syncNavbarWrapperForScrollY = syncNavbarWrapperForScrollY;

function finalizeNavbarWrapperAfterScroll(): void {
	const scrollY = getScrollY();

	document.documentElement.classList.remove("is-manual-scroll-syncing");

	const navbar = document.getElementById("navbar");
	if (navbar?.getAttribute("data-transparent-mode") === "semifull") {
		window.applySemifullNavbarVisualState?.(
			scrollY,
			navbar.getAttribute("data-is-home") === "true",
		);
	}

	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (!navbarWrapper || !document.body.classList.contains("enable-banner")) {
		return;
	}

	if (scrollY > getNavbarHideThreshold()) return;

	const currentOpacity = Number.parseFloat(navbarWrapper.style.opacity);
	const needsFadeIn = !Number.isNaN(currentOpacity) && currentOpacity < 0.999;

	if (
		needsFadeIn &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		let cleared = false;
		const clearAfterTransition = () => {
			if (cleared) return;
			cleared = true;
			navbarWrapper.removeEventListener("transitionend", onTransitionEnd);
			clearNavbarWrapperInlineStyles();
		};
		const onTransitionEnd = (event: TransitionEvent) => {
			if (
				event.target !== navbarWrapper ||
				event.propertyName !== "opacity"
			) {
				return;
			}
			clearAfterTransition();
		};

		navbarWrapper.addEventListener("transitionend", onTransitionEnd);
		navbarWrapper.style.opacity = "1";
		window.setTimeout(clearAfterTransition, 350);
		return;
	}

	clearNavbarWrapperInlineStyles();
}

window.__finalizeNavbarWrapperAfterScroll = finalizeNavbarWrapperAfterScroll;

// ── Swup readiness ────────────────────────────────────────────────────────
interface SwupReadyOptions {
	retryMs?: number;
	timeoutMs?: number;
}

window.onSwupReady = function onSwupReady(
	registerFn: (swup: unknown) => void,
	options?: SwupReadyOptions,
) {
	const retryMs = options?.retryMs ?? 50;
	const timeoutMs = options?.timeoutMs ?? 5000;
	let registered = false;
	let retryTimer: ReturnType<typeof setInterval> | null = null;
	let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	function tryRegister() {
		if (registered || !window.swup?.hooks) return;
		registered = true;
		if (retryTimer) clearInterval(retryTimer);
		if (timeoutTimer) clearTimeout(timeoutTimer);
		registerFn(window.swup);
	}

	tryRegister();
	if (registered) return;

	document.addEventListener("swup:enable", tryRegister);
	retryTimer = setInterval(tryRegister, retryMs);
	timeoutTimer = setTimeout(() => {
		if (retryTimer) clearInterval(retryTimer);
	}, timeoutMs);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", tryRegister);
	} else {
		tryRegister();
	}
};

window.onSwupHook = function onSwupHook(hook, fn, options) {
	window.onSwupReady?.((swup) => {
		(
			window.swup as { hooks: { on: (h: string, f: unknown) => void } }
		).hooks.on(hook, fn);
	}, options);
};

// ── Wallpaper / visit layout ──────────────────────────────────────────────
window.__applyWallpaperBodyClasses = function applyWallpaperBodyClasses(
	mode: string,
) {
	const body = document.body;
	body.classList.remove(
		"enable-banner",
		"no-banner-mode",
	);
	switch (mode) {
		case "banner":
			body.classList.add("enable-banner");
			break;
		case "none":
			body.classList.add("no-banner-mode");
			break;
	}
};

window.__syncTocHideForScroll = function syncTocHideForScroll(
	scrollTop: number,
	innerHeight?: number,
) {
	const wallpaperMode =
		document.documentElement.getAttribute("data-wallpaper-mode") ||
		"banner";
	const tocWrapper = document.getElementById("toc-wrapper");
	if (!tocWrapper) return;

	const vh =
		typeof innerHeight === "number" ? innerHeight : window.innerHeight;

	if (wallpaperMode !== "banner") {
		tocWrapper.classList.remove("toc-hide");
		return;
	}

	const bannerHeight = vh * (BANNER_HEIGHT / 100);
	tocWrapper.classList.toggle("toc-hide", scrollTop <= bannerHeight);
};

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

window.__applyVisitBodyLayout = function applyVisitBodyLayout(
	visit: Visit,
): void {
	const body = document.body;
	if (isHomeVisit(visit)) {
		body.classList.add("lg:is-home", "is-home");
	} else {
		body.classList.remove("lg:is-home", "is-home");
	}

	window.__applyVisitBannerLayout?.(visit);
};

window.__applyVisitBannerLayout = function applyVisitBannerLayout(
	visit: Visit,
): void {
	const isHomePage = isHomeVisit(visit);

	const bannerWrapper = document.getElementById("banner-wrapper");
	const mainContentWrapper = document.querySelector<HTMLElement>(
		".absolute.w-full.z-30",
	);

	if (!bannerWrapper || !mainContentWrapper) return;

	if (isHomePage) {
		bannerWrapper.classList.remove("mobile-hide-banner");
		mainContentWrapper.classList.remove("mobile-main-no-banner");
		// Clear inline layout left behind by the mobile transition settle step.
		mainContentWrapper.style.removeProperty("top");
		mainContentWrapper.style.removeProperty("min-height");
		return;
	}

	bannerWrapper.classList.add("mobile-hide-banner");
	// On mobile the panel must not shift; the transition suppresses the banner
	// visually instead. On desktop it can use the banner-less offset.
	if (window.innerWidth > 1279) {
		mainContentWrapper.classList.add("mobile-main-no-banner");
	}
};

window.__bootstrapWallpaperBodyClasses =
	function bootstrapWallpaperBodyClasses(): void {
		const mode =
			document.documentElement.getAttribute("data-wallpaper-mode") ||
			"banner";
		window.__applyWallpaperBodyClasses?.(mode);
	};

export {};
