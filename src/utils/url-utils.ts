import type { CollectionEntry } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { permalinkConfig } from "../config";
import { generatePermalinkSlug } from "./permalink-utils";

/**
 * 移除文件扩展名（.md, .mdx, .markdown）
 * 用于将 Astro v5 Content Layer API 的 id 转换为 URL 友好的 slug
 */
export function removeFileExtension(id: string): string {
	return id.replace(/\.(md|mdx|markdown)$/i, "");
}

import { pathsEqual as routePathsEqual } from "./route-utils";

export function pathsEqual(path1: string, path2: string) {
	return routePathsEqual(path1, path2);
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string, prefix = ""): string {
	// 移除文件扩展名（如 .md, .mdx 等）
	const slugWithoutExt = removeFileExtension(slug);
	return url(`${prefix}/posts/${slugWithoutExt}/`);
}

export function getPostUrlByAlias(alias: string, prefix = ""): string {
	// 移除开头的斜杠并确保固定链接在 /posts/ 路径下
	const cleanAlias = alias.replace(/^\/+/, "");
	return url(`${prefix}/posts/${cleanAlias}/`);
}

export function getPostUrl(post: CollectionEntry<"posts">): string;
export function getPostUrl(post: {
	id: string;
	data: { alias?: string; permalink?: string };
}): string;
export function getPostUrl(post: any): string {
	// 英文文章挂在 /en/ 下；中文（默认语言）保持根路径不变。
	const prefix = post.data.lang === "en" ? "/en" : "";

	// 如果文章有自定义 permalink，优先使用（在根目录下）
	if (post.data.permalink) {
		const slug = post.data.permalink
			.replace(/^\/+/, "")
			.replace(/\/+$/, "");
		return url(`${prefix}/${slug}/`);
	}

	// 如果全局 permalink 功能启用，使用生成的 slug（在根目录下）
	if (permalinkConfig.enable) {
		const slug = generatePermalinkSlug(post);
		return url(`${prefix}/${slug}/`);
	}

	// 如果文章有 alias，使用 alias（在 /posts/ 下）
	if (post.data.alias) {
		return getPostUrlByAlias(post.data.alias, prefix);
	}

	// 否则使用默认的 slug 路径
	// 英文版与中文版同目录，文件名多一个 .en 后缀，拼 URL 前去掉
	return getPostUrlBySlug(
		removeFileExtension(String(post.id)).replace(/\.en$/, ""),
		prefix,
	);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	// 比较对象是文章数据里的分类名（中文），因此这里故意固定用默认语言，
	// 不跟随页面语言，否则英文页面的“未分类”链接会失效。
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() ===
			i18n(I18nKey.uncategorized).toLowerCase()
	)
		return url("/archive/?uncategorized=true");
	return url(`/archive/?category=${encodeURIComponent(category.trim())}`);
}

export function getDir(path: string): string {
	// 移除文件扩展名
	const pathWithoutExt = removeFileExtension(path);
	const lastSlashIndex = pathWithoutExt.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return "/";
	}
	return pathWithoutExt.substring(0, lastSlashIndex + 1);
}

export function getFileDirFromPath(filePath: string): string {
	return filePath.replace(/^src\//, "").replace(/\/[^/]+$/, "");
}

export function url(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}
