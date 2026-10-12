export interface Photo {
	id?: string;
	src: string;
	alt?: string;
	title?: string;
	thumbnail?: string;
	tags?: string[];
	description?: string;
	date?: string;
	location?: string;
	width?: number;
	height?: number;
}

export interface AlbumGroup {
	id: string;
	/** 相册标题，中文（站点默认语言） */
	title: string;
	/** 英文标题（info.json 里的 titleEn，缺失时回退 title） */
	titleEn?: string;
	description?: string;
	/** 英文描述（info.json 里的 descriptionEn） */
	descriptionEn?: string;
	cover: string;
	date: string;
	location?: string;
	tags?: string[];
	/** 英文标签（info.json 里的 tagsEn） */
	tagsEn?: string[];
	layout?: "grid" | "masonry";
	columns?: number;
	photos: Photo[];
}
