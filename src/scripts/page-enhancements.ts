/**
 * Post-transition page enhancements.
 *
 * Everything here is optional: image lightboxes, math fonts, code fonts,
 * mermaid diagrams, comment widgets and analytics. None of it is needed for
 * first paint or the page transition, so it starts only after the 700ms
 * banner/grid glide has settled and the browser is idle.
 */
import { runAfterLayoutSettled } from "./runtime/after-transition";

let generation = 0;

async function loadStylesheet(href: string): Promise<void> {
	if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
		return;
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

function loadKatexCss(): void {
	if (!document.querySelector(".katex")) return;
	void import("./lazy/katex-css").then(({ default: href }) =>
		loadStylesheet(href),
	);
}

function loadCodeFont(): void {
	if (!document.querySelector("pre, code, .expressive-code")) return;
	const load = () =>
		void import("./lazy/jetbrains-mono-css").then(({ default: href }) =>
			loadStylesheet(href),
		);
	if ("requestIdleCallback" in window) {
		requestIdleCallback(load, { timeout: 4000 });
	} else {
		setTimeout(load, 4000);
	}
}

// ── Fancybox ───────────────────────────────────────────────────────────────
let fancyboxSelectors: string[] = [];
let Fancybox: any = null;

async function initFancybox(): Promise<void> {
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
		await loadStylesheet(href);
	}

	if (fancyboxSelectors.length > 0) return;

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
		Carousel: { transition: "slide", preload: 2 },
	});
	fancyboxSelectors.push(albumImagesSelector);

	Fancybox.bind(albumLinksSelector, {
		...commonConfig,
		source: (el: any) =>
			el.getAttribute("data-src") || el.getAttribute("href"),
	});
	fancyboxSelectors.push(albumLinksSelector);

	Fancybox.bind(singleFancyboxSelector, commonConfig);
	fancyboxSelectors.push(singleFancyboxSelector);
}

// ── Mermaid ────────────────────────────────────────────────────────────────
let mermaidImport: Promise<unknown> | null = null;
let mermaidObserver: IntersectionObserver | null = null;

function observeMermaid(): void {
	const diagrams = document.querySelectorAll(
		".mermaid[data-mermaid-code]",
	);
	if (diagrams.length === 0) return;

	// The module handles later navigations itself once loaded.
	if (mermaidImport) return;

	mermaidObserver?.disconnect();
	mermaidObserver = new IntersectionObserver(
		(entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			mermaidObserver?.disconnect();
			mermaidObserver = null;
			mermaidImport = import("./mermaid-init.js");
		},
		{ rootMargin: "400px 0px" },
	);

	diagrams.forEach((diagram) => mermaidObserver!.observe(diagram));
}

// ── Boot ───────────────────────────────────────────────────────────────────
function bootEnhancements(): void {
	void initFancybox();
	loadKatexCss();
	loadCodeFont();
	observeMermaid();

	if (document.getElementById("last-modified")) {
		void import("./runtime/last-modified");
	}
	if (document.querySelector(".expressive-code")) {
		void import("./code-collapse.js");
	}
	if (document.getElementById("umami-scripts-tpl")) {
		void import("./runtime/analytics-scheduler");
	}
}

export function scheduleEnhancements(): void {
	const token = ++generation;
	runAfterLayoutSettled(() => {
		if (token !== generation) return;
		const run = () => {
			if (token === generation) bootEnhancements();
		};
		if ("requestIdleCallback" in window) {
			requestIdleCallback(run, { timeout: 2500 });
		} else {
			setTimeout(run, 300);
		}
	});
}

/** Invalidate work queued for the previous page. */
export function cancelEnhancements(): void {
	generation++;
}

/** First load has no page transition to wait for. */
export function initEnhancements(): void {
	if (document.readyState === "complete") {
		scheduleEnhancements();
	} else {
		window.addEventListener("load", scheduleEnhancements, { once: true });
	}
}
