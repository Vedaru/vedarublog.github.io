import {
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
	// WALLPAPER_BANNER,
} from "@constants/constants";
import { siteConfig } from "@/config";
import type { LIGHT_DARK_MODE, WALLPAPER_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	if (typeof document === 'undefined') {
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

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	try {
		// mark that theme util is executing
		(window as any).__THEME_UTILS_RUNNING__ = true;
	} catch (e) {
		// ignore
	}
	// 获取当前主题状态的完整信息
	const currentIsDark = document.documentElement.classList.contains("dark");
	const currentTheme = document.documentElement.getAttribute("data-theme");

	// 计算目标主题状态
	let targetIsDark = false; // 初始化默认值
	switch (theme) {
		case LIGHT_MODE:
			targetIsDark = false;
			break;
		case DARK_MODE:
			targetIsDark = true;
			break;
		default:
			// 处理默认情况，使用当前主题状态
			targetIsDark = currentIsDark;
			break;
	}

	// 检测是否真的需要主题切换：
	// 1. dark类状态是否改变
	// 2. expressiveCode主题是否需要更新
	const needsThemeChange = currentIsDark !== targetIsDark;
	const expectedTheme = targetIsDark ? "github-dark" : "github-light";
	const needsCodeThemeUpdate = currentTheme !== expectedTheme;

	// 如果既不需要主题切换也不需要代码主题更新，直接返回
	if (!needsThemeChange && !needsCodeThemeUpdate) {
		return;
	}

	// 定义实际执行主题切换的函数
	const performThemeChange = () => {
		try {
			console.log("[setting-utils] performThemeChange", {
				theme,
				targetIsDark,
				needsThemeChange,
				needsCodeThemeUpdate,
				currentIsDark,
				currentTheme,
			});
		} catch (e) {
			console.warn("[setting-utils] logging failed", e);
		}
		// 应用主题变化
		if (needsThemeChange) {
			if (targetIsDark) {
				document.documentElement.classList.add("dark");
				document.body.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
				document.body.classList.remove("dark");
			}
		}

		// 同步数据属性与颜色模式，便于其他脚本/样式使用
		document.documentElement.setAttribute(
			"data-theme-mode",
			targetIsDark ? DARK_MODE : LIGHT_MODE,
		);
		document.body.setAttribute(
			"data-theme-mode",
			targetIsDark ? DARK_MODE : LIGHT_MODE,
		);
		document.documentElement.style.colorScheme = targetIsDark
			? "dark"
			: "light";

		// Set the theme for Expressive Code based on current mode
		// 只在必要时更新 data-theme 属性以减少重绘
		if (needsCodeThemeUpdate) {
			const expressiveTheme = targetIsDark ? "github-dark" : "github-light";
			document.documentElement.setAttribute("data-theme", expressiveTheme);
		}
	};

	// 检查浏览器是否支持 View Transitions API
	if (
		needsThemeChange &&
		document.startViewTransition &&
		!window.matchMedia("(prefers-reduced-motion: reduce)").matches
	) {
		// 添加标记类，表示正在使用 View Transitions
		document.documentElement.classList.add(
			"is-theme-transitioning",
			"use-view-transition",
		);

		// 使用 View Transitions API 实现平滑过渡
		const transition = document.startViewTransition(() => {
			performThemeChange();
		});

		// 在过渡完成后移除标记类（使用 finished promise 确保完全同步）
		transition.finished
			.then(() => {
				// 使用 microtask 确保在下一个事件循环前完成清理
				queueMicrotask(() => {
					document.documentElement.classList.remove(
						"is-theme-transitioning",
						"use-view-transition",
					);
				});
			})
			.catch(() => {
				// 如果过渡被中断，也要清理状态
				document.documentElement.classList.remove(
					"is-theme-transitioning",
					"use-view-transition",
				);
			});
	} else {
		// 不支持 View Transitions API 或用户偏好减少动画，使用传统方式
		// 只在需要主题切换时添加过渡保护
		if (needsThemeChange) {
			document.documentElement.classList.add("is-theme-transitioning");
		}

		performThemeChange();

		// 使用 requestAnimationFrame 确保在下一帧移除过渡保护类
		if (needsThemeChange) {
			requestAnimationFrame(() => {
				document.documentElement.classList.remove("is-theme-transitioning");
			});
		}
	}
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	try {
		console.log("[setting-utils] setTheme ->", theme);
		localStorage.setItem("theme", theme);
	} catch (e) {
		console.warn("[setting-utils] setTheme: localStorage failed", e);
	}
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	try {
		return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
	} catch (e) {
		console.warn(
			"[setting-utils] getStoredTheme: localStorage access failed",
			e,
		);
		return DEFAULT_THEME;
	}
}

export function getStoredWallpaperMode(): WALLPAPER_MODE {
	return (
		(localStorage.getItem("wallpaperMode") as WALLPAPER_MODE) ||
		siteConfig.wallpaperMode.defaultMode
	);
}

export function setWallpaperMode(mode: WALLPAPER_MODE): void {
	localStorage.setItem("wallpaperMode", mode);
	// 触发自定义事件通知其他组件壁纸模式已改变
	window.dispatchEvent(
		new CustomEvent("wallpaper-mode-change", { detail: { mode } }),
	);
}
