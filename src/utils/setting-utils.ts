import {
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
	// WALLPAPER_BANNER,
} from "@constants";
import { siteConfig } from "@/config";
import type { LIGHT_DARK_MODE, WALLPAPER_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = String(siteConfig.themeColor?.hue ?? 250);
	if (typeof document === "undefined") {
		return Number.parseInt(fallback);
	}
	const configCarrier = document.getElementById("config-carrier");
	// 在Swup页面切换时，config-carrier可能不存在，使用默认值
	if (!configCarrier) {
		return Number.parseInt(fallback);
	}
	return Number.parseInt(configCarrier.dataset.hue || fallback);
}

export function getHue(): number {
	if (typeof localStorage === "undefined") {
		return getDefaultHue();
	}
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	if (typeof localStorage === "undefined") {
		return DEFAULT_THEME;
	}
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

export function getStoredWallpaperMode(): WALLPAPER_MODE {
	if (typeof localStorage === "undefined") {
		return siteConfig.wallpaperMode.defaultMode;
	}
	return (
		(localStorage.getItem("wallpaperMode") as WALLPAPER_MODE) ||
		siteConfig.wallpaperMode.defaultMode
	);
}

export function setWallpaperMode(mode: WALLPAPER_MODE): void {
	localStorage.setItem("wallpaperMode", mode);
	document.documentElement.setAttribute("data-wallpaper-mode", mode);
	// 触发自定义事件通知其他组件壁纸模式已改变
	window.dispatchEvent(
		new CustomEvent("wallpaper-mode-change", { detail: { mode } }),
	);
}
