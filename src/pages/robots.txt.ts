import type { APIRoute } from "astro";

const robotsTxt = `
User-agent: *
Disallow: /
Allow: /$
Allow: /posts/
Allow: /en/
Allow: /en/posts/
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
