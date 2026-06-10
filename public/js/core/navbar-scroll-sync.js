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
})();
