// 日记数据配置
// 用于管理日记页面的数据

export interface DiaryItem {
	id: number;
	content: string;
	date: string;
	images?: string[];
	location?: string;
	mood?: string;
	tags?: string[];
}

// 示例日记数据
const diaryData: DiaryItem[] = [
	{
		id: 1,
		content: `今天跑了1000。本来以为自己要完了，因为自己天天卡校园跑bug已经几个月没有跑过正经步了。结果跑下来成绩还能看（只不过肺跑完要炸了，看来以后不能再偷工减料了）。

		刚跑完还要赶去参观实验室，我真没招了。`,
		date: "2025-12-11T15:31:00",
	},
	{
		id: 2,
		content:
			"接了一个用MATLAB App Designer做app界面的项目。正好学习一下MATLAB。",
		date: "2025-12-12T21:20:00",
	},
	{
		id: 3,
		content: `武大男闪击南京，好兄弟吃尽狗粮。和bro们出去看了疯狂动物城2，作为洞穴哥布林差点被纯爱送走（不好是光与爱呃啊啊啊啊）。

		用conda装环境装半天，后来发现虚拟环境都库冲突了，索性狠心把所有环境都删了才把环境配好。果然我一开始就应该好好管理环境的……`,
		date: "2025-12-14T10:15:00",
	},
	{
		id: 4,
		content: `今天优化了音乐播放插件的音量条，鼠标按住拖动的时候动画变得更丝滑了。

		尝试与工数自由搏击，最终被揍得鼻青脸肿，难道我数学能力的巅峰就只能停留在高中时期吗，这样的事情，呀咩咯！`,
		date: "2025-12-17T19:45:00",
	},
	{
		id: 5,
		content: `也是顺利当上宣讲团队长了。
		
		事情好多啊，这种事情对于我这样一个社恐的人可不能算是一件好事啊（早知道就不竞选队长了）。不过既然有时长可以拿那就勉强一下吧。
		希望不要出什么乱子……
		
		顺带一提，那个MATLAB的app项目恐怕是没时间做了。私密马赛senpai，得莫，事情实在是太多了我去。

		明天还有oral presentation，我现在才把稿子敲出来，笑不出来，明天不会真要freestyle吧（悲`,
		date: "2025-12-18T22:28:00",
	},
	{
		id: 6,
		content: `一直在部署网站…………原来敲代码真的是一种体力劳动。

		敲代码就像做木匠活，这是一种蛮力和精细的完美平衡。稍微用力过猛就会把钉子敲歪，稍微不够用力又钉不进去。`,
		date: "2025-12-22T00:05:00",
	},
	{
		id: 7,
		content: `今天有bro给我推荐一个叫manus的ai。这东西离谱在于，它可以直接连接到你的浏览器然后自行搜索。甚至能连接到slack自主完成讨论和交易。
		
		本来以前以为强人工智能只是遥不可及的臆想，但是这个ai强大到让我有一点害怕了。现在看来需要重新审视一下ai的发展了。
		
		顺带一提，今天终于把网站部署好了。虽然还不完美，但是总算是上线了。希望以后能坚持更新吧。
		`,
		date: "2025-12-23T16:50:00",
	},
	{
		id: 8,
		content: `圣诞节快乐！

		今天总算是把本站的musicplayer插件修复完了，手感现在变得相当的丝滑。希望大家喜欢这个新版本的播放器。  

		点一下页面底下的按钮会发生什么呢，好难猜啊~~`,
		date: "2025-12-25T12:22:00",
	},
	{
		id: 9,
		content: `最近忙着准备期末考试，感觉压力山大。今天复习了常微分方程，然后就有一种自己生病了上网瞎查感觉自己要完了的感觉。  

		网站添加了AI聊天功能的前端界面，后端还没写完。希望能早点弄好吧（不过真没时间了）。`,
		date: "2025-12-30T00:37:00",
	},
	{
		id: 10,
		content: `新年快乐！

		终于迎来了2026年。希望新的一年能有新的开始。  
		2025年度总结什么的等到放寒假了再补吧，现在有亿点忙。  

		晚上看了电锯人蕾赛篇，藤本树还是太权威了，boom！（蕾赛蕾赛冷酷脸）

		最近还是在忙着期末考试的复习（尤其是工数），感觉压力好大。  
		不是，为什么学校教材要把微分方程放在这么靠前的位置啊，不应该是放在多元函数之后才学吗？  
		
		ai chat后端还在努力建设中。人工智能导论构建si智能体的大作业和这个很像，正好可以放在一起做。  
		
		周日还有一个英语小组汇报，痛苦。`,
		date: "2026-01-01T01:00:00",
	},
	{
		id: 11,
		content: `一整天在复习数学，已经要完全变成数学的样子了，不过好像还是没有多少把握。  

		偶然间看到了Cannonkeys预售结束的一款40配列的键盘，感觉还不错，准备入手一个试试水，不过有点贵。假期的时候尝试一下可不可以自己3D打印配件自己组一把。`,
		date: "2026-01-10T18:30:00",
	}
];	

// 获取日记统计数据
export const getDiaryStats = () => {
	const total = diaryData.length;
	const hasImages = diaryData.filter(
		(item) => item.images && item.images.length > 0,
	).length;
	const hasLocation = diaryData.filter((item) => item.location).length;
	const hasMood = diaryData.filter((item) => item.mood).length;

	return {
		total,
		hasImages,
		hasLocation,
		hasMood,
		imagePercentage: Math.round((hasImages / total) * 100),
		locationPercentage: Math.round((hasLocation / total) * 100),
		moodPercentage: Math.round((hasMood / total) * 100),
	};
};

// 获取日记列表（按时间倒序）
export const getDiaryList = (limit?: number) => {
	const sortedData = diaryData.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	if (limit && limit > 0) {
		return sortedData.slice(0, limit);
	}

	return sortedData;
};

// 获取最新的日记
export const getLatestDiary = () => {
	return getDiaryList(1)[0];
};

// 根据ID获取日记
export const getDiaryById = (id: number) => {
	return diaryData.find((item) => item.id === id);
};

// 获取包含图片的日记
export const getDiaryWithImages = () => {
	return diaryData.filter((item) => item.images && item.images.length > 0);
};

// 根据标签筛选日记
export const getDiaryByTag = (tag: string) => {
	return diaryData
		.filter((item) => item.tags?.includes(tag))
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// 按年份获取日记（按时间倒序）
export const getDiaryByYear = (year: number) => {
	return getDiaryList(Number.MAX_SAFE_INTEGER).filter(
		(item) => {
			const datePart = item.date.split('T')[0];
			const y = parseInt(datePart.split('-')[0], 10);
			return y === year;
		},
	);
};

// 按年份和月份获取日记（按时间倒序）；month 取值 1-12
export const getDiaryByYearMonth = (year: number, month: number) => {
	return getDiaryList(Number.MAX_SAFE_INTEGER).filter((item) => {
		const datePart = item.date.split('T')[0];
		const parts = datePart.split('-');
		const y = parseInt(parts[0], 10);
		const m = parseInt(parts[1], 10);
		return y === year && m === month;
	});
};

// 获取所有标签
export const getAllTags = () => {
	const tags = new Set<string>();
	diaryData.forEach((item) => {
		if (item.tags) {
			item.tags.forEach((tag) => {
				tags.add(tag);
			});
		}
	});
	return Array.from(tags).sort();
};

export default diaryData;
