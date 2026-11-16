/**
 * Page-move engine. Owns window scrollTop, #main-grid transform and
 * #banner-wrapper transform. Sidebar top, banner crop and fades stay CSS.
 * One rAF handle; one scroll write per frame; reads happen once at start.
 */
import { setScrollTweening } from "./motion-state";

const DURATION = 700;
const EASE = [0.4, 0, 0.2, 1] as const;
const ENGINE = "is-layout-engine";
const MOVING = "is-layout-moving";
const ROOT = document.documentElement;
export const LAYOUT_MOVE_END = "layout-move-end";

// One source for the duration and easing consumed by CSS transitions.
ROOT.style.setProperty("--layout-slide-duration", `${DURATION}ms`);
ROOT.style.setProperty("--layout-slide-ease", `cubic-bezier(${EASE.join(",")})`);

export interface LayoutMoveOptions {
	startY: number;
	toHome: boolean;
	layout: boolean;
	onFlip: () => void;
}

export interface LayoutMoveHandle {
	readonly duration: number;
	readonly layout: boolean;
	readonly finished: Promise<void>;
}

type Active = {
	kind: "layout" | "scroll";
	frame: number;
	resolve: () => void;
};

let active: Active | null = null;

function slideEase(x: number): number {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	const [x1, y1, x2, y2] = EASE;
	const bezier = (t: number, p1: number, p2: number) => {
		const u = 1 - t;
		return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
	};
	let t = x;
	for (let i = 0; i < 8; i += 1) {
		const error = bezier(t, x1, x2) - x;
		if (Math.abs(error) < 1e-6) return bezier(t, y1, y2);
		const slope =
			3 * (1 - t) * (1 - t) * x1 +
			6 * (1 - t) * t * (x2 - x1) +
			3 * t * t * (1 - x2);
		if (Math.abs(slope) < 1e-6) break;
		t -= error / slope;
	}
	let low = 0;
	let high = 1;
	for (let i = 0; i < 20; i += 1) {
		t = (low + high) / 2;
		if (bezier(t, x1, x2) < x) low = t;
		else high = t;
	}
	return bezier(t, y1, y2);
}

function readY(element: HTMLElement): number {
	const value =
		element.style.transform || getComputedStyle(element).transform;
	if (!value || value === "none") return 0;
	const matrix = /matrix\(([^)]+)\)/.exec(value);
	return matrix ? Number.parseFloat(matrix[1].split(",")[5] ?? "0") || 0 : 0;
}

function clearLayoutStyles(): void {
	for (const id of ["main-grid", "banner-wrapper"]) {
		document.getElementById(id)?.style.removeProperty("transform");
	}
	ROOT.classList.remove(ENGINE, MOVING);
}

function endActive(preserveMoving = false, notify = !preserveMoving): void {
	if (!active) return;
	const move = active;
	active = null;
	if (move.frame) cancelAnimationFrame(move.frame);
	clearLayoutStyles();
	if (preserveMoving) ROOT.classList.add(MOVING);
	setScrollTweening(false);
	move.resolve();
	if (notify) ROOT.dispatchEvent(new Event(LAYOUT_MOVE_END));
}

export function cancelLayoutMove(): void {
	if (active) endActive();
	else {
		clearLayoutStyles();
		ROOT.dispatchEvent(new Event(LAYOUT_MOVE_END));
	}
}

function startLayout(
	options: LayoutMoveOptions,
	startGrid: number,
	startBanner: number,
): LayoutMoveHandle {
	const grid = document.getElementById("main-grid");
	const banner = document.getElementById("banner-wrapper");
	if (!grid || !banner) {
		options.onFlip();
		return { duration: 0, layout: true, finished: Promise.resolve() };
	}
	const gridEl = grid;
	const bannerEl = banner;
	const extend =
		Number.parseFloat(
			getComputedStyle(ROOT).getPropertyValue("--banner-height-extend"),
		) || 0;
	const gridEnd = options.toHome ? extend : 0;
	const bannerEnd = options.toHome ? extend : 0;
	ROOT.classList.add(ENGINE, MOVING);
	const t0 = performance.now();
	const apply = (progress: number): void => {
		const eased = slideEase(progress);
		const desired = options.startY * (1 - eased);
		window.scrollTo(0, desired);
		// Chrome stores scroll on whole CSS pixels; the fractional remainder
		// goes into the transform so the rendered edge follows `desired`.
		const residual = Math.round(desired) - desired;
		const gridY = startGrid + (gridEnd - startGrid) * eased;
		const bannerY = startBanner + (bannerEnd - startBanner) * eased;
		gridEl.style.transform = `translateY(${(gridY + residual).toFixed(3)}px)`;
		bannerEl.style.transform = `translateY(${(bannerY + residual).toFixed(3)}px)`;
	};
	apply(0);
	options.onFlip();

	const move: Active = { kind: "layout", frame: 0, resolve: () => {} };
	function step(now: number): void {
		if (active !== move) return;
		const progress = Math.min(1, (now - t0) / DURATION);
		apply(progress);
		if (progress < 1) {
			move.frame = requestAnimationFrame(step);
			return;
		}
		move.frame = 0;
		window.scrollTo(0, 0);
		gridEl.style.removeProperty("transform");
		bannerEl.style.removeProperty("transform");
		ROOT.classList.remove(ENGINE);
		endActive(true);
	}
	const finished = new Promise<void>((resolve) => {
		move.resolve = resolve;
		active = move;
		move.frame = requestAnimationFrame(step);
	});
	setScrollTweening(true);
	return { duration: DURATION, layout: true, finished };
}

function startScroll(options: LayoutMoveOptions): LayoutMoveHandle {
	const reduced = window.matchMedia?.(
		"(prefers-reduced-motion: reduce)",
	).matches;
	if (reduced || options.startY <= 1) {
		window.scrollTo(0, 0);
		options.onFlip();
		return { duration: 0, layout: false, finished: Promise.resolve() };
	}
	const duration = Math.min(
		700,
		Math.max(320, 320 + options.startY * 0.1),
	);
	let position = options.startY;
	let velocity = 0;
	window.scrollTo(0, position);
	options.onFlip();
	const move: Active = { kind: "scroll", frame: 0, resolve: () => {} };
	function step(): void {
		if (active !== move) return;
		velocity += -position * 0.04;
		velocity *= 0.7;
		position += velocity;
		window.scrollTo(0, position);
		if (position > 0) {
			move.frame = requestAnimationFrame(step);
			return;
		}
		move.frame = 0;
		window.scrollTo(0, 0);
		endActive();
	}
	const finished = new Promise<void>((resolve) => {
		move.resolve = resolve;
		active = move;
		move.frame = requestAnimationFrame(step);
	});
	setScrollTweening(true);
	return { duration, layout: false, finished };
}

export function runLayoutMove(options: LayoutMoveOptions): LayoutMoveHandle {
	const grid = document.getElementById("main-grid");
	const banner = document.getElementById("banner-wrapper");
	if (!grid || !banner) {
		options.onFlip();
		return { duration: 0, layout: options.layout, finished: Promise.resolve() };
	}
	// Capture rendered values once, before cancelling an interrupted move.
	const startGrid = readY(grid);
	const startBanner = readY(banner);
	if (active) endActive(false, false);
	return options.layout
		? startLayout(options, startGrid, startBanner)
		: startScroll(options);
}
