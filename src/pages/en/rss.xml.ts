/**
 * 英文 RSS feed（/en/rss.xml）。
 *
 * 与中文 feed 共用 feed-utils 里的取文与正文渲染逻辑，只是文章集合换成
 * 英文、语言标签换成 en；条目链接本身已带 /en/ 前缀（见 getPostUrl）。
 */
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
	const posts = await getFeedPosts("en");

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
		title: `${siteConfig.title} (English)`,
		description: siteConfig.subtitle || "No description",
		site,
		items,
		customData: `<language>en</language>`,
	});
}
