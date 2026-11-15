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

/**
 * Expressive Code blocks are `content-visibility: auto` with a 300px size
 * estimate. On a code-heavy post the real heights differ by hundreds of
 * pixels, so the document keeps growing while blocks render: a TOC jump
 * computed from the estimates lands past its heading (measured 411px on the
 * nvim post) and every correction is another full reflow. Count the lines and
 * give each block an accurate size before the first layout. The incoming
 * document is primed while detached, so the write never touches the live page.
 */
let codeLineHeight: number | null = null;

function measureCodeLineHeight(): number {
	const existing = document.querySelector<HTMLElement>(
		".expressive-code .ec-line",
	);
	if (existing) {
		const measured = Number.parseFloat(getComputedStyle(existing).lineHeight);
		if (Number.isFinite(measured) && measured > 0) return measured;
	}
	// The incoming document is primed before it is connected, so its computed
	// style has no code font yet. Measure a hidden probe in the live document
	// once; without this the fallback was 20.4px while the real line box is
	// 24px, and every block had to grow by ~15% after the swap.
	const probe = document.createElement("div");
	probe.className = "expressive-code";
	probe.style.cssText =
		"position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;";
	const line = document.createElement("div");
	line.className = "ec-line";
	line.textContent = "x";
	probe.append(line);
	document.body.append(probe);
	const measured = Number.parseFloat(getComputedStyle(line).lineHeight);
	probe.remove();
	return Number.isFinite(measured) && measured > 0 ? measured : 24;
}

export function primeCodeBlockSizes(root: ParentNode = document): void {
	const blocks = root.querySelectorAll<HTMLElement>(".expressive-code");
	if (blocks.length === 0) return;
	if (codeLineHeight === null) {
		codeLineHeight = measureCodeLineHeight();
	}
	const perLine = codeLineHeight;
	// Frame chrome only. With the current 24px line box, a 1-line block is 56px
	// and a 6-line block is 176px, so the box above the lines is ~32px.
	const BOX = 32;
	for (const block of blocks) {
		// The incoming document is primed while detached; the later live pass
		// must not rewrite the same inline style and force another recalc.
		if (block.style.containIntrinsicSize) continue;
		const lines = block.querySelectorAll(".ec-line").length;
		if (lines === 0) continue;
		block.style.containIntrinsicSize = `auto ${Math.round(BOX + lines * perLine)}px`;
	}
}

/**
 * Keep the first viewport's markdown eager, but let sections that start below
 * it skip layout/paint until they are approached. This is a rendering hint,
 * not a network or mount deferral: the HTML is already in the document. The
 * size estimate keeps the scroll height and TOC targets close until the real
 * section renders, and `auto` remembers the measured height afterwards.
 */
export function primeMarkdownBlockSizes(root: ParentNode = document): void {
	const blocks = root.querySelectorAll<HTMLElement>(
		".markdown-content > section > *",
	);
	if (blocks.length === 0) return;
	const perLine = codeLineHeight ?? 24;
	const width = Math.min(816, Math.max(280, window.innerWidth - 48));
	const charsPerLine = Math.max(28, Math.floor(width / 9));
	const lineHeight = 28;
	let top = 505; // post content begins under the content-page banner
	for (const block of blocks) {
		const codeBlocks = block.querySelectorAll(".expressive-code").length;
		const codeLines = block.querySelectorAll(".ec-line").length;
		let codeText = 0;
		block.querySelectorAll(".ec-line").forEach((line) => {
			codeText += (line.textContent || "").length;
		});
		const textLines = Math.ceil(
			Math.max(0, (block.textContent || "").length - codeText) /
				charsPerLine,
		);
		const estimate =
			48 +
			textLines * lineHeight +
			codeBlocks * 32 +
			codeLines * perLine;
		if (top > window.innerHeight && !block.style.contentVisibility) {
			block.style.contentVisibility = "auto";
			block.style.containIntrinsicSize = `auto ${Math.round(estimate)}px`;
		}
		top += estimate;
	}
}

// ── Boot ───────────────────────────────────────────────────────────────────
function bootEnhancements(token: number): void {
	primeCodeBlockSizes();
	void initFancybox();
	loadKatexCss();
	loadCodeFont();
	observeMermaid();

	if (document.getElementById("last-modified")) {
		void import("./runtime/last-modified");
	}
	if (document.querySelector(".expressive-code")) {
		void import("./code-collapse.js").then(({ initCodeBlocks }) => {
			if (token === generation) initCodeBlocks();
		});
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
			if (token === generation) bootEnhancements(token);
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
