/**
 * Mount Swup's scroll plugin ourselves so the reset starts after the content
 * swap (the plugin's `content:scroll` hook) with Fuwari's physics. The
 * integration is configured with `smoothScrolling: false`, so this is the only
 * scroll plugin on the instance.
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
				betweenPages: !reduceMotion,
				samePageWithHash: !reduceMotion,
				samePage: !reduceMotion,
			},
			// Fuwari's timing. The scroll now starts after the swap (the old
			// page no longer moves during its fade-out), so it can stay quick
			// without looking interrupted.
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
