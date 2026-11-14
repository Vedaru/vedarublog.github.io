import type { Locale } from "@i18n/locales";
import { getSortedPostsList, type PostForList } from "./content-utils";

export type ArchiveFilterKind = "category" | "tag" | "uncategorized";

export type ArchiveFilterProps = {
	kind: ArchiveFilterKind;
	value?: string;
};

/** Filter a pre-sorted post list without touching the DOM. */
export function filterArchivePosts(
	posts: PostForList[],
	kind: ArchiveFilterKind,
	value?: string,
): PostForList[] {
	if (kind === "uncategorized") {
		return posts.filter((post) => !post.data.category);
	}

	if (!value) return [];

	if (kind === "category") {
		return posts.filter((post) => post.data.category === value);
	}

	return posts.filter((post) => post.data.tags?.includes(value));
}

/** Static route data for every category, tag and the uncategorized list. */
export async function getArchiveFilterPaths(locale: Locale) {
	const posts = await getSortedPostsList(locale);
	const categories = new Set<string>();
	const tags = new Set<string>();

	for (const post of posts) {
		if (post.data.category) categories.add(post.data.category);
		for (const tag of post.data.tags || []) tags.add(tag);
	}

	const paths: Array<{
		params: { filter: string };
		props: ArchiveFilterProps;
	}> = [
		{
			params: { filter: "uncategorized" },
			props: { kind: "uncategorized" },
		},
	];

	for (const category of [...categories].sort()) {
		paths.push({
			params: { filter: `category/${category}` },
			props: { kind: "category", value: category },
		});
	}

	for (const tag of [...tags].sort()) {
		paths.push({
			params: { filter: `tag/${tag}` },
			props: { kind: "tag", value: tag },
		});
	}

	return paths;
}
