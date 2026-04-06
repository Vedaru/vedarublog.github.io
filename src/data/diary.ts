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
		date: "2026-01-02T15:19:00",
	},
	{
		id: 12,
		content: `今天ai chat后端终于完成了开发，可以休息一会了……  

		英语汇报排练半天发现自己写的英语汇报稿子太长了，白背了………唉。`,
		date: "2026-01-03T15:23:00",
	},
	{
		id: 13,
		content: `实验室安全我怎么你了，问我传染性出血热是什么我是真不会啊。    

		因为之前的cloudflare子域名被电信封锁了，所以重新注册了一个域名vedaru.cn，然后把网站搬到了新的域名下。
		
		后天还有军事理论的考试，不过好在是开卷的，等到后天再说。明天就先复习复习工数和细胞生物学。`,
		date: "2026-01-07T21:45:00",
	},
	{
		id: 14,
		content: `今天军事理论考试，感觉我像于北辰（doge）

		本来打算认真复习的，后来看到有一个白葱社区我挺感兴趣的，然后就不知天地为何物了。  
		
		算了，还是再学一会吧，期末周简直是要把我榨干了/(ㄒoㄒ)/~~`,
		date: "2026-01-12T18:30:00",
	},
	{
		id: 15,
		content: `期末考试结束，我直接满血复活。

		ultralytics在github上新发布了一个YOLO26的版本，准备抽空试一试。
		
		最近在补线性代数和准备大英。反正转完专业还是要补修不如现在先学一点。`,
		date: "2026-01-22T11:00:00",
	},	
	{
		id: 16,
		content: `之前一直没有解决的网站在大陆地区访问速度太慢的问题终于解决了，不得不说vercel确实是太香了，比慢速云好太多。  
		
		整个网站的运行成本每年只有不到40米，速度还可以飞起来，感觉自己做了一件不得了的事情呢。考虑单独出一个帖子介绍介绍(*^_^*)`,
		date: "2026-01-25T14:45:00",
	},
	{
		id: 17,
		content: `最近有亿点小忙。返校宣讲要协调的事情特别多，我的QQ已经很久没有这么热闹了。
		
		网站的部署完成之后手又有一点痒了，我准备做一个类似neurosama的ai（当然是丐版😂），正好我又有声库来训练，5060性能也足够强劲。不错不错。`,
		date: "2026-01-31T10:30:00",
	},
	{
		id: 18,
		content: `我受不了了。快要睡觉了想着改一改洛可的项目介绍md然后push一下结果发现actions不跑了。  
		
		访问了一下网站发现不挂梯子上不去了。不是，我看了dns解析配置都没有问题啊？  
		
		最后上githubstatus看了一下才发现“Investigating - We are investigating reports of degraded performance for Actions”  
		
		666…… 到目前我写这一条日记为止actions还没恢复正常。看来只能明天再push了。`,
		date: "2026-02-04T00:01:00",
	},
	{
		id: 19,
		content: `昨天过完了鸣潮3.1的剧情，我真的，库洛你还我女儿！  
		
		哦对了，之前的网站有一段时间重定向出了一点问题，但是我现在换了一个vercel节点，应该是彻底解决了。`,
		date: "2026-02-06T16:20:00",
	},
	{
		id: 20,
		content: `隔了十几天没写，是因为实在没啥可写，每一天就感觉眨眼就过去了。

		最近在准备返校宣讲的成果总结，感觉自己又要被忙死了。我接下来还有六级、转专业考试，可恶。
		
		果然成为大学生还是和高中作息一样吗。`,
		date: "2026-02-22T10:00:00",
	},
	{
		id: 21,
		content: `感受到了使用比较笨的ai写程序的无力感……`,
		date: "2026-02-23T19:30:00",
	},
	{
		id: 22,
		content: `最近在准备转专业考试，感觉压力好大啊。每天都在复习工数，感觉自己被榨干了。`,
		date: "2026-02-27T20:00:00",
	},
	{
		id: 23,
		content: `有点绝望了，感觉自己工数复习得不太好，转专业考试可能要凉了。不过也没什么好怕的了，尽力就好了。
		
		更新了一下local-project的README，感觉自己写得还不错呢。`,
		date: "2026-03-03T18:00:00",
	},
	{
		id: 24,
		content: `单周一节早八，双周两节，但是代价是周四周五会满课，你会接受吗？
		
		还行吧说实话，至少剩下的时间可以全泡在图书馆里面。
		上学期去图书馆专门预约了座位但是发现并没有人按照预约的座位去坐。这学期好了，又开始说要打压这样的行为了。（笑）
		
		晚上的水课只有8个人，原来水课的人数真的会这么少吗`,
		date: "2026-03-05T15:00:00",
	},
	{
		id: 25,
		content: `今天开始使用vim。感觉vim的光标移动的方式很高效。虽然一开始会有一点不习惯但是凡事都会有一个开头吧，等我用习惯自然工作流就便顺畅了。

		不过感觉vim的学习曲线还是挺陡峭的，可能需要花一些时间来适应和掌握各种命令和快捷键。希望能坚持下来。`,
		date: "2026-03-06T20:00:00",
	},
	{
		id: 26,
		content: `“这就像一个赌注。”
		
		“如果你失败了怎么办。”
		
		“我将大哭一场。”`,
		date: "2026-03-08T23:03:00",
	},
	{
		id: 27,
		content: `这几天还是刷工数试卷、练习cpp，然后不断重复。中间有一点空闲的时间就编一点小程序。
		之前安装了android studio用来改一个app。不知道为什么，键盘输入总是会有延迟，而且在agent对话框中只能输入英文。
		最后选择在VScode中安装了一个gradle插件，用着顺手多了。`,
		date: "2026-03-13T14:30:00",
	},
	{
		id: 28,
		content: `转专业申报结束，最后还是坚持自己的选择选的计算机。
		依然在准备转考中，不过cpp现在还是没有着落，工数感觉又到了上限。明天有时间我还要把cpy鸽鸽♥给我的资料打一下再看一看，如果转专业机试是开卷的话还是可以用得上的。
		最近除了准备转考啥都没怎么干，自己编的一堆项目也没收尾，电吉他编曲也没时间弄了……不过快了，在撑撑就过去了。`,
		date: "2026-03-20T14:30:00",
	},
	{
	  id: 29,
	  content: `我现在并没有使用桌面ide写这一段话，我现在在使用的是acode + vim插件。这解决了我每天像敲点代码就要背一个笨重的笔记本的痛苦。😄
	  
	  但是目前我还没有摸透该如何使用acode的agent，要是真能将github copliot都搬进来那我以后还不如直接在平板上进行开发了。🐶

		事实证明还是termux + vim好用。讽刺的是当desktop追求全键盘工作流时我反而觉得图形化更加得心应手，而平板这种移动设备我反而觉得全键盘工作流更加舒适。用了一段时间发现termux是真的香，现在在平板上面也可以用vim做开发了。再也不用为了游戏本续航而感到焦虑了。同时vim使用有了更加具体的场景，自己的技术水平也可以得到提升。😄`,
	  date: "2026-03-24T10:00:00",
	},
  {
    id: 30,
    content: `今天依然是使用平板写一段，不过我现在使用的是neovim，使用体验和vim差不多但是界面更加美观了。

    之前反无视觉识别模型的论文发表了，发布没一会就有很多人来要github数据集，甚至还有人引用我们的论文。多年以后当我已经工作，我也许也时不时会想起我参与编写的第一篇论文……`,
    date: "2026-03-29T20:00:00",
  },
  {
    id: 31,
    content: `照常复习工数，不过我感觉不能一直看错题了，要不然大脑就要训练过饱和了。还是应该再看看前几年的试卷并熟悉一下试卷的架构，然后再让ai出几张模拟试卷来练练手。最后十几天了，心态一定要稳。

    加油！`,
    date: "2026-03-31T17:00:00",
  },
  {
	id: 32,
	content: `有点累了。
	
	不过我该做的基本上应该都做了，我仔细地把所有的试卷过了一遍。把能搞到的所有的c++的试卷都程序自己敲一遍。现在可以做的就是调整一下心态。
	
	毕竟最后结果如何，我都只会是一个喜欢敲代码，喜欢追番，喜欢折腾的热血笨蛋。`,
	date: "2026-04-06T15:00:00",
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
