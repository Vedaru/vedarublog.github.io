/** 换页 body 布局 / 壁纸 class / TOC 滚动隐藏 — Layout 与 MainGridLayout 共享 */

(function () {
	if (window.__visitLayoutBootstrapped) return;
	window.__visitLayoutBootstrapped = true;

	const BANNER_HEIGHT = 35;

	window.__applyWallpaperBodyClasses = function applyWallpaperBodyClasses(mode) {
		const body = document.body;
		body.classList.remove(
			"enable-banner",
			"wallpaper-transparent",
			"no-banner-mode",
		);
		switch (mode) {
			case "banner":
				body.classList.add("enable-banner");
				break;
			case "fullscreen":
				body.classList.add("wallpaper-transparent", "no-banner-mode");
				break;
			case "none":
				body.classList.add("no-banner-mode");
				break;
		}
	};

	window.__syncTocHideForScroll = function syncTocHideForScroll(
		scrollTop,
		innerHeight,
	) {
		const wallpaperMode =
			document.documentElement.getAttribute("data-wallpaper-mode") ||
			"banner";
		const tocWrapper = document.getElementById("toc-wrapper");
		if (!tocWrapper) return;

		const vh =
			typeof innerHeight === "number" ? innerHeight : window.innerHeight;

		if (wallpaperMode === "banner") {
			const bannerHeight = vh * (BANNER_HEIGHT / 100);
			if (scrollTop <= bannerHeight) {
				tocWrapper.classList.add("toc-hide");
			} else {
				tocWrapper.classList.remove("toc-hide");
			}
		} else {
			tocWrapper.classList.remove("toc-hide");
		}
	};

	window.__applyVisitBodyLayout = function applyVisitBodyLayout(visit) {
		const pathsEqual = window.__pathsEqual;
		if (!pathsEqual) return;

		const bodyElement = document.querySelector("body");
		const isHomePage = pathsEqual(visit.to.url, "/");

		if (bodyElement) {
			if (isHomePage) {
				bodyElement.classList.add("lg:is-home", "is-home");
			} else {
				bodyElement.classList.remove("lg:is-home", "is-home");
			}
		}

		const bannerTextOverlay = document.querySelector(
			".banner-text-overlay",
		);
		if (bannerTextOverlay) {
			if (isHomePage) {
				bannerTextOverlay.classList.remove("hidden");
			} else {
				bannerTextOverlay.classList.add("hidden");
			}
		}

		const bannerWrapper = document.getElementById("banner-wrapper");
		const mainContentWrapper = document.querySelector(
			".absolute.w-full.z-30",
		);

		if (bannerWrapper && mainContentWrapper) {
			if (isHomePage) {
				bannerWrapper.classList.remove("mobile-hide-banner");
				mainContentWrapper.classList.remove("mobile-main-no-banner");
			} else {
				bannerWrapper.classList.add("mobile-hide-banner");
				mainContentWrapper.classList.add("mobile-main-no-banner");
			}
		}
	};

	/** 首屏 body 壁纸 class — 替代 Layout body 内联脚本 */
	window.__bootstrapWallpaperBodyClasses = function bootstrapWallpaperBodyClasses() {
		const mode =
			document.documentElement.getAttribute("data-wallpaper-mode") ||
			"banner";
		window.__applyWallpaperBodyClasses(mode);
	};
})();
