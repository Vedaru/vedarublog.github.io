export function initBackToTop(): void {
	window.backToTop = function backToTop(): void {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};
}

initBackToTop();
