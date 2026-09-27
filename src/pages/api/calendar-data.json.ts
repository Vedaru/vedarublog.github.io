import { getSortedPosts } from "../../utils/content-utils";
import { getPostUrl } from "../../utils/url-utils";

export async function GET() {
	const posts = await getSortedPosts();

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
		headers: {
			"Content-Type": "application/json",
		},
	});
}
