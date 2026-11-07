/**
 * 项目页等需要立即加载 iconify-icon 的场景。
 *
 * 复用 widget 版加载器，避免维护第二套脚本注入 / 重试 / 预加载逻辑。
 */
import { IconifyLoader } from "../scripts/widgets/iconify-loader";

const iconLoader = new IconifyLoader({
	preloadIcons: [],
	timeout: 10000,
	retryCount: 3,
});

export const loadIconify = () => iconLoader.load();
export const preloadIcons = (icons: string[]) =>
	iconLoader.addToPreloadQueue(icons);
