export const LAYOUT_SETTLED = "layout-settled";

export function notifyLayoutSettled(): void {
	document.documentElement.dispatchEvent(new Event(LAYOUT_SETTLED));
}
