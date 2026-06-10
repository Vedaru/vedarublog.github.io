/** Navbar 隐藏阈值计算 — 与 home-pre-scroll / Layout scroll 共享 */

(function () {
	if (window.__navbarScrollSyncBootstrapped) return;
	window.__navbarScrollSyncBootstrapped = true;

	const NAVBAR_BANNER_HEIGHT = 35;
	const NAVBAR_BANNER_HEIGHT_HOME = 65;

	window.__getNavbarHideThreshold = function getNavbarHideThreshold() {
		if (!document.body.classList.contains("enable-banner")) {
			return Number.POSITIVE_INFINITY;
		}

		const isHome =
			document.body.classList.contains("lg:is-home") &&
			window.innerWidth >= 1024;
		const bannerHeight = isHome
			? NAVBAR_BANNER_HEIGHT_HOME
			: NAVBAR_BANNER_HEIGHT;

		return window.innerHeight * (bannerHeight / 100) - 88;
	};

	window.__clearNavbarWrapperInlineStyles = function clearNavbarWrapperInlineStyles() {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (!navbarWrapper) return;
		navbarWrapper.style.removeProperty("opacity");
		navbarWrapper.style.removeProperty("transform");
	};

	window.__syncNavbarWrapperForScrollY = function syncNavbarWrapperForScrollY(
		scrollY,
	) {
		const navbarWrapper = document.getElementById("navbar-wrapper");
		if (
			!navbarWrapper ||
			!document.body.classList.contains("enable-banner")
		) {
			return;
		}

		navbarWrapper.classList.remove("navbar-hidden");

		if (typeof scrollY !== "number") {
			scrollY =
				window.__getScrollY?.() ??
				window.scrollY ??
				document.documentElement.scrollTop ??
				0;
		}

		const threshold = window.__getNavbarHideThreshold?.() ?? Number.POSITIVE_INFINITY;

		if (scrollY >= threshold) {
			const fadeRange = Math.max(120, threshold * 0.2);
			const progress = Math.min(1, (scrollY - threshold) / fadeRange);
			const opacity = 1 - progress;
			navbarWrapper.style.opacity = String(opacity);
			navbarWrapper.style.transform =
				opacity < 0.05
					? "translateY(-4rem)"
					: "translateY(" + -progress * 4 + "rem)";
			return;
		}

		window.__clearNavbarWrapperInlineStyles();
	};
})();
