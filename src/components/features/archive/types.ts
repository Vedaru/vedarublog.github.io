export interface ArchivePanelProps {
	sortedPosts: Post[];
	/** 界面语言（.astro 父组件传入 Astro.currentLocale）。 */
	locale?: string;
}

export interface Post {
	id: string;
	url?: string;
	data: {
		title: string;
		tags: string[];
		category?: string;
		published: Date;
	};
}

export interface Group {
	year: number;
	posts: Post[];
}
