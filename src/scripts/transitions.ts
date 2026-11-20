/**
 * Fuwari's Swup lifecycle: change the home class and open the temporary page
 * tail at visit:start, let the normal content fade and ScrollPlugin run, then
 * clean up 200ms after visit:end. Blog-specific chrome and idle enhancements
 * stay outside the animation lifecycle.
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

const HOME_CLASS = "lg:is-home";
let hooksRegistered = false;
let heightExtendTimer: ReturnType<typeof setTimeout> | undefined;

function isHomeVisit(visit: Visit): boolean {
	return isMainHomePage(pathFromUrl(visit.to.url));
}

function setBodyHome(isHome: boolean): void {
	document.body.classList.toggle(HOME_CLASS, isHome);
}

function setNavbarHome(isHome: boolean): void {
	document
		.getElementById("navbar")
		?.setAttribute("data-is-home", String(isHome));
}

function getScrollY(): number {
	return document.body.scrollTop || document.documentElement.scrollTop;
}

let lastSemifullFade = "";

/** Blog-specific transparent-navbar styling, driven by Fuwari's scroll pass. */
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

/** Fuwari's scroll-driven back-to-top, TOC and navbar state. */
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
		document.body.classList.contains(HOME_CLASS) && window.innerWidth >= 1024;
	const currentBannerHeight = isHome ? BANNER_HEIGHT_HOME : BANNER_HEIGHT;
	const threshold =
		window.innerHeight * (currentBannerHeight / 100) - 72 - 16;
	document
		.getElementById("navbar-wrapper")
		?.classList.toggle("navbar-hidden", scrollY >= threshold);
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
		document
			.getElementById("toc-wrapper")
			?.classList.remove("toc-not-ready");
		setNavbarHome(document.body.classList.contains(HOME_CLASS));
		updateScrollChrome();
	}, 200);
}

function setup(swup: NonNullable<Window["swup"]>): void {
	if (hooksRegistered) return;
	hooksRegistered = true;

	swup.hooks.on("link:click", () => {
		document.documentElement.style.setProperty("--content-delay", "0ms");

		if (!document.getElementById("banner-wrapper")) return;
		const threshold = window.innerHeight * (BANNER_HEIGHT / 100) - 72 - 16;
		const navbar = document.getElementById("navbar-wrapper");
		if (!navbar || !document.body.classList.contains(HOME_CLASS)) return;
		if (getScrollY() >= threshold) navbar.classList.add("navbar-hidden");
	});

	swup.hooks.on("visit:start", (visit: Visit) => {
		cancelEnhancements();
		const isHome = isHomeVisit(visit);
		setBodyHome(isHome);
		setNavbarHome(isHome);
		showPageHeightExtend(true);
		document.getElementById("toc-wrapper")?.classList.add("toc-not-ready");
	});

	swup.hooks.on("page:view", () => {
		showPageHeightExtend(true);
	});

	swup.hooks.on("visit:end", () => {
		scheduleEnhancements();
		showPageHeightExtend(false);
	});
}

/** Page scaling is a blog feature and is not part of Fuwari's visit motion. */
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
	setupPageScaling();

	setNavbarHome(document.body.classList.contains(HOME_CLASS));
	updateScrollChrome();
	window.onscroll = () => updateScrollChrome();
	window.addEventListener("resize", () => updateScrollChrome(), {
		passive: true,
	});

	if (window.swup?.hooks) {
		setup(window.swup);
	} else {
		document.addEventListener("swup:enable", () => {
			if (window.swup?.hooks) setup(window.swup);
		});
	}
}
