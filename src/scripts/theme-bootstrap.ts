import { widgetConfigs } from "../config";

async function initializePanelManager() {
	try {
		const { panelManager } = await import("../utils/panel-manager.js");

		const panelConfigs: { panel: string; ignores: string[] }[] = [
			{
				panel: "display-setting",
				ignores: ["display-setting", "display-settings-switch"],
			},
			{
				panel: "nav-menu-panel",
				ignores: ["nav-menu-panel", "nav-menu-switch"],
			},
			{
				panel: "search-panel",
				ignores: ["search-panel", "search-bar", "search-switch"],
			},
			{
				panel: "mobile-toc-panel",
				ignores: ["mobile-toc-panel", "mobile-toc-switch"],
			},
			{
				panel: "wallpaper-mode-panel",
				ignores: ["wallpaper-mode-panel", "wallpaper-mode-switch"],
			},
		];

		document.addEventListener("click", async function (event) {
			const tDom = event.target;
			if (!(tDom instanceof Node)) return;
			for (const cfg of panelConfigs) {
				let isInside = false;
				for (const id of cfg.ignores) {
					const el = document.getElementById(id);
					if (el === tDom || (el && el.contains(tDom))) {
						isInside = true;
						break;
					}
				}
				if (!isInside) {
					await panelManager.closePanel(cfg.panel as any);
				}
			}
		});

		return panelManager;
	} catch (error) {
		console.error("Failed to initialize panel manager:", error);
		return null;
	}
}

export function initCustomScrollbar() {
	const katexElements = document.querySelectorAll(
		".katex-display:not([data-scrollbar-initialized])",
	) as NodeListOf<HTMLElement>;

	katexElements.forEach((element) => {
		if (!element.parentNode) return;

		const container = document.createElement("div");
		container.className = "katex-display-container";
		element.parentNode.insertBefore(container, element);
		container.appendChild(element);

		container.style.cssText = `
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(0,0,0,0.3) transparent;
        `;

		const style = document.createElement("style");
		style.textContent = `
            .katex-display-container::-webkit-scrollbar {
                height: 6px;
            }
            .katex-display-container::-webkit-scrollbar-track {
                background: transparent;
            }
            .katex-display-container::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.3);
                border-radius: 3px;
            }
            .katex-display-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0,0,0,0.5);
            }
        `;

		if (!document.head.querySelector("style[data-katex-scrollbar]")) {
			style.setAttribute("data-katex-scrollbar", "true");
			document.head.appendChild(style);
		}

		element.setAttribute("data-scrollbar-initialized", "true");
	});
}

export function showBanner() {
	requestAnimationFrame(() => {
		const banner = document.getElementById("banner");
		if (banner) {
			banner.classList.remove("opacity-0", "scale-105");
		}

		const mobileBanner = document.querySelector(
			'.block.md\\:hidden[alt="Mobile banner image of the blog"]',
		);
		if (mobileBanner) {
			mobileBanner.classList.remove("opacity-0", "scale-105");
			mobileBanner.classList.add("opacity-100");
		}
	});
}

function setupSakura() {
	const sakuraConfig = (widgetConfigs as { sakura?: { enable?: boolean } })
		?.sakura;
	if (!sakuraConfig || !sakuraConfig.enable) return;
	if ((window as Window & { sakuraInitialized?: boolean }).sakuraInitialized)
		return;
	(window as Window & { sakuraInitialized?: boolean }).sakuraInitialized =
		true;
}

let fancyboxSelectors: string[] = [];
let Fancybox: any = null;

export function loadPublicStylesheet(href: string) {
	if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
		return Promise.resolve();
	}
	return new Promise<void>((resolve, reject) => {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = href;
		link.onload = () => resolve();
		link.onerror = () => reject(new Error(`Failed to load ${href}`));
		document.head.appendChild(link);
	});
}

export function checkKatex() {
	if (!document.querySelector(".katex")) return;
	void import("@scripts/lazy/katex-css").then(({ default: href }) =>
		loadPublicStylesheet(href),
	);
}

export function ensureJetBrainsMono() {
	if (!document.querySelector("pre, code, .expressive-code")) return;

	const load = () => {
		void import("./lazy/jetbrains-mono-css").then(({ default: href }) =>
			loadPublicStylesheet(href),
		);
	};

	if ("requestIdleCallback" in window) {
		requestIdleCallback(load, { timeout: 3000 });
	} else {
		setTimeout(load, 3000);
	}
}

export async function initFancybox() {
	const albumImagesSelector =
		".custom-md img, #post-cover img, .moment-images img";
	const albumLinksSelector = ".moment-images a[data-fancybox]";
	const singleFancyboxSelector = "[data-fancybox]:not(.moment-images a)";

	const hasImages =
		document.querySelector(albumImagesSelector) ||
		document.querySelector(albumLinksSelector) ||
		document.querySelector(singleFancyboxSelector);

	if (!hasImages) return;

	if (!Fancybox) {
		const mod = await import("@fancyapps/ui");
		Fancybox = mod.Fancybox;
		const { default: href } = await import("./lazy/fancybox-css");
		await loadPublicStylesheet(href);
	}

	if (fancyboxSelectors.length > 0) {
		return;
	}

	const commonConfig = {
		Thumbs: { autoStart: true, showOnStart: "yes" },
		Toolbar: {
			display: {
				left: ["infobar"],
				middle: [
					"zoomIn",
					"zoomOut",
					"toggle1to1",
					"rotateCCW",
					"rotateCW",
					"flipX",
					"flipY",
				],
				right: ["slideshow", "thumbs", "close"],
			},
		},
		animated: true,
		dragToClose: true,
		keyboard: {
			Escape: "close",
			Delete: "close",
			Backspace: "close",
			PageUp: "next",
			PageDown: "prev",
			ArrowUp: "next",
			ArrowDown: "prev",
			ArrowRight: "next",
			ArrowLeft: "prev",
		},
		fitToView: true,
		preload: 3,
		infinite: true,
		Panzoom: { maxScale: 3, minScale: 1 },
		caption: false,
	};

	Fancybox.bind(albumImagesSelector, {
		...commonConfig,
		groupAll: true,
		Carousel: {
			transition: "slide",
			preload: 2,
		},
	});
	fancyboxSelectors.push(albumImagesSelector);

	Fancybox.bind(albumLinksSelector, {
		...commonConfig,
		source: (el: any) => {
			return el.getAttribute("data-src") || el.getAttribute("href");
		},
	});
	fancyboxSelectors.push(albumLinksSelector);

	Fancybox.bind(singleFancyboxSelector, commonConfig);
	fancyboxSelectors.push(singleFancyboxSelector);
}

export function cleanupFancybox() {
	if (Fancybox) {
		fancyboxSelectors.forEach((selector) => {
			Fancybox!.unbind(selector);
		});
	}
	fancyboxSelectors = [];
	Fancybox = null;
}

function bootFirstPageEnhancements() {
	void initFancybox();
	checkKatex();
	ensureJetBrainsMono();
}

export function initThemeBootstrap() {
	void initializePanelManager();

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", setupSakura);
	} else {
		setupSakura();
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", async () => {
			showBanner();
			try {
				await import("../utils/panel-manager.js");
				console.log("Panel manager initialized");
			} catch (error) {
				console.error("Failed to initialize panel manager:", error);
			}
		});
	} else {
		showBanner();
		void (async () => {
			try {
				await import("../utils/panel-manager.js");
				console.log("Panel manager initialized");
			} catch (error) {
				console.error("Failed to initialize panel manager:", error);
			}
		})();
	}

	if (window?.swup?.hooks) {
		bootFirstPageEnhancements();
	} else if (document.readyState === "loading") {
		document.addEventListener(
			"DOMContentLoaded",
			bootFirstPageEnhancements,
		);
	} else {
		bootFirstPageEnhancements();
	}
}
