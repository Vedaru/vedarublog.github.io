/**
 * Page-move engine. Owned properties:
 * - window scrollTop while a move runs
 * - #main-grid transform (layout slides + sub-pixel scroll remainder)
 * - #banner-wrapper transform (layout slides + sub-pixel scroll remainder)
 * Not owned: sidebar top (CSS), banner crop top (CSS), opacity/fades.
 *
 * One rAF handle; one scroll write per frame; one read phase at the start.
 */
import { setScrollTweening } from "./motion-state";

const MOVE_DURATION_MS = 700;
const EASE = [0.4, 0, 0.2, 1] as const;
const ENGINE_CLASS = "is-layout-engine";
const MOVING_CLASS = "is-layout-moving";

// One source for the duration and easing consumed by CSS transitions.
document.documentElement.style.setProperty(
	"--layout-slide-duration",
	`${MOVE_DURATION_MS}ms`,
);
document.documentElement.style.setProperty(
	"--layout-slide-ease",
	`cubic-bezier(${EASE.join(",")})`,
);

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

type MoveKind = "layout" | "scroll";

interface ActiveMove {
	kind: MoveKind;
	frame: number;
	resolve: (() => void) | null;
}

let active: ActiveMove | null = null;

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

function parseY(value: string): number {
	if (!value || value === "none") return 0;
	const matrix = /matrix\(([^)]+)\)/.exec(value);
	return matrix ? Number.parseFloat(matrix[1].split(",")[5] ?? "0") || 0 : 0;
}

function readY(element: HTMLElement): number {
	const inline = element.style.getPropertyValue("transform");
	return inline
		? parseY(inline)
		: parseY(getComputedStyle(element).transform);
}

function clearLayoutStyles(): void {
	for (const id of ["main-grid", "banner-wrapper"]) {
		document.getElementById(id)?.style.removeProperty("transform");
	}
	document.documentElement.classList.remove(ENGINE_CLASS, MOVING_CLASS);
}

function endActive(preserveMovingClass = false): void {
	if (!active) return;
	const move = active;
	active = null;
	if (move.frame) cancelAnimationFrame(move.frame);
	clearLayoutStyles();
	if (preserveMovingClass) {
		document.documentElement.classList.add(MOVING_CLASS);
	}
	setScrollTweening(false);
	move.resolve?.();
	move.resolve = null;
}

export function cancelLayoutMove(): void {
	endActive();
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
			getComputedStyle(document.documentElement).getPropertyValue(
				"--banner-height-extend",
			),
		) || 0;
	// Absolute targets keep an interrupted move continuous regardless of the
	// class it was heading to.
	const gridEnd = options.toHome ? extend : 0;
	const bannerEnd = options.toHome ? extend : 0;

	document.documentElement.classList.add(ENGINE_CLASS, MOVING_CLASS);
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

	let move: ActiveMove;
	const finished = new Promise<void>((resolve) => {
		move = { kind: "layout", frame: 0, resolve };
		active = move;
		startFrame();
	});
	function startFrame(): void {
		const step = (now: number) => {
			if (active !== move) return;
			const progress = Math.min(1, (now - t0) / MOVE_DURATION_MS);
			apply(progress);
			if (progress < 1) {
				move.frame = requestAnimationFrame(step);
				return;
			}
			move.frame = 0;
			window.scrollTo(0, 0);
			gridEl.style.removeProperty("transform");
			bannerEl.style.removeProperty("transform");
			document.documentElement.classList.remove(ENGINE_CLASS);
			endActive(true);
		};
		move.frame = requestAnimationFrame(step);
	}
	setScrollTweening(true);
	return { duration: MOVE_DURATION_MS, layout: true, finished };
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
	const finished = new Promise<void>((resolve) => {
		const move: ActiveMove = { kind: "scroll", frame: 0, resolve };
		active = move;
		const step = () => {
			if (active !== move) return;
			const delta = -position;
			velocity += delta * 0.04;
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
		};
		move.frame = requestAnimationFrame(step);
		setScrollTweening(true);
	});
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
	if (active) endActive();

	return options.layout
		? startLayout(options, startGrid, startBanner)
		: startScroll(options);
}
