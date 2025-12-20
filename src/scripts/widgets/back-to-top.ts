export function initBackToTop(): void {
	window.backToTop = function backToTop(): void {
		window.scroll({ top: 0 });
	};
}

initBackToTop();
