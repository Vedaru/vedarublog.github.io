import { resetHomePreScrollState } from "./dom-state";
import { registerHomePreScrollListeners } from "./register-listeners";
import { shouldPreScrollBeforeLeave } from "./visit";

export function bootstrapHomePreScroll(): void {
	if (window.__homePreScrollBootstrapped) {
		return;
	}
	window.__homePreScrollBootstrapped = true;

	window.__shouldHomePreScroll = shouldPreScrollBeforeLeave;
	window.__resetHomePreScrollState = resetHomePreScrollState;

	window.onSwupReady?.(registerHomePreScrollListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			window.onSwupReady?.(registerHomePreScrollListeners);
		});
	}
}
