import { BANNER_HEIGHT } from "@constants";

const bannerEnabled = !!document.getElementById("banner-wrapper");

function throttle(func: (...args: unknown[]) => void, limit: number) {
	let inThrottle = false;
	return function (this: unknown, ...args: unknown[]) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
}

export function initNavbarScroll() {
	let backToTopBtn = document.getElementById("back-to-top-btn");
	let toc = document.getElementById("toc-wrapper");
	let navbar = document.getElementById("navbar-wrapper");
	const contentWrapperRef = document.getElementById("content-wrapper");
	let backToTopThreshold = 0;

	function cacheContentWrapperOffset() {
		if (contentWrapperRef) {
			const rect = contentWrapperRef.getBoundingClientRect();
			backToTopThreshold =
				rect.top + window.scrollY + window.innerHeight / 4;
		} else {
			backToTopThreshold = window.innerHeight * (BANNER_HEIGHT / 100) + 100;
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
		if (
			document.documentElement.classList.contains("is-home-pre-scrolling") ||
			document.documentElement.classList.contains("is-visit-pre-scrolling")
		) {
			return;
		}

		const scrollTop = document.documentElement.scrollTop;

		requestAnimationFrame(() => {
			if (backToTopBtn) {
				if (scrollTop > backToTopThreshold) {
					backToTopBtn.classList.remove("hide");
				} else {
					backToTopBtn.classList.add("hide");
				}
			}

			if (bannerEnabled && toc) {
				window.__syncTocHideForScroll?.(scrollTop, window.innerHeight);
			}

			if (bannerEnabled && navbar) {
				const threshold =
					window.__getNavbarHideThreshold?.() ?? Number.POSITIVE_INFINITY;
				if (scrollTop >= threshold) {
					navbar.classList.add("navbar-hidden");
				} else {
					navbar.classList.remove("navbar-hidden");
				}
			}
		});
	}

	window.addEventListener("scroll", throttle(scrollFunction, 16), {
		passive: true,
	});

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
