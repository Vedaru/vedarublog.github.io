import type { RSSFeedItem } from "@astrojs/rss";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";
import { getFeedPosts, renderPostContent } from "@/utils/feed-utils";
import { getPostUrl } from "@/utils/url-utils";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	const site = context.site;
	const posts = await getFeedPosts();

	// 各条目互相独立，并发渲染正文（保持原顺序）。
	const items: RSSFeedItem[] = await Promise.all(
		posts.map(async (post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.published,
			link: getPostUrl(post),
			content: await renderPostContent(post, site),
		})),
	);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site,
		items,
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
