// 友情链接数据配置
// 用于管理友情链接页面的数据

export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// 友情链接数据
export const friendsData: FriendItem[] = [
	// {
	// 	id: 1,
	// 	title: "Astro",
	// 	imgurl: "https://avatars.githubusercontent.com/u/44914786?v=4&s=640",
	// 	desc: "The web framework for content-driven websites",
	// 	siteurl: "https://github.com/withastro/astro",
	// 	tags: ["Framework"],
	// },
	// {
	// 	id: 2,
	// 	title: "Mizuki Docs",
	// 	imgurl:
	// 		"https://q.qlogo.cn/headimg_dl?dst_uin=3231515355&spec=640&img_type=jpg",
	// 	desc: "Mizuki User Manual",
	// 	siteurl: "https://docs.mizuki.mysqil.com",
	// 	tags: ["Docs"],
	// },
	// {
	// 	id: 3,
	// 	title: "Vercel",
	// 	imgurl: "https://avatars.githubusercontent.com/u/14985020?v=4&s=640",
	// 	desc: "Develop. Preview. Ship.",
	// 	siteurl: "https://vercel.com",
	// 	tags: ["Hosting", "Cloud"],
	// },
	// {
	// 	id: 4,
	// 	title: "Tailwind CSS",
	// 	imgurl: "https://avatars.githubusercontent.com/u/67109815?v=4&s=640",
	// 	desc: "A utility-first CSS framework for rapidly building custom designs",
	// 	siteurl: "https://tailwindcss.com",
	// 	tags: ["CSS", "Framework"],
	// },
	// {
	// 	id: 5,
	// 	title: "TypeScript",
	// 	imgurl: "https://avatars.githubusercontent.com/u/6154722?v=4&s=640",
	// 	desc: "TypeScript is JavaScript with syntax for types",
	// 	siteurl: "https://www.typescriptlang.org",
	// 	tags: ["Language", "JavaScript"],
	// },
	// {
	// 	id: 6,
	// 	title: "React",
	// 	imgurl: "https://avatars.githubusercontent.com/u/6412038?v=4&s=640",
	// 	desc: "A JavaScript library for building user interfaces",
	// 	siteurl: "https://reactjs.org",
	// 	tags: ["Framework", "JavaScript"],
	// },
	// {
	// 	id: 7,
	// 	title: "GitHub",
	// 	imgurl: "https://avatars.githubusercontent.com/u/9919?v=4&s=640",
	// 	desc: "Where the world builds software",
	// 	siteurl: "https://github.com",
	// 	tags: ["Development", "Platform"],
	// },
	// {
	// 	id: 8,
	// 	title: "MDN Web Docs",
	// 	imgurl: "https://avatars.githubusercontent.com/u/7565578?v=4&s=640",
	// 	desc: "The web's most comprehensive resource for web developers",
	// 	siteurl: "https://developer.mozilla.org",
	// 	tags: ["Docs", "Reference"],
	// },
	{
		id: 9,
		title: "MARDIO1",
		imgurl: "https://avatars.githubusercontent.com/u/98638994?v=4&s=640",
		desc: "大佬无需多言",
		siteurl: "https://github.com/MARDIO1",
		tags: ["Developer"],
	},
	{
		id: 10,
		title: "mratgnothing",
		imgurl:"https://avatars.githubusercontent.com/u/251090025?v=4",
		desc: "我的老板doge",
		siteurl: "https://github.com/mratgnothing",
		tags: ["Developer"],
	},
	{
		id: 11,
		title: "sakimidare",
		imgurl: "https://avatars.githubusercontent.com/u/69438785?v=4",
		desc: "大佬，高贵的linux用户",
		siteurl: "https://sakimidare.top",
		tags: ["Blog", "Developer"],
	},
	{
		id: 12,
		title: "CrystalDiskInfo",
		imgurl: "https://avatars.githubusercontent.com/u/3816714?v=4",
		desc: "一款情绪价值很高的硬盘健康检测软件",
		siteurl: "https://sourceforge.net/projects/crystaldiskinfo/",
		tags: ["Software"],
	},
	{
		id: 13,
		title: "Linux C 编程一站式学习",
		imgurl: "https://avatars.githubusercontent.com/u/69438785?v=4",
		desc: "sakimidare佬总结的Linux C 编程一站式学习指南",
		siteurl: "https://c.sakimidare.top/pr01.html",
		tags: ["Website", "Learning"],
	}
];

// 获取所有友情链接数据
export function getFriendsList(): FriendItem[] {
	return friendsData;
}

// 获取随机排序的友情链接数据
export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
