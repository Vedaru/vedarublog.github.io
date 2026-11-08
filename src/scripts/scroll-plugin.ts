/**
 * Mount Swup's scroll plugin ourselves so the between-page position is
 * committed immediately, while same-page anchors keep a smooth scroll.
 * The integration is configured with `smoothScrolling: false`, so this is the
 * only scroll plugin on the instance.
 */
import SwupScrollPlugin from "@swup/astro/client/SwupScrollPlugin";

let mounted = false;

function mountSlowScroll(): boolean {
	if (mounted) return true;
	const swup = window.swup;
	if (!swup?.use) return false;
	// If the integration already mounted its own scroll plugin (for example
	// when `smoothScrolling` is flipped back on), do not stack a second one.
	if (swup.findPlugin?.("SwupScrollPlugin")) {
		mounted = true;
		return true;
	}
	mounted = true;
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	swup.use(
		new SwupScrollPlugin({
			// Swup's scroll animation is JavaScript, so the reduced-motion
			// CSS does not stop it. Disable it explicitly for those users.
			animateScroll: {
				// A between-page scroll tween would run at the same time as
				// the banner/grid transform. Commit that position instead;
				// the transform is the only motion during a page change.
				betweenPages: false,
				samePageWithHash: !reduceMotion,
				samePage: !reduceMotion,
			},
			// Only used by same-page anchors now.
			scrollFriction: 0.3,
			scrollAcceleration: 0.04,
		}),
	);
	return true;
}

if (!mountSlowScroll()) {
	document.addEventListener(
		"swup:enable",
		() => {
			mountSlowScroll();
		},
		{ once: true },
	);
	// Last resort for a module that ran after the event but before the swup
	// instance exposed `use` (or for an unusual integration load order).
	window.addEventListener("load", () => mountSlowScroll(), { once: true });
}
