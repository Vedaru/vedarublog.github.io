/** 主题 sync inline 首屏后的 resize / Swup idle 监听（非阻塞） */

export function initThemeCriticalDeferred(): void {
	const pageScaling = window.__themePageScaling;
	if (
		!pageScaling?.enable ||
		typeof window.__adjustPageScale !== "function"
	) {
		return;
	}

	const adjustPageScale = window.__adjustPageScale;

	window.addEventListener("resize", adjustPageScale);
	window.addEventListener("orientationchange", adjustPageScale);

	function registerOnSwupIdle(): boolean {
		if (typeof window.__onSwupPageIdlePhase === "function") {
			window.__onSwupPageIdlePhase(adjustPageScale);
			return true;
		}
		return false;
	}

	if (!registerOnSwupIdle()) {
		document.addEventListener(
			"DOMContentLoaded",
			() => {
				registerOnSwupIdle();
			},
			{ once: true },
		);
	}
}
