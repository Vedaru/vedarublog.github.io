import type { CollectionEntry } from "astro:content";
import { defaultLocale, type Locale } from "@i18n/locales";
import { permalinkConfig } from "../config";
import { removeFileExtension } from "./url-utils";

/**
 * 文章 ID 映射缓存（用于存储按时间排序后的文章序号）。
 *
 * 按语言分开存：中英两套文章各自从 1 开始编号。之前是一张全局表，先被
 * 哪种语言初始化就锁定成那套顺序，于是英文文章的 %post_id% 会沿用中文编号。
 */
const postIdMaps = new Map<string, Map<string, number>>();

/** 从 content collection id 推断语言（与 content-utils 的 postLocale 一致） */
function localeOfPostId(id: string): Locale {
	return /\.en$/.test(removeFileExtension(id)) ? "en" : defaultLocale;
}

function mapFor(locale: Locale): Map<string, number> {
	let map = postIdMaps.get(locale);
	if (!map) {
		map = new Map();
		postIdMaps.set(locale, map);
	}
	return map;
}

/**
 * 初始化文章 ID 映射
 * 按发布时间升序排列（最早的文章 id = 1），草稿文章不参与计算
 * @param posts 同一语言的全部非草稿文章
 * @param locale 语言；省略时按第一篇的 id 推断
 */
export function initPostIdMap(
	posts: CollectionEntry<"posts">[],
	locale: Locale = localeOfPostId(posts[0]?.id ?? ""),
): Map<string, number> {
	const map = mapFor(locale);
	if (map.size > 0) {
		return map;
	}

	// 按发布时间升序排序（最早的在前）
	const sortedPosts = [...posts].sort(
		(a, b) => a.data.published.getTime() - b.data.published.getTime(),
	);

	sortedPosts.forEach((post, index) => {
		// id 从 1 开始
		map.set(post.id, index + 1);
	});

	return map;
}

/**
 * 获取文章的序号 ID
 * @param postId 文章的 content collection id
 * @returns 文章序号，如果未初始化则返回 0
 */
function getPostNumericId(postId: string): number {
	const map = postIdMaps.get(localeOfPostId(postId));
	if (!map || map.size === 0) {
		// 在客户端或未初始化时返回 0，使用默认 slug
		console.warn("Post ID map not initialized. Returning 0 for post_id.");
		return 0;
	}
	return map.get(postId) ?? 0;
}

/**
 * 生成 permalink slug
 * 根据配置的格式模板和文章数据生成 URL slug
 * @param post 文章数据
 * @returns 生成的 slug（不包含 /posts/ 前缀）
 */
export function generatePermalinkSlug(post: CollectionEntry<"posts">): string {
	// 如果文章有自定义 permalink，优先使用（不在 /posts/ 下）
	if (post.data.permalink) {
		// 移除开头和结尾的斜杠
		return post.data.permalink.replace(/^\/+/, "").replace(/\/+$/, "");
	}

	// 如果全局 permalink 功能未启用，使用默认 slug
	if (!permalinkConfig.enable) {
		// 如果有 alias，使用 alias
		if (post.data.alias) {
			return post.data.alias.replace(/^\/+/, "").replace(/\/+$/, "");
		}
		// 否则使用文件名
		return removeFileExtension(post.id);
	}

	// 使用全局 permalink 格式模板
	let format = permalinkConfig.format;

	// 验证格式不包含斜杠
	if (format.includes("/")) {
		console.warn(
			"Permalink format contains '/' which is not supported. Removing slashes.",
		);
		format = format.replace(/\//g, "-");
	}

	const published = post.data.published;
	const postname = removeFileExtension(post.id);
	const category = post.data.category || "uncategorized";

	// 替换占位符
	const slug = format
		.replace(/%year%/g, published.getFullYear().toString())
		.replace(
			/%monthnum%/g,
			(published.getMonth() + 1).toString().padStart(2, "0"),
		)
		.replace(/%day%/g, published.getDate().toString().padStart(2, "0"))
		.replace(/%hour%/g, published.getHours().toString().padStart(2, "0"))
		.replace(
			/%minute%/g,
			published.getMinutes().toString().padStart(2, "0"),
		)
		.replace(
			/%second%/g,
			published.getSeconds().toString().padStart(2, "0"),
		)
		.replace(/%post_id%/g, getPostNumericId(post.id).toString())
		.replace(/%postname%/g, postname)
		.replace(/%category%/g, category);

	return slug;
}

/**
 * 判断文章是否使用自定义 permalink（根目录下，不在 /posts/ 下）
 * @param post 文章数据
 */
export function hasCustomPermalink(
	post: CollectionEntry<"posts"> | { data: { permalink?: string } },
): boolean {
	return !!post.data.permalink;
}
