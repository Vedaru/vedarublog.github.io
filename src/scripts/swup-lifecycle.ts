import { BANNER_HEIGHT, DARK_MODE, DEFAULT_THEME } from "@constants";
import { pathsEqual, url } from "../utils/url-utils";
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

const DYNAMIC_STYLE_PATTERN =
	/\/_astro\/.*(fancybox|katex|jetbrains|fancybox-custom)/i;
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

export function runSwupPageWritePhase() {
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

export function runSwupPageLayoutPhase(detail?: { scrollTop?: number }) {
	const scrollTop = detail?.scrollTop ?? 0;
	const tocWrapper = document.getElementById("toc-wrapper");
	const tocElement = document.querySelector("table-of-contents");
	const shouldInitToc = shouldInitTocForPath();

	const html = document.documentElement;
	const swupTransitionActive =
		html.classList.contains("is-changing") ||
		html.classList.contains("is-animating") ||
		html.classList.contains("swup-perf-active");

	if (swupTransitionActive) {
		tocWrapper?.classList.add("toc-not-ready");
	} else {
		window.__syncTocHideForScroll?.(
			scrollTop,
			window.__swupPhaseInnerHeight,
		);
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

	const navbar = document.getElementById("navbar");
	if (navbar) {
		const transparentMode = navbar.getAttribute("data-transparent-mode");
		if (transparentMode === "semifull") {
			if (window.__suppressSemifullNavbarReinit) {
				const isHome = navbar.getAttribute("data-is-home") === "true";
				window.applySemifullNavbarVisualState?.(scrollTop, isHome);
			} else if (
				typeof window.initSemifullScrollDetection === "function"
			) {
				window.initSemifullScrollDetection(scrollTop);
			}
		}
	}
}

let swupPhasesRegistered = false;

function runInitialLayoutPhaseIfIdle() {
	const html = document.documentElement;
	if (
		html.classList.contains("is-changing") ||
		html.classList.contains("is-animating")
	) {
		return;
	}
	runSwupPageLayoutPhase({
		scrollTop: window.scrollY || document.documentElement.scrollTop || 0,
	});
}

function registerSwupPagePhases() {
	if (swupPhasesRegistered) return;

	if (!window.__onSwupPageWritePhase || !window.__onSwupPageLayoutPhase) {
		return;
	}

	swupPhasesRegistered = true;
	window.__onSwupPageWritePhase(runSwupPageWritePhase);
	window.__onSwupPageLayoutPhase(runSwupPageLayoutPhase);
	runInitialLayoutPhaseIfIdle();
}

function ensureSwupPagePhasesRegistered() {
	if (swupPhasesRegistered) return;

	registerSwupPagePhases();
	if (swupPhasesRegistered) return;

	const startedAt = performance.now();
	const retry = () => {
		registerSwupPagePhases();
		if (swupPhasesRegistered) return;
		if (performance.now() - startedAt > 5000) return;
		requestAnimationFrame(retry);
	};
	requestAnimationFrame(retry);

	document.addEventListener("swup:swup-perf-ready", registerSwupPagePhases, {
		once: true,
	});
}

function applyVisitBodyLayout(visit: { to: { url: string } }) {
	window.__applyVisitBodyLayout?.(visit);
}

export function flushPendingVisitBodyLayout() {
	if (!window.__pendingVisitBodyLayout) return;

	window.__pendingVisitBodyLayout = undefined;
	window.__lockSwupScroll?.();
	window.__pinPageScrollTop?.();
	requestAnimationFrame(() => {
		window.__pinPageScrollTop?.();
		requestAnimationFrame(() => {
			window.__pinPageScrollTop?.();
		});
	});
}

export function applyVisitStartLayout(
	visit: { to: { url: string } },
	options?: { deferBodyLayout?: boolean },
) {
	const isHomePage = isMainHomePage(pathFromUrl(visit.to.url));
	const cachedScrollTop =
		window.scrollY || document.documentElement.scrollTop || 0;

	// 换页开始就应用目标页 banner / is-home 布局，避免 content:replace 时才跳变
	applyVisitBodyLayout(visit);

	if (options?.deferBodyLayout) {
		window.__pendingVisitBodyLayout = visit;
	} else if (!window.__homePreScrollWasUsed) {
		window.__lockSwupScrollAndPin?.();
	}

	const scrollForSemifull =
		!options?.deferBodyLayout && !window.__homePreScrollWasUsed
			? 0
			: cachedScrollTop;

	const navbar = document.getElementById("navbar");
	if (navbar) {
		navbar.setAttribute("data-is-home", isHomePage.toString());
		const transparentMode = navbar.getAttribute("data-transparent-mode");
		if (transparentMode === "semifull") {
			if (window.__suppressSemifullNavbarReinit) {
				window.applySemifullNavbarVisualState?.(0, isHomePage);
			} else if (
				typeof window.initSemifullScrollDetection === "function"
			) {
				window.initSemifullScrollDetection(scrollForSemifull);
			}
		}
	}

	const navbarWrapper = document.getElementById("navbar-wrapper");
	if (navbarWrapper) {
		navbarWrapper.classList.remove("navbar-hidden");
	}

	const toc = document.getElementById("toc-wrapper");
	if (toc) {
		toc.classList.add("toc-not-ready");
	}
}

function setup() {
	invalidateSwupCacheIfStale();
	attachStylesheetErrorGuard();

	window.swup.hooks.on(
		"link:click",
		(_visit: unknown, context?: { el?: Element }) => {
			document.documentElement.style.setProperty(
				"--content-delay",
				"0ms",
			);

			// 页内锚点 / TOC 点击不会触发 visit:end，不能加 toc-not-ready
			if (
				isTocOrInPageAnchorLink(context?.el) ||
				(window.tocClickTimestamp &&
					Date.now() - window.tocClickTimestamp < 200)
			) {
				return;
			}

			const tocOnClick = document.getElementById("toc-wrapper");
			if (tocOnClick) {
				tocOnClick.classList.add("toc-not-ready");
			}

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

	window.swup.hooks.on("content:replace", () => {
		attachStylesheetErrorGuard();
		window.initLastModifiedPage?.();
		window.initTwikooPage?.();
		window.initArchiveFilter?.();

		if (window.__homePreScrollWasUsed && window.__pendingVisitBodyLayout) {
			requestAnimationFrame(() => {
				flushPendingVisitBodyLayout();
			});
		}
	});

	ensureSwupPagePhasesRegistered();

	window.__applyVisitStartLayout = applyVisitStartLayout;
	window.__flushPendingVisitBodyLayout = flushPendingVisitBodyLayout;

	document.addEventListener("vedaru:home-pre-scroll-done", ((
		event: CustomEvent<{ visit: { to: { url: string } } }>,
	) => {
		if (event.detail?.visit) {
			applyVisitStartLayout(event.detail.visit, {
				deferBodyLayout: true,
			});
		}
	}) as EventListener);

	window.swup.hooks.on(
		"visit:start",
		(visit: { to: { url: string } }) => {
			cleanupFancybox();

			if (window.__homePreScrollWasUsed) {
				const tocEarly = document.getElementById("toc-wrapper");
				if (tocEarly) {
					tocEarly.classList.add("toc-not-ready");
				}
				return;
			}

			applyVisitStartLayout(visit);
		},
		{ priority: 0 },
	);

	window.swup.hooks.on(
		"page:view",
		(visit: { to: { document?: Document } }) => {
			const nextTitle = visit?.to?.document?.title;
			if (nextTitle && document.title !== nextTitle) {
				document.title = nextTitle;
			}

			const hadHomePreScroll = !!window.__homePreScrollWasUsed;

			if (hadHomePreScroll) {
				if (window.__homePreScrollActive) {
					return;
				}
				window.__pinPageScrollTop?.();
			}

			const storedTheme = localStorage.getItem("theme") || DEFAULT_THEME;
			const isDark = storedTheme === DARK_MODE;
			const expectedTheme = isDark ? "github-dark" : "github-light";

			const currentTheme =
				document.documentElement.getAttribute("data-theme");
			const hasDarkClass =
				document.documentElement.classList.contains("dark");

			if (currentTheme !== expectedTheme || hasDarkClass !== isDark) {
				requestAnimationFrame(() => {
					if (currentTheme !== expectedTheme) {
						document.documentElement.setAttribute(
							"data-theme",
							expectedTheme,
						);
					}
					if (hasDarkClass !== isDark) {
						if (isDark) {
							document.documentElement.classList.add("dark");
						} else {
							document.documentElement.classList.remove("dark");
						}
					}
				});
			}

			setTimeout(() => {
				if (document.getElementById("tcomment")) {
					const pageLoadedEvent = new CustomEvent(
						"mizuki:page:loaded",
						{
							detail: {
								path: window.location.pathname,
								timestamp: Date.now(),
							},
						},
					);
					document.dispatchEvent(pageLoadedEvent);
					console.log(
						"Layout: 触发 mizuki:page:loaded 事件，路径:",
						window.location.pathname,
					);
				}
			}, 300);
		},
	);

	window.swup.hooks.on("visit:end", () => {
		window.__pendingVisitBodyLayout = undefined;

		setTimeout(() => {
			if (!window.__homePreScrollWasUsed) {
				window.__unlockSwupScroll?.();
			}

			const toc = document.getElementById("toc-wrapper");
			if (toc) {
				toc.classList.remove("toc-not-ready");
			}
		}, 200);
	});

	window.swup.hooks.on("animation:in:end", () => {
		removeViteInjectedStyles();
	});
}

export function initSwupLifecycle() {
	if (window?.swup?.hooks) {
		setup();
	} else {
		document.addEventListener("swup:enable", setup);
	}
}
