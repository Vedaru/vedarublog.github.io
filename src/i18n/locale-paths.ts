/**
 * 语言路径的纯计算。
 *
 * 这里刻意不 import 任何 Astro / 内容集合的东西：语言切换器要在**点击时**
 * 才解析目标地址（导航栏由 swup 之外，换页时不会重建，构建期算好的 href
 * 会过期），所以同一段逻辑必须同时能跑在构建期和浏览器里。放在这里，就
 * 只有一份实现。
 */

export interface LocaleCoverage {
	/** 各语言的路径前缀：{ zh: "/zh", en: "/en" } */
	prefixes: Record<string, string>;
	/** 只存在于一种语言的路径（canonical，已去前缀）→ 拥有它的语言 */
	oneSided: Record<string, string>;
	/** 语言 → <html lang> 的值（客户端换页后要同步） */
	htmlLang?: Record<string, string>;
}

/** 拼前缀：joinLocalePath("/posts/a/", "/en") -> "/en/posts/a/" */
export function joinLocalePath(path: string, prefix: string): string {
	const clean = path.startsWith("/") ? path : `/${path}`;
	if (!prefix) return clean;
	return clean === "/" ? `${prefix}/` : `${prefix}${clean}`;
}

/** 去掉语言前缀：stripLocalePath("/en/2/", {en:"/en"}) -> "/2/" */
export function stripLocalePath(
	pathname: string,
	prefixes: Record<string, string>,
): string {
	for (const prefix of Object.values(prefixes)) {
		if (!prefix) continue;
		if (pathname === prefix) return "/";
		if (pathname.startsWith(`${prefix}/`)) {
			const rest = pathname.slice(prefix.length + 1);
			return rest.startsWith("/") ? rest : `/${rest}`;
		}
	}
	return pathname;
}

/**
 * 切换到 `target` 语言后应去的地址。
 *
 * 该页面在目标语言下不存在时（中文独占的文章、只有中文的 /rss/ 等），
 * 退回目标语言首页 —— 否则切换就是把人送进 404。
 */
export function resolveAlternatePath(
	pathname: string,
	target: string,
	coverage: LocaleCoverage,
): string {
	const prefix = coverage.prefixes[target] ?? "";
	const canonical = stripLocalePath(pathname, coverage.prefixes);
	// 404 是站点级页面（/404.html），不存在「另一种语言的 404」，回首页
	if (canonical.startsWith("/404")) return joinLocalePath("/", prefix);
	const owner = coverage.oneSided[canonical];
	if (owner && owner !== target) return joinLocalePath("/", prefix);
	return joinLocalePath(canonical, prefix);
}
