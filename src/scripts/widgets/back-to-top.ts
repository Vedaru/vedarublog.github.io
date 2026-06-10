export function initBackToTop(): void {
	window.backToTop = function backToTop(): void {
		if (typeof window.__smoothScrollToTop === "function") {
			window.__smoothScrollToTop(650);
			return;
		}
		window.scroll({ top: 0, behavior: "smooth" });
	};
}

initBackToTop();
