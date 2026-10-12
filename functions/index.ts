/**
 * Cloudflare Pages Function：根路径直接 302 到对应语言。
 *
 * 语言本身在 URL 里（/zh/ 与 /en/），根路径只负责把访客送到该去的一边。
 * 这一步放在边缘做，就不会先给访客看一个"正在跳转"的页面：请求 / 直接
 * 得到 302，浏览器落到最终地址。
 *
 * 判断顺序：上次选择的 cookie → Accept-Language → 默认中文。
 * 只处理根路径，且只处理 GET/HEAD；其余路径不经过这里（这是 index.ts 而
 * 不是 _middleware.ts，其它路由没有额外开销）。
 *
 * 没有这个 Function 时（例如 GitHub Pages 直连）由 src/pages/index.astro
 * 兜底，同样只做跳转、不再显示任何内容。
 */
const DEFAULT_LOCALE = "zh";
const COOKIE = "vedaru_lang";

function readCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : null;
}

/** 浏览器语言里第一个能对上的语言 */
function localeFromAcceptLanguage(header: string | null): string | null {
	if (!header) return null;
	for (const part of header.split(",")) {
		const tag = part.split(";")[0].trim().toLowerCase();
		if (tag.startsWith("zh")) return "zh";
		if (tag.startsWith("en")) return "en";
	}
	return null;
}

export async function onRequest(context: any): Promise<Response> {
	const { request, next } = context;
	const url = new URL(request.url);

	if (url.pathname !== "/") return next();
	if (request.method !== "GET" && request.method !== "HEAD") return next();

	const locale =
		readCookie(request.headers.get("Cookie"), COOKIE) ??
		localeFromAcceptLanguage(request.headers.get("Accept-Language")) ??
		DEFAULT_LOCALE;
	const target = locale === "en" ? "/en/" : "/zh/";

	return Response.redirect(new URL(target, url).toString(), 302);
}
