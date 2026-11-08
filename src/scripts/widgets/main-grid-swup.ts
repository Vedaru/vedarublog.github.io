export interface MainGridSwupConfig {
	navbarTransparentMode: string;
	defaultWallpaperMode: string;
	defaultPostListLayout: string;
}

/**
 * Wallpaper and post-list layout are configuration, not runtime state.
 * Apply them once and re-assert them after a Swup visit; no layout toggling,
 * no wallpaper transition timers.
 */
export function initMainGridSwup(config: MainGridSwupConfig): void {
	const {
		navbarTransparentMode,
		defaultWallpaperMode,
		defaultPostListLayout,
	} = config;

	function apply() {
		const html = document.documentElement;
		html.setAttribute("data-wallpaper-mode", defaultWallpaperMode);
		html.setAttribute("data-post-list-layout", defaultPostListLayout);

		window.__applyWallpaperBodyClasses?.(defaultWallpaperMode);

		const mainGrid = document.getElementById("main-grid");
		if (mainGrid) {
			mainGrid.setAttribute("data-layout-mode", defaultPostListLayout);
		}

		const navbar = document.getElementById("navbar");
		if (navbar) {
			if (defaultWallpaperMode === "banner") {
				navbar.removeAttribute("data-dynamic-transparent");
				navbar.setAttribute(
					"data-transparent-mode",
					navbarTransparentMode,
				);
			} else {
				navbar.setAttribute("data-dynamic-transparent", "none");
				navbar.removeAttribute("data-transparent-mode");
			}
		}

		window.__syncTocHideForScroll?.(
			window.scrollY || document.documentElement.scrollTop || 0,
			window.innerHeight,
		);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", apply, { once: true });
	} else {
		apply();
	}

	document.addEventListener("swup:transition-ready", apply);
}
