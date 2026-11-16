/**
 * Run work only after the 700ms banner/grid glide has settled.
 *
 * Swup's `animation:in:end` fires when the 200ms content fade finishes, which
 * is still in the middle of Fuwari's 700ms layout transform. Heavy widget and
 * third-party bootstrapping has to wait for the transform or it steals frames
 * from the compositor (and from the user's next click).
 */
export function runAfterLayoutSettled(fn: () => void, timeoutMs = 900): void {
	if (!document.documentElement.classList.contains("is-layout-moving")) {
		fn();
		return;
	}

	let done = false;
	const column = document.getElementById("content-column");

	// The content column only transitions when the page changes between home and a
	// content page. Listen for that exact transition; otherwise fall back to a
	// timer that covers the full 700ms glide.
	const onTransitionEnd = (event: TransitionEvent) => {
		if (event.target === column && event.propertyName === "transform") {
			finish();
		}
	};

	const timer = window.setTimeout(finish, timeoutMs);

	function cleanup() {
		column?.removeEventListener("transitionend", onTransitionEnd);
		window.clearTimeout(timer);
	}

	function finish() {
		if (done) return;
		done = true;
		cleanup();
		fn();
	}

	column?.addEventListener("transitionend", onTransitionEnd);
}
