import type { APIRoute } from "astro";

/**
 * robots.txt
 *
 * 语言在 URL 里：/zh/ 与 /en/ 各占一个前缀，两边都放行。根路径只是语言入口
 * （noindex 的跳转页），除此之外一律不许抓，避免爬虫把构建产物、脚本等当内容。
 */
const robotsTxt = `
User-agent: *
Disallow: /
Allow: /zh/
Allow: /en/
# 不要拦 sitemap 自身：Google 对 sitemap 是豁免 robots 的，但 Bing/校验工具
# 会遵守，被 Disallow 时直接拒绝抓取，表现为 “sitemap 加载失败”。
Allow: /sitemap-index.xml
Allow: /sitemap.xml
Allow: /sitemap-0.xml

Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
