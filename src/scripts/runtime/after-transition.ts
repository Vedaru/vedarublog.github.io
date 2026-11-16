/**
 * Run work only after the layout glide has settled. The transition hooks own
 * the event; there is no CSS transition to listen for and no fallback timer.
 */
import { LAYOUT_SETTLED } from "./layout-events";

const ROOT = document.documentElement;

export function runAfterLayoutSettled(fn: () => void): void {
	if (!ROOT.classList.contains("is-layout-moving")) {
		fn();
		return;
	}
	ROOT.addEventListener(
		LAYOUT_SETTLED,
		() => {
			fn();
		},
		{ once: true },
	);
}
