// 本地番剧数据配置
export type AnimeItem = {
	title: string;
	status: "watching" | "completed" | "planned" | "onhold" | "dropped";
	rating: number;
	cover: string;
	description: string;
	year: string;
	genre: string[];
	studio: string;
	postUrl?: string; // 关联的帖子路径
	progress: number;
	totalEpisodes: number;
	startDate?: string; // 添加 startDate 属性
	endDate?: string; // 添加 endDate 属性
};

const localAnimeList: AnimeItem[] = [
	{
		title: "狼与香辛料",
		status: "completed",
		rating: 9.8,
		cover: "/assets/anime/86139c9ac6572ee5c3ab9ac61f77a51f4405240c.webp",
		description: "Merchant Meets The Wise Wolf",
		year: "2024",
		genre: ["日常", "公路番"],
		studio: "Passione",
		postUrl: "/posts/spice-and-wolf/",
		progress: 12,
		totalEpisodes: 12,
	},
	{
		title: "86-不存在的战区-",
		status: "completed",
		rating: 9.5,
		cover: "/assets/anime/86不存在的战区.webp",
		description: "86 -eightysix-",
		year: "2021",
		genre: ["战斗", "公路", "群像"],
		studio: "A-1 Pictures",
		progress: 8,
		totalEpisodes: 12,
	},
];

export default localAnimeList;
