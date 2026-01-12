// Desktop Window 打开工具函数
export function openDesktopWindow(config: {
	id: string;
	title: string;
	component: string;
	width?: number;
	height?: number;
}) {
	const event = new CustomEvent('open-desktop-window', {
		detail: config,
		bubbles: true
	});
	window.dispatchEvent(event);
}

// 全局导出，方便在 HTML 中使用
if (typeof window !== 'undefined') {
	(window as any).openDesktopWindow = openDesktopWindow;
}
