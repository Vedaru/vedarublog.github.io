/** 首页/分页：离开前先平滑滚到顶部，再交给 Swup 换页（须在 Layout 改 banner 之前完成） */

(function () {
	if (window.__homePreScrollBootstrapped) {
		return;
	}
	window.__homePreScrollBootstrapped = true;

	const PRE_SCROLL_MIN_MS = 580;
	const PRE_SCROLL_MAX_MS = 920;

	function getPreScrollDurationMs() {
		const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
		// 按滚动距离估算时长，长页面回顶更慢、更自然
		return Math.round(
			Math.min(
				PRE_SCROLL_MAX_MS,
				Math.max(PRE_SCROLL_MIN_MS, scrollY * 0.48),
			),
		);
	}
	let listenersRegistered = false;

	function isHomePagePath(pathname) {
		return (
			pathname === "/" ||
			pathname === "" ||
			/^\/\d+\/?$/.test(pathname)
		);
	}

	function normalizePath(path) {
		return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
	}

	function resolveHomePageIndex(path) {
		const normalized = normalizePath(path);
		if (normalized === "") return 1;
		if (/^\d+$/.test(normalized)) {
			return Number.parseInt(normalized, 10);
		}
		return null;
	}

	function isSameResolvedHomeUrl(fromPathname, toUrl) {
		const fromPage = resolveHomePageIndex(fromPathname);
		const toPage = resolveHomePageIndex(toUrl);

		if (fromPage !== null && toPage !== null) {
			return fromPage === toPage;
		}

		return normalizePath(fromPathname) === normalizePath(toUrl);
	}

	function shouldPreScrollBeforeLeaveHome(visit) {
		const onHome =
			isHomePagePath(window.location.pathname) ||
			document.body.classList.contains("lg:is-home");
		if (!onHome) return false;

		const targetUrl = visit?.to?.url || "";
		if (!targetUrl) return false;
		if (isSameResolvedHomeUrl(window.location.pathname, targetUrl)) {
			return false;
		}

		const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
		return scrollY > 80;
	}

	function syncNavbarAfterPreScroll() {
		const navbar = document.getElementById("navbar-wrapper");
		if (navbar) {
			navbar.classList.remove("navbar-hidden");
		}
	}

	function applyDeferredVisitLayout(visit) {
		if (typeof window.__applyVisitStartLayout === "function") {
			window.__applyVisitStartLayout(visit);
			return;
		}

		document.dispatchEvent(
			new CustomEvent("vedaru:home-pre-scroll-done", {
				detail: { visit: visit },
			}),
		);
	}

	window.__shouldHomePreScroll = shouldPreScrollBeforeLeaveHome;

	window.__resetHomePreScrollState = function () {
		window.__homePreScrollCompleted = false;
		window.__homePreScrollWasUsed = false;
	};

	function registerHomePreScrollListeners() {
		if (listenersRegistered || !window.swup?.hooks) {
			return listenersRegistered;
		}
		listenersRegistered = true;

		window.swup.hooks.on(
			"visit:start",
			function (visit) {
				window.__homePreScrollWasUsed = false;
				window.__homePreScrollCompleted = false;

				if (!shouldPreScrollBeforeLeaveHome(visit)) {
					return;
				}

				document.documentElement.classList.add("is-home-pre-scrolling");
				window.__homePreScrollWasUsed = true;
				window.__homePreScrollActive = true;

				if (visit.scroll) {
					visit.scroll.reset = false;
				}

				window.__bannerDriftPause?.();

				const smoothScrollToTop =
					window.__smoothScrollToTop ||
					function () {
						window.__pinPageScrollTop?.();
						return Promise.resolve();
					};

				return smoothScrollToTop(
					getPreScrollDurationMs(),
					window.__easeInOutCubic,
				).then(function () {
					window.__pinPageScrollTop?.();
					syncNavbarAfterPreScroll();
					window.__homePreScrollCompleted = true;
					applyDeferredVisitLayout(visit);
					window.__homePreScrollActive = false;
					document.documentElement.classList.remove(
						"is-home-pre-scrolling",
					);
				});
			},
			{ priority: 100 },
		);

		window.swup.hooks.on(
			"content:scroll",
			function (visit) {
				if (!visit?.scroll?.reset) {
					return false;
				}

				const scrollY =
					window.scrollY ||
					document.documentElement.scrollTop ||
					0;
				if (scrollY <= 8) {
					visit.scroll.reset = false;
				}
			},
			{ before: true },
		);

		window.swup.hooks.on("visit:end", function () {
			window.__homePreScrollCompleted = false;
			window.__homePreScrollActive = false;
		});

		return true;
	}

	function bootstrapHomePreScroll() {
		if (registerHomePreScrollListeners()) {
			return;
		}

		document.addEventListener("swup:enable", registerHomePreScrollListeners);

		const retryTimer = window.setInterval(function () {
			if (registerHomePreScrollListeners()) {
				window.clearInterval(retryTimer);
			}
		}, 50);

		window.setTimeout(function () {
			window.clearInterval(retryTimer);
		}, 5000);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapHomePreScroll);
	} else {
		bootstrapHomePreScroll();
	}
})();
