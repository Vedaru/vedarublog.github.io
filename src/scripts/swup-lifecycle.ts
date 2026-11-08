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
import { resetSwupIdle, runSwupIdle } from "./runtime/swup-idle";

const DYNAMIC_STYLE_PATTERN =
	/\/_astro\/.*(fancybox|katex|jetbrains|fancybox-custom)/i;
const POST_TRANSITION_MS = 700;
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

/** Non-critical work waits for the CSS grid/banner slide to settle. */
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

/**
 * Apply the target layout after content:replace. The CSS transition on
 * #main-grid / #banner-wrapper does the slide; this only flips the state.
 */
function applyTargetLayout(visit: { to: { url: string } }) {
	const isHomePage = isMainHomePage(pathFromUrl(visit.to.url));

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

let layoutApplyGeneration = 0;
let postTransitionTimer: number | null = null;

function schedulePostTransition() {
	if (postTransitionTimer !== null) {
		window.clearTimeout(postTransitionTimer);
	}
	const delay = window.matchMedia("(prefers-reduced-motion: reduce)")
		.matches
		? 0
		: POST_TRANSITION_MS;
	postTransitionTimer = window.setTimeout(() => {
		postTransitionTimer = null;
		runPageLayout();
		runDeferredInit();
		runSwupIdle();
		document.getElementById("toc-wrapper")?.classList.remove("toc-not-ready");
	}, delay);
}

function setup() {
	attachStylesheetErrorGuard();

	// Block a second navigation while one is already running.
	window.swup?.hooks.on(
		"link:click",
		(_visit: unknown, context?: { el?: Element; event?: Event }) => {
			const html = document.documentElement;
			if (
				html.classList.contains("is-changing") ||
				html.classList.contains("is-animating")
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
		() => {
			resetSwupIdle();
			if (postTransitionTimer !== null) {
				window.clearTimeout(postTransitionTimer);
				postTransitionTimer = null;
			}

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
		(visit: { to: { url: string } }) => {
			document.documentElement.style.setProperty(
				"--content-delay",
				"0ms",
			);
			// Let the new DOM paint once before flipping the layout state.
			// The transform then runs on the incoming page only.
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
		schedulePostTransition();
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
