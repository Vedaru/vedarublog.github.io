/**
 * Fuwari scroll spring for non-layout visits. Layout transforms are pure CSS;
 * the layout path freezes scroll and commits it once, so this module never
 * writes a transform.
 */
import { setScrollTweening } from "./motion-state";

let frame = 0;

export function cancelScrollToTop(): void {
	if (frame) cancelAnimationFrame(frame);
	frame = 0;
	setScrollTweening(false);
}

/** Fuwari's scrl spring: update velocity, render one float scrollTo per frame. */
export function startScrollToTop(startY: number): number {
	cancelScrollToTop();
	if (startY <= 1) return 0;
	if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
		window.scrollTo(0, 0);
		return 0;
	}
	const duration = Math.min(700, Math.max(320, 320 + startY * 0.1));
	let position = startY;
	let velocity = 0;
	window.scrollTo(0, position);
	setScrollTweening(true);

	const step = () => {
		velocity += -position * 0.04;
		velocity *= 0.7;
		position += velocity;
		window.scrollTo(0, position);
		if (position > 0) {
			frame = requestAnimationFrame(step);
			return;
		}
		frame = 0;
		window.scrollTo(0, 0);
		setScrollTweening(false);
	};
	frame = requestAnimationFrame(step);
	return duration;
}
