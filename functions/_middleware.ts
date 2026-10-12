/**
 * Cloudflare Pages Function：让中英文共用同一个 URL。
 *
 * 语言不再是 URL 的一部分，而是 cookie（vedaru_lang）里的「模式」，
 * 由边缘按 cookie 决定返回哪份内容，地址栏不变：
 *
 *   GET /posts/vocaloid/  +  Cookie: vedaru_lang=en
 *   -> 内部取 /en/posts/vocaloid/ 的内容，URL 仍是 /posts/vocaloid/
 *
 * 只对确实存在英文版本的页面重写，否则原样返回（例如只有中文的 /rss/）。
 * 响应带 Vary: Cookie，避免 CDN 把中文版本缓存后发给英语读者。
 *
 * 没有这个 Function（例如直接托管在 GitHub Pages）时，站点仍可用：客户端
 * 会退回带 /en 前缀的地址（见 src/scripts/language-mode.ts）。
 */
import { getLocaleFromPath } from "../src/i18n/locales";

const COOKIE = "vedaru_lang";

function readCookie(header: string | null, name: string): string | null {
	if (!header) return null;
	const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : null;
}

export const onRequest: PagesFunction = async (context) => {
	const { request, next } = context;
	const mode = readCookie(request.headers.get("Cookie"), COOKIE);
	if (mode !== "en") return next();

	const url = new URL(request.url);
	// 已经是英文路径（或直接访问 /en/），不需要重写
	if (getLocaleFromPath(url.pathname) === "en") return next();

	const englishUrl = new URL(url);
	englishUrl.pathname = `/en${url.pathname}`;

	const response = await context.env.ASSETS.fetch(new Request(englishUrl, request));
	if (!response.ok) return next();

	const headers = new Headers(response.headers);
	headers.set("Vary", "Cookie");
	// 同一个 URL 会因 cookie 不同而内容不同，交给 Cloudflare 按 Vary 缓存
	headers.delete("Content-Length");

	return new Response(response.body, { status: 200, headers });
};
