export interface ArchivePost {
	id: string;
	url?: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
	};
}

export interface ArchiveGroup {
	year: number;
	posts: ArchivePost[];
}

export function buildArchiveGroups(posts: ArchivePost[]): ArchiveGroup[] {
	const sorted = [...posts].sort(
		(a, b) => b.data.published.getTime() - a.data.published.getTime(),
	);

	const grouped = sorted.reduce(
		(acc, post) => {
			const year = post.data.published.getFullYear();
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(post);
			return acc;
		},
		{} as Record<number, ArchivePost[]>,
	);

	return Object.keys(grouped)
		.map((yearStr) => ({
			year: Number.parseInt(yearStr, 10),
			posts: grouped[Number.parseInt(yearStr, 10)],
		}))
		.sort((a, b) => b.year - a.year);
}

export function formatArchiveDate(date: Date): string {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

export function formatArchiveTags(tagList: string[]): string {
	return tagList.map((t) => `#${t}`).join(" ");
}
