/**
 * 路由路径工具 — SSR/CSR 统一的首页判断与路径比较
 */

/** 标准化路径：去首尾斜杠并转小写 */
export function normalizePath(path: string): string {
	return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
}

/** 是否为首页路径（含分页首页 /2/） */
export function isHomePagePath(pathname: string): boolean {
	return (
		pathname === "/" ||
		pathname === "" ||
		/^\/?\d+\/?$/.test(pathname)
	);
}

/** 是否为主界面（仅第 1 页 /）；分页 /2/ 等与文章页共用非主界面布局 */
export function isMainHomePage(pathname: string): boolean {
	return resolveHomePageIndex(pathname) === 1;
}

/** 解析分页首页页码；非首页路径返回 null */
export function resolveHomePageIndex(path: string): number | null {
	const normalized = normalizePath(path);
	if (normalized === "") return 1;
	if (/^\d+$/.test(normalized)) {
		return Number.parseInt(normalized, 10);
	}
	return null;
}

/** 从 URL 字符串提取 pathname */
export function pathFromUrl(url: string): string {
	if (typeof window === "undefined") {
		try {
			return new URL(url, "http://localhost").pathname;
		} catch {
			return url || "";
		}
	}
	try {
		return new URL(url, window.location.origin).pathname;
	} catch {
		return url || "";
	}
}

/** 比较两条路径是否指向同一页面（含分页首页） */
export function pathsEqual(path1: string, path2: string): boolean {
	const page1 = resolveHomePageIndex(path1);
	const page2 = resolveHomePageIndex(path2);
	if (page1 !== null && page2 !== null) {
		return page1 === page2;
	}
	return normalizePath(path1) === normalizePath(path2);
}

/** 是否为同页导航（含分页首页等价） */
export function isSamePageNavigation(
	fromPathname: string,
	toUrl: string,
): boolean {
	const toPathname = pathFromUrl(toUrl);
	if (fromPathname === toPathname) {
		return true;
	}
	return pathsEqual(fromPathname, toUrl);
}

/** 获取当前页面路径（浏览器环境） */
export function getCurrentPath(): string {
	return typeof window !== "undefined" ? window.location.pathname : "";
}

/** 检查是否为首页（浏览器环境） */
export function isHomePage(): boolean {
	return isHomePagePath(getCurrentPath());
}
