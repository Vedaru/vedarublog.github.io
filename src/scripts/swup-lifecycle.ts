import { BANNER_HEIGHT, DARK_MODE, DEFAULT_THEME } from "@constants";
import { pathsEqual, url } from "../utils/url-utils";
import { isMainHomePage, pathFromUrl } from "../utils/route-utils";
import {
	isTocOrInPageAnchorLink,
	shouldInitTocForPath,
} from "../utils/toc-utils";
import { shouldSmoothScrollSamePage } from "./runtime/home-pre-scroll/visit";
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
			.forEach((url) => window.swup.cache.delete(url));
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
		// 移动端：锁定当前滚动位置（不滚动到顶部），避免换页时视觉跳变
		if (window.innerWidth <= 1279) {
			window.__lockSwupScroll?.();
		} else {
			window.__lockSwupScrollAndPin?.();
		}
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
		// 清除 __syncNavbarWrapperForScrollY 遗留的内联 opacity/transform。
		// 若不清除，从文章底部（opacity:0）跳转时 navbar-wrapper 会保持不可见，
		// 直到下次 scroll 事件才被修正。
		window.__clearNavbarWrapperInlineStyles?.();
	}

	const toc = document.getElementById("toc-wrapper");
	if (toc) {
		toc.classList.add("toc-not-ready");
	}
}

function setup() {
	invalidateSwupCacheIfStale();
	attachStylesheetErrorGuard();

	// ── 换页/动画进行中拦截用户滚动 ─────────────────────────────────────────
	// wheel / touchmove 的 non-passive preventDefault 阻止用户手动滚动；
	// 预滚动 / blended 动画 JS 直接写 scrollTop，不触发这两个事件，不受影响。
	// 键盘 Space / PgUp / PgDn / Home / End / ↑↓ 也一并拦截。
	// 必须覆盖完整窗口：is-changing/is-animating（Swup 生命周期与动画）之外，
	// 还要包含预滚动 / blended 阶段（此时 banner 正被 JS 逐帧 transform，
	// 而 Swup 的 is-changing 可能尚未生效），否则用户滚动会与 setScrollY 打架致 banner 抽动。
	// 与 navbar-scroll.ts 的 shouldSkipNavbarScrollSync 保持同一判定集合。
	{
		const SCROLL_KEYS = new Set([32, 33, 34, 35, 36, 38, 40]);

		// 注意：不含 is-smooth-scrolling / __smoothScrollActive 单独项，
		// 避免误伤同页 TOC 锚点平滑滚动（用户应能随时手动接管）。
		// 换页/blended 阶段一定带有 is-*-pre-scrolling / is-visit-layout-shifting，已覆盖 banner 动画窗口。
		function isSwupTransitionActive(): boolean {
			const html = document.documentElement;
			return (
				html.classList.contains("is-changing") ||
				html.classList.contains("is-animating") ||
				html.classList.contains("swup-perf-active") ||
				html.classList.contains("is-home-pre-scrolling") ||
				html.classList.contains("is-visit-pre-scrolling") ||
				html.classList.contains("is-visit-layout-shifting") ||
				!!window.__homePreScrollActive
			);
		}

		function onUserScrollAttempt(e: Event): void {
			if (isSwupTransitionActive()) {
				e.preventDefault();
			}
		}

		function onKeyScrollAttempt(e: KeyboardEvent): void {
			if (isSwupTransitionActive() && SCROLL_KEYS.has(e.keyCode)) {
				e.preventDefault();
			}
		}

		window.addEventListener("wheel", onUserScrollAttempt, {
			passive: false,
		});
		window.addEventListener("touchmove", onUserScrollAttempt, {
			passive: false,
		});
		window.addEventListener("keydown", onKeyScrollAttempt);
	}

	// ── 换页/动画进行中拦截新的导航请求 ──────────────────────────────────────
	// priority: 100 确保在所有其他 link:click 处理器之前运行（home-pre-scroll 是 -200/-100）。
	// 检测 is-changing（visit 生命周期全程）+ is-animating（动画播放期）+
	// __homePreScrollActive / __smoothScrollActive（预滚动阶段，is-changing 可能尚未生效）。
	// 返回 false 取消此次 Swup 导航，同时 preventDefault 防止浏览器跟随链接。
	window.swup.hooks.on(
		"link:click",
		(
			_visit: unknown,
			context?: { el?: Element; event?: Event },
		) => {
			const html = document.documentElement;
			const isInTransition =
				html.classList.contains("is-changing") ||
				html.classList.contains("is-animating") ||
				!!window.__homePreScrollActive ||
				!!window.__smoothScrollActive;
			if (isInTransition) {
				context?.event?.preventDefault();
				context?.event?.stopPropagation();
				return false;
			}
		},
		{ before: true, priority: 100 },
	);

	window.swup.hooks.on(
		"link:click",
		(_visit: unknown, context?: { el?: Element }) => {
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
		// 旧内容已被替换，此时再清零延迟，让新页卡片立即入场，
		// 同时不会重排当前(旧)页尚未播完的入场动画造成闪跳。
		document.documentElement.style.setProperty("--content-delay", "0ms");

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
		(visit: { to: { url: string }; scroll?: { reset?: boolean } }) => {
			cleanupFancybox();

			if (shouldSmoothScrollSamePage(visit)) {
				if (visit.scroll) {
					visit.scroll.reset = false;
				}
				return;
			}

			if (window.__homePreScrollWasUsed) {
				const tocEarly = document.getElementById("toc-wrapper");
				if (tocEarly) {
					tocEarly.classList.add("toc-not-ready");
				}
				return;
			}

			// 移动端：禁止 Swup 默认的 scroll-to-top，避免换页时视觉跳变
			// scroll-to-top 由 settlePageLayoutBeforeResume 统一处理
			if (window.innerWidth <= 1279 && visit.scroll) {
				visit.scroll.reset = false;
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
		evictSwupCacheIfOversized();

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
