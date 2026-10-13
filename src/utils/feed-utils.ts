import { getImage } from "astro:assets";
import type { APIContext, ImageMetadata } from "astro";
import MarkdownIt from "markdown-it";
import { parse as htmlParser } from "node-html-parser";
import sanitizeHtml from "sanitize-html";
import { defaultLocale, type Locale } from "@i18n/locales";
import { profileConfig, siteConfig } from "@/config";
import { getSortedPosts } from "@utils/content-utils";
import { initPostIdMap } from "@utils/permalink-utils";
import { getPostUrl } from "@utils/url-utils";

// 动态导入内容目录下的图片，用于把正文里的相对路径改写成构建产物路径。
const imagesGlob = import.meta.glob<{ default: ImageMetadata }>(
	"/src/content/**/*.{jpeg,jpg,png,gif,webp}",
);

const markdownParser = new MarkdownIt();

type PostsEntry = Awaited<ReturnType<typeof getSortedPosts>>[number];

/**
 * 取用于 feed 的文章列表（同一语言），排除加密文章与草稿。
 *
 * RSS 与 Atom 两种格式、以及中英两种语言，本来各自复制了一遍这段逻辑；
 * 现在统一在这里，端点只负责拼装各自的 XML。
 */
export async function getFeedPosts(
	locale: Locale = defaultLocale,
): Promise<PostsEntry[]> {
	const posts = (await getSortedPosts(locale)).filter(
		(post) => !post.data.encrypted && post.data.draft !== true,
	);

	initPostIdMap(posts);
	return posts;
}

/**
 * 把一篇文章的正文渲染成适合放进 feed 的 HTML：
 * 相对路径图片会被替换为构建后的绝对地址，输出经过 sanitize。
 */
export async function renderPostContent(
	post: PostsEntry,
	site: URL,
): Promise<string> {
	const body = markdownParser.render(String(post.body ?? ""));
	const html = htmlParser.parse(body);

	// 每张图片的处理互相独立，并发执行以缩短构建时间（顺序不影响结果）。
	await Promise.all(
		Array.from(html.querySelectorAll("img"), async (img) => {
			const src = img.getAttribute("src");
			if (!src) return;

			if (
				src.startsWith("./") ||
				src.startsWith("../") ||
				(!src.startsWith("http") && !src.startsWith("/"))
			) {
				const postDir = post.id.includes("/") ? post.id.split("/")[0] : "";
				let importPath: string | null = null;

				if (src.startsWith("./")) {
					const prefixRemoved = src.slice(2);
					importPath = postDir
						? `/src/content/posts/${postDir}/${prefixRemoved}`
						: `/src/content/posts/${prefixRemoved}`;
				} else if (src.startsWith("../")) {
					importPath = `/src/content/${src.replace(/^\.\.\//, "")}`;
				} else {
					importPath = postDir
						? `/src/content/posts/${postDir}/${src}`
						: `/src/content/posts/${src}`;
				}

				const imageMod = await imagesGlob[importPath]?.()?.then(
					(res) => res.default,
				);
				if (imageMod) {
					const optimizedImg = await getImage({ src: imageMod });
					img.setAttribute("src", new URL(optimizedImg.src, site).href);
				} else {
					console.log(
						`Failed to load image: ${importPath} for post: ${post.id}`,
					);
				}
			} else if (src.startsWith("/")) {
				img.setAttribute("src", new URL(src, site).href);
			}
		}),
	);

	return sanitizeHtml(html.toString(), {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
	});
}

export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * 生成 Atom feed。中英两种语言共用，只是文章集合与 self 链接不同。
 *
 * @param context  Astro 端点上下文
 * @param locale   取哪种语言的文章
 * @param selfPath 本 feed 相对站点根的路径，如 "atom.xml" 或 "en/atom.xml"
 */
export async function buildAtomFeed(
	context: APIContext,
	locale: Locale = defaultLocale,
	selfPath = "atom.xml",
): Promise<Response> {
	if (!context.site) throw new Error("site not set");

	const posts = await getFeedPosts(locale);
	const site = context.site;

	// 各篇文章的正文渲染互相独立，并发处理以缩短构建时间。
	const contents = await Promise.all(
		posts.map((post) => renderPostContent(post, site)),
	);

	let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.title)}</title>
  <subtitle>${escapeXml(siteConfig.subtitle || "No description")}</subtitle>
  <link href="${site.href}" rel="alternate" type="text/html"/>
  <link href="${new URL(selfPath, site).href}" rel="self" type="application/atom+xml"/>
  <id>${site.href}</id>
  <updated>${new Date().toISOString()}</updated>
  <language>${locale === defaultLocale ? siteConfig.lang : locale}</language>`;

	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];
		const postUrl = new URL(getPostUrl(post), site).href;
		const content = contents[i];

		atomFeed += `
  <entry>
    <title>${escapeXml(post.data.title)}</title>
    <link href="${postUrl}" rel="alternate" type="text/html"/>
    <id>${postUrl}</id>
    <published>${post.data.published.toISOString()}</published>
    <updated>${(post.data.updated ?? post.data.published).toISOString()}</updated>
    <summary>${escapeXml(post.data.description || "")}</summary>
    <content type="html"><![CDATA[${content}]]></content>
    <author>
      <name>${escapeXml(profileConfig.name)}</name>
    </author>`;

		if (post.data.category) {
			atomFeed += `
    <category term="${escapeXml(post.data.category)}"></category>`;
		}

		atomFeed += `
  </entry>`;
	}

	atomFeed += `
</feed>`;

	return new Response(atomFeed, {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	});
}
