import type { APIRoute } from "astro";

/**
 * `/sitemap.xml` 别名。
 *
 * @astrojs/sitemap 生成的规范文件名是 `sitemap-index.xml`（索引）+
 * `sitemap-0.xml`（实际 URL 列表），并不存在 `/sitemap.xml`。但 Google
 * Search Console、Bing Webmaster 以及几乎所有“sitemap 校验”工具默认都
 * 从 `/sitemap.xml` 取，导致在 GSC 里提交后会报 “Couldn't fetch”（404），
 * 看起来就像 sitemap 加载失败。
 *
 * 这里在约定俗成的路径上返回同一份 sitemap 索引，内容与
 * sitemap-index.xml 一致。站点只有 sitemap-0.xml 一个子图（19 个 URL，
 * 远低于 50000 上限）；若将来 URL 数超限被拆分，需要同步更新下面的
 * 子图列表，或改用其它生成方式。
 */
const SUB_SITEMAPS = ["sitemap-0.xml"];

export const GET: APIRoute = () => {
	const site = import.meta.env.SITE;
	const entries = SUB_SITEMAPS.map(
		(name) => `<sitemap><loc>${new URL(name, site).href}</loc></sitemap>`,
	).join("");

	const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
};
