import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { defaultLocale, localePrefix, type Locale } from "@i18n/locales";
import {
	getCategoryUrl,
	getPostUrl,
	removeFileExtension,
} from "@utils/url-utils";
import { initPostIdMap } from "@utils/permalink-utils";

type PostsEntry = CollectionEntry<"posts">;

/**
 * 文章所属语言。
 *
 * 以文件名为准：中英两版放在同一目录，中文文件带 .zh 后缀，英文带 .en 后缀
 * （如 thoughts.zh.md / thoughts.en.md），这样一对文件就在一起，好对照好维护。
 */
export function postLocale(post: PostsEntry): Locale {
	return isEnglishId(post.id) ? "en" : defaultLocale;
}

/** 去掉扩展名与语言后缀后的 slug，用于 URL 与路由参数。 */
export function postSlug(post: { id: string }): string {
	return removeFileExtension(post.id).replace(LOCALE_SUFFIX, "");
}

/** 文件名里的语言后缀（已去掉扩展名后判断）。 */
const LOCALE_SUFFIX = /\.(en|zh)$/;

function isEnglishId(id: string): boolean {
	return /\.en$/.test(removeFileExtension(id));
}

// 每个 Astro 渲染进程内只查询一次内容集合，避免同一页面的多个组件
// （SiteStats / TagList / CategoryList / 归档等）重复触发 getCollection。
// 双语站点下按语言分别缓存。
const publishedPostsPromises = new Map<Locale, Promise<PostsEntry[]>>();

function getPublishedPosts(
	locale: Locale = defaultLocale,
): Promise<PostsEntry[]> {
	let cached = publishedPostsPromises.get(locale);
	if (!cached) {
		cached = getCollection("posts", ({ id, data }) => {
			if (import.meta.env.PROD && data.draft === true) return false;
			return (isEnglishId(id) ? "en" : defaultLocale) === locale;
		});
		publishedPostsPromises.set(locale, cached);
	}
	return cached;
}

const rawSortedPostsPromises = new Map<Locale, Promise<PostsEntry[]>>();

// Retrieve posts and sort them by publication date
async function getRawSortedPosts(
	locale: Locale = defaultLocale,
): Promise<PostsEntry[]> {
	let cached = rawSortedPostsPromises.get(locale);
	if (!cached) {
		cached = getPublishedPosts(locale).then((allBlogPosts) =>
			// 复制后再排序，避免改动 getPublishedPosts 共享的原始数组
			[...allBlogPosts].sort((a, b) => {
				// 首先按置顶状态排序，置顶文章在前
				if (a.data.pinned && !b.data.pinned) return -1;
				if (!a.data.pinned && b.data.pinned) return 1;

				// 如果置顶状态相同，优先按 Priority 排序（数值越小越靠前）
				if (a.data.pinned && b.data.pinned) {
					const priorityA = a.data.priority;
					const priorityB = b.data.priority;
					if (priorityA !== undefined && priorityB !== undefined) {
						if (priorityA !== priorityB) return priorityA - priorityB;
					} else if (priorityA !== undefined) {
						return -1;
					} else if (priorityB !== undefined) {
						return 1;
					}
				}

				// 否则按发布日期排序
				const dateA = new Date(a.data.published);
				const dateB = new Date(b.data.published);
				return dateA > dateB ? -1 : 1;
			}),
		);
		rawSortedPostsPromises.set(locale, cached);
	}
	return cached;
}

export async function getSortedPosts(locale: Locale) {
	const sorted = await getRawSortedPosts(locale);

	for (let i = 1; i < sorted.length; i++) {
		// 用 postSlug 而不是原始 id：英文文件名带 .en 后缀，直接拼进 URL
		// 会变成 /en/posts/vocaloid.en/。
		sorted[i].data.nextSlug = postSlug(sorted[i - 1]);
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = postSlug(sorted[i + 1]);
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
	url?: string; // 预计算的文章 URL
};
export async function getSortedPostsList(
	locale: Locale,
): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts(locale);

	// 初始化文章 ID 映射（用于 permalink 功能）
	initPostIdMap(sortedFullPosts);

	// delete post.body，并预计算 URL
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
		url: getPostUrl(post),
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(
	locale: Locale,
): Promise<Tag[]> {
	const allBlogPosts = await getPublishedPosts(locale);

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(
	locale: Locale,
): Promise<Category[]> {
	const allBlogPosts = await getPublishedPosts(locale);
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			// 故意不传页面语言：这是数据层的“未分类”桶名，用作聚合 key。
			// 若跟随页面语言，同一篇文章在两种语言下会被归到不同的桶里。
			// 展示层需要本地化时再单独翻译这个 label。
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c, localePrefix(locale)),
		});
	}
	return ret;
}

// 统计全站字数。结果只依赖文章正文，与排序/置顶无关，
// 因此按原始（未排序）集合计算一次并缓存，避免每个页面的 SiteStats 组件重复扫描全部正文。
const totalWordCountPromises = new Map<Locale, Promise<number>>();

const CJK_PATTERN =
	/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/g;

export function getTotalWordCount(
	locale: Locale,
): Promise<number> {
	let cached = totalWordCountPromises.get(locale);
	if (!cached) {
		cached = getPublishedPosts(locale).then((posts) => {
			let total = 0;
			for (const post of posts) {
				const body = post.body;
				if (!body) continue;

				// 移除代码块与行内代码
				const text = body
					.replace(/```[\s\S]*?```/g, "")
					.replace(/`[^`]+`/g, "");

				// 使用与 remark-content.mjs 完全一致的 CJK 正则
				const cjkMatches = text.match(CJK_PATTERN);
				if (cjkMatches) total += cjkMatches.length;

				// 计算非 CJK 单词数
				const nonCjkText = text.replace(CJK_PATTERN, " ");
				total += nonCjkText
					.split(/\s+/)
					.filter((word) => word.trim().length > 0).length;
			}
			return total;
		});
		totalWordCountPromises.set(locale, cached);
	}
	return cached;
}
