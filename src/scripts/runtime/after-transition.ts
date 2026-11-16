/**
 * Run work only after the layout glide has settled. The engine owns the end
 * event; there is no CSS transition to listen for and no fallback timer.
 */
import { LAYOUT_MOVE_END } from "./layout-engine";

const ROOT = document.documentElement;

export function runAfterLayoutSettled(fn: () => void): void {
	if (!ROOT.classList.contains("is-layout-moving")) {
		fn();
		return;
	}
	ROOT.addEventListener(
		LAYOUT_MOVE_END,
		() => {
			fn();
		},
		{ once: true },
	);
}
