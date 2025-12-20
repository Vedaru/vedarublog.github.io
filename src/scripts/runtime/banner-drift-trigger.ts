/** 在 banner-drift runtime 就绪且首屏 layout-ready 后触发 drift */

export function scheduleBannerDrift(containerId: string): void {
	const run = (): void => {
		const root = document.getElementById(containerId);
		if (!root) return;

		if (typeof window.__bannerSessionApplyDrift !== "function") {
			requestAnimationFrame(run);
			return;
		}

		const startDrift = () => {
			window.__bannerSessionApplyDrift?.(root);
		};

		if (document.documentElement.classList.contains("layout-ready")) {
			requestAnimationFrame(function () {
				requestAnimationFrame(startDrift);
			});
			return;
		}

		const onReady = () => {
			requestAnimationFrame(function () {
				requestAnimationFrame(startDrift);
			});
		};

		if (
			typeof MutationObserver !== "undefined" &&
			document.documentElement
		) {
			const observer = new MutationObserver(function () {
				if (
					document.documentElement.classList.contains("layout-ready")
				) {
					observer.disconnect();
					onReady();
				}
			});
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
			// 兜底：layout-ready 已存在或长时间未标记
			setTimeout(function () {
				observer.disconnect();
				onReady();
			}, 500);
			return;
		}

		onReady();
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", run, { once: true });
	} else {
		run();
	}
}
