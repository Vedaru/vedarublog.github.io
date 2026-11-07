import { BANNER_HEIGHT, DARK_MODE, DEFAULT_THEME } from "@constants";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	isTocOrInPageAnchorLink,
	shouldInitTocForPath,
} from "../utils/toc-utils";
import {
	checkKatex,
	ensureJetBrainsMono,
	cleanupFancybox,
	initCustomScrollbar,
	initFancybox,
} from "./theme-bootstrap";
import { easeInOutCubic } from "./runtime/animation/easing";

const DYNAMIC_STYLE_PATTERN =
	/\/_astro\/.*(fancybox|katex|jetbrains|fancybox-custom)/i;
const LAYOUT_SLIDE_MS = 700;
const bannerEnabled = !!document.getElementById("banner-wrapper");

function removeViteInjectedStyles() {
	document
		.querySelectorAll('link[rel="stylesheet"][href*="/_astro/"]')
		.forEach((link) => {
			const href = link.getAttribute("href") || "";
			if (DYNAMIC_STYLE_PATTERN.test(href)) {
				link.remove();
			}
		});
}

function invalidateSwupCacheIfStale() {
	const buildId = document
		.querySelector('meta[name="site-build-id"]')
		?.getAttribute("content");
	if (!buildId || !window.swup?.cache?.clear) return;

	const storageKey = "vedaru-swup-build-id";
	const previous = sessionStorage.getItem(storageKey);
	if (previous && previous !== buildId) {
		window.swup.cache.clear();
	}
	sessionStorage.setItem(storageKey, buildId);
}

const MAX_SWUP_CACHE_ENTRIES = 10;

function evictSwupCacheIfOversized() {
	if (
		typeof window.swup?.cache?.all !== "function" ||
		typeof window.swup?.cache?.delete !== "function"
	)
		return;
	const cached = Object.keys(window.swup.cache.all());
	if (cached.length > MAX_SWUP_CACHE_ENTRIES) {
		cached
			.slice(0, cached.length - MAX_SWUP_CACHE_ENTRIES)
			.forEach((url) => window.swup?.cache?.delete(url));
	}
}

function attachStylesheetErrorGuard() {
	document
		.querySelectorAll('link[rel="stylesheet"][href*="/_astro/"]')
		.forEach((link) => {
			if ((link as HTMLElement).dataset.staleGuard === "1") return;
			(link as HTMLElement).dataset.staleGuard = "1";
			link.addEventListener(
				"error",
				() => {
					const href = link.getAttribute("href") || "";
					if (/\/_astro\/style\.[a-zA-Z0-9_-]+\.css/.test(href)) {
						return;
					}
					link.remove();
				},
				{ once: true },
			);
		});
}

/**
 * Everything here is deliberately non-critical. The page transition includes
 * a 700ms grid/banner slide; running TOC/widget work before it finishes is
 * what made the motion stutter.
 */
function runDeferredInit() {
	window.__scheduleSwupIdleWork?.(() => {
		void initFancybox();
		checkKatex();
		ensureJetBrainsMono();
		initCustomScrollbar();
	});
	window.__scheduleSwupIdleWork?.(() => {
		if (typeof window.mobileTOCInit === "function") {
			window.mobileTOCInit();
		}
	});
}

function runPageLayout() {
	const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
	const tocWrapper = document.getElementById("toc-wrapper");
	const tocElement = document.querySelector("table-of-contents");
	const shouldInitToc = shouldInitTocForPath();

	if (tocWrapper) {
		tocWrapper.classList.remove("toc-not-ready");
	}

	if (tocWrapper && tocElement) {
		if (shouldInitToc) {
			if (typeof tocElement.init === "function") {
				tocElement.init();
			}
		} else if (
			typeof (tocElement as HTMLElement & { teardown?: () => void })
				.teardown === "function"
		) {
			(tocElement as HTMLElement & { teardown: () => void }).teardown();
			tocElement.innerHTML = "";
			delete tocElement.dataset.loaded;
		}
	}

	window.__syncTocHideForScroll?.(scrollTop, window.innerHeight);

	const navbar = document.getElementById("navbar");
	if (navbar) {
		const transparentMode = navbar.getAttribute("data-transparent-mode");
		if (
			transparentMode === "semifull" &&
			typeof window.initSemifullScrollDetection === "function"
		) {
			window.initSemifullScrollDetection(scrollTop);
		}
	}
}

let layoutSlideTimer: ReturnType<typeof setTimeout> | null = null;
let layoutApplyGeneration = 0;

function endLayoutSlide() {
	const html = document.documentElement;
	html.classList.remove("is-layout-sliding");
	if (layoutSlideTimer !== null) {
		clearTimeout(layoutSlideTimer);
		layoutSlideTimer = null;
		document.dispatchEvent(new CustomEvent("vedaru:layout-settled"));
	}
}

function beginLayoutSlide() {
	const html = document.documentElement;
	if (layoutSlideTimer !== null) clearTimeout(layoutSlideTimer);
	html.classList.add("is-layout-sliding");

	// Reading a CSS variable here forces a full style recalculation of the
	// freshly inserted page right before the transform starts. Match the CSS
	// duration in JS instead so both mutations batch into the next frame.
	const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
		.matches
		? 0
		: LAYOUT_SLIDE_MS;
	layoutSlideTimer = setTimeout(endLayoutSlide, duration + 100);
}

/**
 * Apply the target layout after content:replace. Only the incoming DOM is
 * transformed; the outgoing page (often a very tall article) is never dragged
 * around as a giant compositor layer, which is what made the grid stutter.
 */
function applyTargetLayout(visit: {
	to: { url: string };
	from?: { url?: string };
}) {
	const isHomePage = isMainHomePage(pathFromUrl(visit.to.url));
	const fromUrl = visit.from?.url;
	const fromHome = fromUrl
		? isMainHomePage(pathFromUrl(fromUrl))
		: document.body.classList.contains("is-home");

	if (fromHome !== isHomePage) {
		beginLayoutSlide();
	} else {
		endLayoutSlide();
	}

	window.__applyVisitBodyLayout?.(visit);

	const navbar = document.getElementById("navbar");
	if (navbar) {
		navbar.setAttribute("data-is-home", isHomePage.toString());
		const transparentMode = navbar.getAttribute("data-transparent-mode");
		if (transparentMode === "semifull") {
			window.initSemifullScrollDetection?.(0);
		}
	}

	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (navbarWrapper) {
		navbarWrapper.classList.remove("navbar-hidden");
		window.__clearNavbarWrapperInlineStyles?.();
	}

	document.getElementById("toc-wrapper")?.classList.add("toc-not-ready");
}

function syncThemeFromStorage() {
	const storedTheme = localStorage.getItem("theme") || DEFAULT_THEME;
	const isDark = storedTheme === DARK_MODE;
	const expectedTheme = isDark ? "github-dark" : "github-light";

	const currentTheme = document.documentElement.getAttribute("data-theme");
	const hasDarkClass = document.documentElement.classList.contains("dark");

	if (currentTheme === expectedTheme && hasDarkClass === isDark) return;

	requestAnimationFrame(() => {
		document.documentElement.setAttribute("data-theme", expectedTheme);
		document.documentElement.classList.toggle("dark", isDark);
	});
}

function setup() {
	invalidateSwupCacheIfStale();
	attachStylesheetErrorGuard();

	// Block a second navigation while one is already running.
	window.swup?.hooks.on(
		"link:click",
		(_visit: unknown, context?: { el?: Element; event?: Event }) => {
			const html = document.documentElement;
			if (
				html.classList.contains("is-changing") ||
				html.classList.contains("is-animating") ||
				!!window.__smoothScrollActive
			) {
				context?.event?.preventDefault();
				context?.event?.stopPropagation();
				return false;
			}
		},
		{ before: true, priority: 100 },
	);

	window.swup?.hooks.on(
		"link:click",
		(_visit: unknown, context?: { el?: Element }) => {
			if (
				isTocOrInPageAnchorLink(context?.el) ||
				(window.tocClickTimestamp &&
					Date.now() - window.tocClickTimestamp < 200)
			) {
				return;
			}

			document.getElementById("toc-wrapper")?.classList.add(
				"toc-not-ready",
			);

			if (bannerEnabled) {
				const scrollY = document.documentElement.scrollTop;
				if (scrollY <= 80) {
					const navbar = document.getElementById("navbar-wrapper");
					if (
						navbar &&
						document.body.classList.contains("lg:is-home")
					) {
						const threshold =
							window.innerHeight * (BANNER_HEIGHT / 100) - 88;
						if (scrollY >= threshold) {
							navbar.classList.add("navbar-hidden");
						}
					}
				}
			}
		},
	);

	window.swup?.hooks.on(
		"visit:start",
		async () => {
			const scrollY =
				window.scrollY || document.documentElement.scrollTop || 0;
			if (scrollY <= 80) return;
			// Do the scroll while the current page is static. Otherwise the
			// sidebar's sticky top transition and the page scroll run at the
			// same time and the cards visibly slide down the screen.
			await (window.__smoothScrollToTop?.(
				500,
				easeInOutCubic,
			) ?? Promise.resolve());
		},
		{ before: true, priority: -200 },
	);

	window.swup?.hooks.on(
		"visit:start",
		(visit: { to: { url: string }; from?: { url?: string } }) => {
			cleanupFancybox();
			document.documentElement.style.setProperty(
				"--content-delay",
				"0ms",
			);
			document.getElementById("toc-wrapper")?.classList.add(
				"toc-not-ready",
			);
		},
		{ priority: 0 },
	);

	window.swup?.hooks.on(
		"content:replace",
		(visit: { to: { url: string }; from?: { url?: string } }) => {
			document.documentElement.style.setProperty(
				"--content-delay",
				"0ms",
			);
			// Let the replacement finish its style/layout work and paint once
			// before starting the transform. Otherwise the slide's first frames
			// compete with the incoming page's DOM and style recalculation.
			const generation = ++layoutApplyGeneration;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (generation !== layoutApplyGeneration) return;
					applyTargetLayout(visit);
					window.__applyVisitBannerLayout?.(visit);
				});
			});
			attachStylesheetErrorGuard();
		},
	);

	window.swup?.hooks.on(
		"page:view",
		(visit: { to: { document?: Document } }) => {
			const nextTitle = visit?.to?.document?.title;
			if (nextTitle && document.title !== nextTitle) {
				document.title = nextTitle;
			}
			syncThemeFromStorage();
		},
	);

	window.swup?.hooks.on("animation:in:end", () => {
		removeViteInjectedStyles();
	});

	window.swup?.hooks.on("visit:end", () => {
		evictSwupCacheIfOversized();
		setTimeout(() => {
			document.getElementById("toc-wrapper")?.classList.remove(
				"toc-not-ready",
			);
		}, 200);
	});

	// Post-transition work waits for the layout slide (if any) to finish.
	document.addEventListener("swup:transition-ready", () => {
		runPageLayout();
		runDeferredInit();
	});

	requestAnimationFrame(runPageLayout);
}

export function initSwupLifecycle() {
	if (window?.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup);
	}
}
