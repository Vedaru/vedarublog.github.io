import { BANNER_HEIGHT } from "@constants";

const bannerEnabled = !!document.getElementById("banner-wrapper");

function shouldSkipNavbarScrollSync() {
	const html = document.documentElement;
	return (
		html.classList.contains("is-home-pre-scrolling") ||
		html.classList.contains("is-visit-pre-scrolling") ||
		html.classList.contains("is-changing") ||
		html.classList.contains("is-animating") ||
		html.classList.contains("swup-perf-active") ||
		!!window.__smoothScrollActive
	);
}

export function initNavbarScroll() {
	let backToTopBtn = document.getElementById("back-to-top-btn");
	let navbar = document.getElementById("navbar-wrapper");
	const contentWrapperRef = document.getElementById("content-wrapper");
	let backToTopThreshold = 0;
	let scrollEndTimer: ReturnType<typeof setTimeout> | null = null;
	let scrollTicking = false;

	function cacheContentWrapperOffset() {
		if (contentWrapperRef) {
			const rect = contentWrapperRef.getBoundingClientRect();
			backToTopThreshold =
				rect.top + window.scrollY + window.innerHeight / 4;
		} else {
			backToTopThreshold =
				window.innerHeight * (BANNER_HEIGHT / 100) + 100;
		}
	}

	requestAnimationFrame(function () {
		requestAnimationFrame(cacheContentWrapperOffset);
	});

	document.addEventListener("swup:page:view", () => {
		requestAnimationFrame(() => {
			requestAnimationFrame(cacheContentWrapperOffset);
		});
	});

	function scrollFunction() {
		if (shouldSkipNavbarScrollSync()) {
			return;
		}

		const scrollTop = document.documentElement.scrollTop;

		if (backToTopBtn) {
			if (scrollTop > backToTopThreshold) {
				backToTopBtn.classList.remove("hide");
			} else {
				backToTopBtn.classList.add("hide");
			}
		}

		if (bannerEnabled) {
			window.__syncTocHideForScroll?.(scrollTop, window.innerHeight);
		}

		if (bannerEnabled && navbar) {
			document.documentElement.classList.add("is-manual-scroll-syncing");
			window.__syncNavbarWrapperForScrollY?.(scrollTop);
		}

		const navEl = document.getElementById("navbar");
		if (navEl?.getAttribute("data-transparent-mode") === "semifull") {
			const isHome = navEl.getAttribute("data-is-home") === "true";
			window.applySemifullNavbarVisualState?.(scrollTop, isHome);
		}
	}

	function scheduleScrollEndFinalize() {
		if (scrollEndTimer !== null) {
			clearTimeout(scrollEndTimer);
		}
		scrollEndTimer = setTimeout(() => {
			scrollEndTimer = null;
			if (shouldSkipNavbarScrollSync()) {
				return;
			}
			window.__finalizeNavbarWrapperAfterScroll?.();
		}, 120);
	}

	function onScroll() {
		if (!scrollTicking) {
			scrollTicking = true;
			requestAnimationFrame(() => {
				scrollTicking = false;
				scrollFunction();
			});
		}
		scheduleScrollEndFinalize();
	}

	window.addEventListener("scroll", onScroll, { passive: true });

	document.addEventListener("click", function (e) {
		const target = e.target as HTMLElement | null;
		if (!target) return;
		const link = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
		if (link) {
			if (
				link.closest(
					"#toc, table-of-contents, #mobile-toc-panel, .floating-toc-wrapper, .floating-toc-panel",
				)
			) {
				return;
			}

			const targetId = link.getAttribute("href");
			if (targetId && targetId.length > 1) {
				const targetEl = document.querySelector(targetId);
				if (targetEl) {
					e.preventDefault();
					void window.__smoothScrollToElement?.(targetEl, 80, 650);
					history.pushState(null, "", targetId);
				}
			}
		}
	});
}
