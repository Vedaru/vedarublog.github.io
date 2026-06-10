/** 浏览器端路由工具 — 与 src/utils/route-utils.ts 逻辑一致 */

(function () {
	if (window.__routeUtilsBootstrapped) return;
	window.__routeUtilsBootstrapped = true;

	function normalizePath(path) {
		return (path || "").replace(/^\/|\/$/g, "").toLowerCase();
	}

	function isHomePagePath(pathname) {
		return (
			pathname === "/" ||
			pathname === "" ||
			/^\/?\d+\/?$/.test(pathname)
		);
	}

	function resolveHomePageIndex(path) {
		const normalized = normalizePath(path);
		if (normalized === "") return 1;
		if (/^\d+$/.test(normalized)) {
			return Number.parseInt(normalized, 10);
		}
		return null;
	}

	function pathFromUrl(url) {
		try {
			return new URL(url, window.location.origin).pathname;
		} catch {
			return url || "";
		}
	}

	function pathsEqual(path1, path2) {
		const page1 = resolveHomePageIndex(path1);
		const page2 = resolveHomePageIndex(path2);
		if (page1 !== null && page2 !== null) {
			return page1 === page2;
		}
		return normalizePath(path1) === normalizePath(path2);
	}

	window.__normalizePath = normalizePath;
	window.__isHomePagePath = isHomePagePath;
	window.__resolveHomePageIndex = resolveHomePageIndex;
	window.__pathFromUrl = pathFromUrl;
	window.__pathsEqual = pathsEqual;
})();
