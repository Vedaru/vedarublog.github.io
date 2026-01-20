import type { CollectionEntry } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { permalinkConfig } from "@/config";
import { generatePermalinkSlug, getPermalinkPath } from "./permalink-utils";

/**
 * 移除文件扩展名（.md, .mdx, .markdown）
 * 用于将 Astro v5 Content Layer API 的 id 转换为 URL 友好的 slug
 */
export function removeFileExtension(id: string): string {
	return id.replace(/\.(md|mdx|markdown)$/i, "");
}

export function pathsEqual(path1: string, path2: string) {
	const normalizedPath1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const normalizedPath2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return normalizedPath1 === normalizedPath2;
}

function joinUrl(...parts: string[]): string {
	const joined = parts.join("/");
	return joined.replace(/\/+/g, "/");
}

export function getPostUrlBySlug(slug: string): string {
	// 移除文件扩展名（如 .md, .mdx 等）
	const slugWithoutExt = removeFileExtension(slug);
	return url(`/posts/${slugWithoutExt}/`);
}

export function getPostUrlByPermalink(permalink: string): string {
	// 保持向后兼容：如果未启用全局 permalink，仍然使用 /posts/{permalink}/
	const cleanPermalink = String(permalink).replace(/^\/+/, "").replace(/\/+$/, "");
	return url(`/posts/${cleanPermalink}/`);
}

export function getPostUrl(post: CollectionEntry<"posts">): string;
export function getPostUrl(post: { id: string; data: { permalink?: string } }): string;
export function getPostUrl(post: any): string {
	// 如果文章有自定义固定链接
	if (post.data?.permalink) {
		// 当启用全局 permalink 功能时，自定义 permalink 视为根目录下的路径
		if (permalinkConfig.enable) {
			return url(getPermalinkPath(post));
		}
		// 否则保持兼容性，返回 /posts/{permalink}/
		return getPostUrlByPermalink(post.data.permalink);
	}

	// 当启用全局 permalink 功能时，使用生成的 permalink（根目录）
	if (permalinkConfig.enable) {
		const slug = generatePermalinkSlug(post);
		return url(`/${slug}/`);
	}

	// 默认：使用 /posts/{slug}/
	return getPostUrlBySlug(post.id);
}

export function getTagUrl(tag: string): string {
	if (!tag) return url("/archive/");
	return url(`/archive/?tag=${encodeURIComponent(tag.trim())}`);
}

export function getCategoryUrl(category: string | null): string {
	if (
		!category ||
		category.trim() === "" ||
		category.trim().toLowerCase() === i18n(I18nKey.uncategorized).toLowerCase()
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
