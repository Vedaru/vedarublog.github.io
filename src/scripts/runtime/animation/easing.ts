/** Shared easing functions for JS-driven animations. */

export function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
