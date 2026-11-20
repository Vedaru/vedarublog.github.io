/**
 * Whether the page-transition scroll tween currently owns the scroll position.
 *
 * Kept in module state rather than as a class on <html>: a class there forces
 * a style recalculation over the whole document on both flips, which on a long
 * post is hundreds of milliseconds of the transition budget. Only our own
 * scripts care about this, so they can ask here.
 */

let tweening = false;
const listeners = new Set<() => void>();

export function isScrollTweening(): boolean {
	return tweening;
}

export function setScrollTweening(on: boolean): void {
	if (tweening === on) return;
	tweening = on;
	if (!on) {
		for (const listener of listeners) listener();
	}
}

/** Run `callback` once the tween ends (immediately if none is running). */
export function onScrollTweenEnd(callback: () => void): () => void {
	listeners.add(callback);
	return () => listeners.delete(callback);
}
