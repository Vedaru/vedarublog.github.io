import type { APIRoute, GetStaticPaths } from "astro";
import { defaultLocale, locales, type Locale } from "@i18n/locales";
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrl } from "@utils/url-utils";

/**
 * 日历 widget 的文章数据，按语言各生成一份（/api/zh/… 与 /api/en/…）。
 *
 * 以前只有一个不带语言的端点，而且用的是默认语言 —— 英文页面的日历里
 * 显示的是中文文章，点进去跑到中文页面，看起来就是"widget 和文章不是同
 * 一种语言"。现在由页面把语言交给脚本，脚本取对应语言的那一份。
 */
export const getStaticPaths: GetStaticPaths = () =>
	locales.map((lang) => ({ params: { lang } }));

export const GET: APIRoute = async ({ params }) => {
	const locale = (params.lang as Locale) ?? defaultLocale;
	const posts = await getSortedPosts(locale);

	const allPostsData = posts.map((post) => {
		const date = new Date(post.data.published);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return {
			id: post.id,
			title: post.data.title,
			date: `${year}-${month}-${day}`,
			// Astro v5 的 post.id 带 .md 扩展名，直接拼 /posts/${id}/ 会 404。
			// 由服务端统一解析出与页面路由一致的地址（含 permalink/alias 处理）。
			url: getPostUrl(post),
		};
	});

	return new Response(JSON.stringify(allPostsData), {
		headers: { "Content-Type": "application/json" },
	});
};
