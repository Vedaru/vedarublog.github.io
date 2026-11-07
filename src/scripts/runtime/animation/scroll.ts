/** Scroll primitive shared by shell scripts. */
export function getScrollY(): number {
	return (
		window.scrollY ||
		document.documentElement.scrollTop ||
		document.body.scrollTop ||
		0
	);
}
