import { getTsBuildInfoEmitOutputFilePath } from "typescript";
import type {
	AnnouncementConfig,
	CommentConfig,
	DesktopMetaphorConfig,
	ExpressiveCodeConfig,
	FooterConfig,
	FullscreenWallpaperConfig,
	LicenseConfig,
	MusicPlayerConfig,
	NavBarConfig,
	ProfileConfig,
	SakuraConfig,
	SidebarLayoutConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

// 移除i18n导入以避免循环依赖

// 定义站点语言
const SITE_LANG = "zh_CN"; // 语言代码，例如：'en', 'zh_CN', 'ja' 等。
const SITE_TIMEZONE = 8; //设置你的网站时区 from -12 to 12 default in UTC+8
export const siteConfig: SiteConfig = {
	title: "Vedaruの心之海",
	subtitle: "",
	siteURL: "https://vedaru.cn", // 自定义域名
	siteStartDate: "2025-12-01", // 站点开始运行日期，用于站点统计组件计算运行天数

	timeZone: SITE_TIMEZONE,

	lang: SITE_LANG,

	themeColor: {
		hue: 60, // 主题色的默认色相，范围从 0 到 360。例如：红色：0，青色：200，蓝绿色：250，粉色：345
		fixed: false, // 对访问者隐藏主题色选择器
	},

	// 特色页面开关配置(关闭不在使用的页面有助于提升SEO,关闭后直接在顶部导航删除对应的页面就行)
	featurePages: {
		anime: true, // 番剧页面开关
		diary: true, // 日记页面开关
		friends: true, // 友链页面开关
		projects: true, // 项目页面开关
		skills: true, // 技能页面开关
		timeline: true, // 时间线页面开关
		albums: true, // 相册页面开关
		devices: true, // 设备页面开关
	},

	// 顶栏标题配置
	navbarTitle: {
		// 顶栏标题文本
		text: "Vedaru",
		// 顶栏标题图标路径，默认使用 public/assets/home/home.png
		icon: "assets/home/Image_1764853150683.webp",
	},

	bangumi: {
		userId: "your-bangumi-id", // 在此处设置你的Bangumi用户ID，可以设置为 "sai" 测试
	},

	anime: {
		mode: "local", // 番剧页面模式："bangumi" 使用Bangumi API，"local" 使用本地配置
	},

	// 文章列表布局配置
	postListLayout: {
		// 默认布局模式："list" 列表模式（单列布局），"grid" 网格模式（双列布局）
		// 注意：如果侧边栏配置启用了"both"双侧边栏，则无法使用文章列表"grid"网格（双列）布局
		defaultMode: "list",
		// 是否允许用户切换布局
		allowSwitch: false,
	},

	// 标签样式配置
	tagStyle: {
		// 是否使用新样式（悬停高亮样式）还是旧样式（外框常亮样式）
		useNewStyle: false,
	},

	// 壁纸模式配置
	wallpaperMode: {
		// 默认壁纸模式：banner=顶部横幅，fullscreen=全屏壁纸，none=无壁纸
		defaultMode: "fullscreen",
		// 整体布局方案切换按钮显示设置（默认："desktop"）
		// "off" = 不显示
		// "mobile" = 仅在移动端显示
		// "desktop" = 仅在桌面端显示
		// "both" = 在所有设备上显示
		showModeSwitchOnMobile: "off",
	},

	banner: {
		// 支持单张图片或图片数组，当数组长度 > 1 时自动启用轮播
		src: {
			desktop: [
				"/assets/desktop-banner/703c235a202e38293fa8037d04fc44500256417f.webp",
				"/assets/desktop-banner/54ae9fc257542e969dda9d9bcf07405999facb13.webp",
				"/assets/desktop-banner/831fb1cdaeead8de1cae31354771e244290750052.webp",
				"/assets/desktop-banner/be809be42311aa693fc459cf189339c36ca3ecbb.webp",
				"/assets/desktop-banner/8b31043a430bb793c6bd2949adb5ae1bb0825f25.webp",
			], // 桌面横幅图片
			mobile: [
				"/assets/mobile-banner/e72646f638b299c4aac3acf81932d2e8290750052.webp",
				"/assets/mobile-banner/6ef052ba91921b0e396eee8f4cc264eddf86308d.webp",
				"/assets/mobile-banner/270f1b9b9b0bb275802a3b20ac21672d33a6663c.webp",
				"/assets/mobile-banner/5edec7a9d26759736603ad45e8e93241cd0dc735.webp",
			], // 移动横幅图片
		}, // 使用本地横幅图片

		position: "center", // 等同于 object-position，仅支持 'top', 'center', 'bottom'。默认为 'center'

		carousel: {
			enable: true, // 为 true 时：为多张图片启用轮播。为 false 时：从数组中随机显示一张图片

			interval: 5, // 轮播间隔时间（秒）
		},

		waves: {
			enable: true, // 是否启用水波纹效果(这个功能比较吃性能)
			performanceMode: true, // 性能模式：减少动画复杂度(性能提升40%)
			mobileDisable: false, // 移动端禁用
		},

		// PicFlow API支持(智能图片API)
		imageApi: {
			enable: false, // 启用图片API
			url: "http://domain.com/api_v2.php?format=text&count=4", // API地址，返回每行一个图片链接的文本
		},
		// 这里需要使用PicFlow API的Text返回类型,所以我们需要format=text参数
		// 项目地址:https://github.com/matsuzaka-yuki/PicFlow-API
		// 请自行搭建API

		homeText: {
			enable: true, // 在主页显示自定义文本
			title: "", // 主页横幅主标题

			subtitle: [""],
			typewriter: {
				enable: true, // 启用副标题打字机效果

				speed: 100, // 打字速度（毫秒）
				deleteSpeed: 50, // 删除速度（毫秒）
				pauseTime: 200, // 完全显示后的暂停时间（毫秒）
			},
		},

		credit: {
			enable: false, // 显示横幅图片来源文本

			text: "Describe", // 要显示的来源文本
			url: "", // （可选）原始艺术品或艺术家页面的 URL 链接
		},

		navbar: {
			transparentMode: "semifull", // 导航栏透明模式："semi" 半透明加圆角，"full" 完全透明，"semifull" 动态透明
		},
	},
	toc: {
		enable: true, // 启用目录功能
		mode: "sidebar", // 目录显示模式："float" 悬浮按钮模式，"sidebar" 侧边栏模式
		depth: 2, // 目录深度，1-6，1 表示只显示 h1 标题，2 表示显示 h1 和 h2 标题，依此类推
		useJapaneseBadge: false, // 使用日语假名标记（あいうえお...）代替数字，开启后会将 1、2、3... 改为 あ、い、う...
	},
	generateOgImages: false, // 启用生成OpenGraph图片功能,注意开启后要渲染很长时间，不建议本地调试的时候开启
	favicon: [
		{
			src: "/favicon/favicon.webp", // 使用profile头像作为favicon
			theme: "light",
			sizes: "32x32",
		},
		{
			src: "/favicon/favicon.webp",
			theme: "dark",
			sizes: "32x32",
		},
		{
			src: "/favicon/favicon.webp",
			sizes: "16x16",
		},
		{
			src: "/favicon/favicon.webp",
			sizes: "192x192",
		},
	],

	// 字体配置
	font: {
		// 注意：自定义字体需要在 src/styles/main.css 中引入字体文件
		// 注意：字体子集优化功能目前仅支持 TTF 格式字体,开启后需要在生产环境才能看到效果,在Dev环境下显示的是浏览器默认字体!
		asciiFont: {
			// 英文字体 - 优先级最高
			// 指定为英文字体则无论字体包含多大范围，都只会保留 ASCII 字符子集
			fontFamily: "ZenMaruGothic-Medium",
			fontWeight: "400",
			localFonts: ["ZenMaruGothic-Medium.ttf"],
			enableCompress: false,
		},
		// CJK 字体已禁用以节省资源，使用浏览器默认字体
		// cjkFont: {
		// 	// 中日韩字体 - 作为回退字体
		// 	fontFamily: "微软雅黑, Microsoft YaHei",
		// 	fontWeight: "400",
		// 	localFonts: ["微软雅黑.ttf"],
		// 	enableCompress: false,
		// },
	},
	showLastModified: true, // 控制“上次编辑”卡片显示的开关
};
export const fullscreenWallpaperConfig: FullscreenWallpaperConfig = {
	src: {
		desktop: [
			"/assets/desktop-banner/703c235a202e38293fa8037d04fc44500256417f.webp",
			"/assets/desktop-banner/54ae9fc257542e969dda9d9bcf07405999facb13.webp",
			"/assets/desktop-banner/831fb1cdaeead8de1cae31354771e244290750052.webp",
			"/assets/desktop-banner/be809be42311aa693fc459cf189339c36ca3ecbb.webp",
			"/assets/desktop-banner/8b31043a430bb793c6bd2949adb5ae1bb0825f25.webp",
		], // 桌面横幅图片
		mobile: [
			"/assets/mobile-banner/e72646f638b299c4aac3acf81932d2e8290750052.webp",
			"/assets/mobile-banner/6ef052ba91921b0e396eee8f4cc264eddf86308d.webp",
			"/assets/mobile-banner/270f1b9b9b0bb275802a3b20ac21672d33a6663c.webp",
			"/assets/mobile-banner/5edec7a9d26759736603ad45e8e93241cd0dc735.webp",
		], // 移动横幅图片
	}, // 使用本地横幅图片
	position: "center", // 壁纸位置，等同于 object-position
	carousel: {
		enable: true, // 启用轮播
		interval: 5, // 轮播间隔时间（秒）
	},
	zIndex: 0, // 层级，0 使壁纸可见（可调整为负值以置于内容后面）
	opacity: 0.8, // 壁纸透明度
	blur: 1, // 背景模糊程度
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			name: "AI Chat",
			url: "/chat/",
			icon: "material-symbols:chat",
		},
		// 支持自定义导航栏链接,并且支持多级菜单,3.1版本新加
		{
			name: "Links",
			url: "/links/",
			icon: "material-symbols:link",
			children: [
				{
					name: "GitHub",
					url: "https://github.com/Vedaru",
					external: true,
					icon: "fa6-brands:github",
				},
				{
					name: "Bilibili",
					url: "https://space.bilibili.com/3546947954674618",
					external: true,
					icon: "fa6-brands:bilibili",
				},
			],
		},
		{
			name: "My",
			url: "/content/",
			icon: "material-symbols:person",
			children: [
				{
					name: "Anime",
					url: "/anime/",
					icon: "material-symbols:movie",
				},
				{
					name: "Diary",
					url: "/diary/",
					icon: "material-symbols:book",
				},
				{
					name: "Gallery",
					url: "/albums/",
					icon: "material-symbols:photo-library",
				},
			],
		},
		{
			name: "About",
			url: "/content/",
			icon: "material-symbols:info",
			children: [
				{
					name: "About",
					url: "/about/",
					icon: "material-symbols:person",
				},
				{
					name: "Friends",
					url: "/friends/",
					icon: "material-symbols:group",
				},
			],
		},
		{
			name: "Others",
			url: "#",
			icon: "material-symbols:more-horiz",
			children: [
				{
					name: "Projects",
					url: "/projects/",
					icon: "material-symbols:work",
				},
				{
					name: "Skills",
					url: "/skills/",
					icon: "material-symbols:psychology",
				},
				{
					name: "Timeline",
					url: "/timeline/",
					icon: "material-symbols:timeline",
				},
			],
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/Image_1764853150683.webp", // 相对于 /src 目录。如果以 '/' 开头，则相对于 /public 目录
	name: "Vedaru",
	bio: "梦想是成为现充……",
	typewriter: {
		enable: true, // 启用个人简介打字机效果
		speed: 80, // 打字速度（毫秒）
	},
	links: [
		{
			name: "Bilibli",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/3546947954674618",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/Vedaru",
		},
		{
			name: "Discord",
			icon: "fa6-brands:discord",
			url: "https://discord.com/channels/@me",
		},
		{
			name: "X",
			icon: "fa6-brands:x-twitter",
			url: "https://x.com/loner450189",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// 注意：某些样式（如背景颜色）已被覆盖，请参阅 astro.config.mjs 文件。
	// 请选择深色主题，因为此博客主题目前仅支持深色背景
	theme: "github-dark",
	// 是否在主题切换时隐藏代码块以避免卡顿问题
	hideDuringThemeTransition: true,
};

export const commentConfig: CommentConfig = {
	enable: true, // 启用评论功能。当设置为 false 时，评论组件将不会显示在文章区域。
	twikoo: {
		 envId: "https://comment.vedaru.cn", // Cloudflare Workers 自定义域名
		lang: "zh-CN", // 设置 Twikoo 评论系统语言为中文
	},
};

export const announcementConfig: AnnouncementConfig = {
	title: "公告", // 公告标题
	content: "最近因为要准备期末考试可能会停一段时间的更新了。", // 公告内容
	closable: true, // 允许用户关闭公告
	persistClose: false, // 关闭公告后是否持久化（false=刷新页面后恢复；true=永久关闭直到手动清除localStorage）
	link: {
		enable: true, // 启用链接
		text: "Learn More", // 链接文本
		url: "/about/", // 链接 URL
		external: false, // 内部链接
	},
};

export const musicPlayerConfig: MusicPlayerConfig = {
	enable: true, // 启用音乐播放器功能
	mode: "meting", // 音乐播放器模式，可选 "local" 或 "meting"
	// 当前使用：官方 Meting API（主源）。
	// 可选：按优先级提供多个候选 Meting API 源，播放器会按顺序尝试备用源。
	meting_api:
		"https://api.i-meto.com/meting/api?server=netease&type=playlist&id=17514570572",
	meting_api_candidates: [
		"https://api.i-meto.com/meting/api?server=netease&type=playlist&id=17514570572",
		"https://api.wuenci.com/meting/api/?server=:server&type=:type&id=:id",
		"https://meting.qjqq.cn/api?server=:server&type=:type&id=:id",
		"https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&auth=:auth&r=:r",
		"https://netease-cloud-music-api-gules-mu.vercel.app/api?server=:server&type=:type&id=:id",
	],
	id: "17514570572", // 歌单ID
	server: "netease", // 音乐源服务器。有的meting的api源支持更多平台,一般来说,netease=网易云音乐, tencent=QQ音乐, kugou=酷狗音乐, xiami=虾米音乐, baidu=百度音乐
	type: "playlist", // 播单类型
	
	// === 性能优化配置 ===
	preload: "auto", // 仅预加载元数据，不预加载完整音频，加快初始加载速度
	autoplay: false, // 进入页面不自动播放，需要用户手动点击播放
	autoplayContinuous: true, // 播放完当前曲目后自动继续并循环列表
	volume: 0.7, // 默认音量（0-1之间）
	listMaxHeight: "250px", // 限制播放列表最大高度，避免列表过长影响性能
	order: "list", // 播放顺序：list=列表顺序, random=随机播放
	mutex: true, // 互斥模式，阻止多个播放器同时播放
	storageName: "music-player-cache", // localStorage 缓存键名，用于缓存播放列表数据减少重复请求
	
	// 可选：当浏览器支持 WebAudio 时，增益倍数用于放大输出（例如 2.0 表示最多放大 2 倍）
	// 若音源受 CORS 限制而回退为非 WebAudio 模式，则此配置无效。
	gainBoost: 1.0, // 设置增益倍数为1.0，避免放大导致的卡顿
};

export const footerConfig: FooterConfig = {
	enable: false, // 是否启用Footer HTML注入功能
	customHtml: "", // HTML格式的自定义页脚信息，例如备案号等，默认留空
	// 也可以直接编辑 FooterConfig.html 文件来添加备案号等自定义内容
	// 注意：若 customHtml 不为空，则使用 customHtml 中的内容；若 customHtml 留空，则使用 FooterConfig.html 文件中的内容
	// FooterConfig.html 可能会在未来的某个版本弃用
};

/**
 * 侧边栏布局配置
 * 用于控制侧边栏组件的显示、排序、动画和响应式行为
 * sidebar: 控制组件在左侧栏和右侧栏,注意移动端是不会显示右侧栏的内容(unilateral模式除外),在设置了right属性的时候请确保你使用双侧(both)布局
 */
export const sidebarLayoutConfig: SidebarLayoutConfig = {
	// 侧边栏位置：单侧(unilateral)或双侧(both)
	position: "both",

	// 侧边栏组件配置列表
	components: [
		{
			// 组件类型：用户资料组件
			type: "profile",
			// 是否启用该组件
			enable: true,
			// 组件显示顺序（数字越小越靠前）
			order: 1,
			// 组件位置："top" 表示固定在顶部
			position: "top",
			// 所在侧边栏
			sidebar: "left",
			// CSS 类名，用于应用样式和动画
			class: "onload-animation",
			// 动画延迟时间（毫秒），用于错开动画效果
			animationDelay: 0,
		},
		{
			// 组件类型：公告组件
			type: "announcement",
			// 是否启用该组件（现在通过统一配置控制）
			enable: true,
			// 组件显示顺序
			order: 2,
			// 组件位置："top" 表示固定在顶部
			position: "sticky",
			// 所在侧边栏
			sidebar: "left",
			// CSS 类名
			class: "onload-animation",
			// 动画延迟时间
			animationDelay: 50,
		},
		{
			// 组件类型：分类组件
			type: "categories",
			// 是否启用该组件
			enable: true,
			// 组件显示顺序
			order: 3,
			// 组件位置："sticky" 表示粘性定位，可滚动
			position: "sticky",
			// 所在侧边栏
			sidebar: "left",
			// CSS 类名
			class: "onload-animation",
			// 动画延迟时间
			animationDelay: 150,
			// 响应式配置
			responsive: {
				// 折叠阈值：当分类数量超过5个时自动折叠
				collapseThreshold: 5,
			},
		},
		{
			// 组件类型：标签组件
			type: "tags",
			// 是否启用该组件
			enable: true,
			// 组件显示顺序
			order: 6,
			// 组件位置："sticky" 表示粘性定位
			position: "sticky",
			// 所在侧边栏
			sidebar: "right",
			// CSS 类名
			class: "onload-animation",
			// 动画延迟时间
			animationDelay: 250,
			// 响应式配置
			responsive: {
				// 折叠阈值：当标签数量超过20个时自动折叠
				collapseThreshold: 20,
			},
		},
		{
			// 组件类型：站点统计组件
			type: "site-stats",
			// 是否启用该组件
			enable: true,
			// 组件显示顺序
			order: 5,
			// 组件位置
			position: "top",
			// 所在侧边栏
			sidebar: "right",
			// CSS 类名
			class: "onload-animation",
			// 动画延迟时间
			animationDelay: 200,
		},
		{
			// 组件类型：日历组件(移动端不显示)
			type: "calendar",
			// 是否启用该组件
			enable: false,
			// 组件显示顺序
			order: 4,
			// 组件位置
			position: "sticky",
			// 所在侧边栏
			sidebar: "right",
			// CSS 类名
			class: "onload-animation",
			// 动画延迟时间
			animationDelay: 250,
		},
	],

	// 默认动画配置
	defaultAnimation: {
		// 是否启用默认动画
		enable: true,
		// 基础延迟时间（毫秒）
		baseDelay: 0,
		// 递增延迟时间（毫秒），每个组件依次增加的延迟
		increment: 50,
	},

	// 响应式布局配置
	responsive: {
		// 断点配置（像素值）
		breakpoints: {
			// 移动端断点：屏幕宽度小于768px
			mobile: 768,
			// 平板端断点：屏幕宽度小于1280px
			tablet: 1280,
			// 桌面端断点：屏幕宽度小于1280px
			desktop: 1280,
		},
		// 不同设备的布局模式
		//hidden:不显示侧边栏(桌面端)   drawer:抽屉模式(移动端不显示)   sidebar:显示侧边栏
		layout: {
			// 移动端：抽屉模式
			mobile: "sidebar",
			// 平板端：显示侧边栏
			tablet: "sidebar",
			// 桌面端：显示侧边栏
			desktop: "sidebar",
		},
	},
};

export const sakuraConfig: SakuraConfig = {
	enable: false, // 默认关闭樱花特效
	sakuraNum: 400, // 樱花数量
	limitTimes: -1, // 樱花越界限制次数，-1为无限循环
	size: {
		min: 0.2, // 樱花最小尺寸倍数
		max: 0.3, // 樱花最大尺寸倍数
	},
	opacity: {
		min: 0.3, // 樱花最小不透明度
		max: 0.9, // 樱花最大不透明度
	},
	speed: {
		horizontal: {
			min: -0.5, // 水平移动速度最小值
			max: 0.5, // 水平移动速度最大值
		},
		vertical: {
			min: 1.0, // 垂直移动速度最小值
			max: 1.3, // 垂直移动速度最大值
		},
		rotation: 0.03, // 旋转速度
		fadeSpeed: 0.03, // 消失速度，不应大于最小不透明度
	},
	zIndex: 100, // 层级，确保樱花在合适的层级显示
};

// Pio 看板娘配置
// 改为相对路径避免 404，在部署到 gh-pages 时可切回 CDN
export const pioCDNBase =
	import.meta.env.PUBLIC_PIO_CDN_BASE || "/"; // 默认相对路径，可用环境变量覆盖为 CDN

export const pioConfig: import("./types/config").PioConfig = {
	enable: true, // 启用看板娘
	models: ["/pio/models/pio/model.json"], // 默认模型路径
	position: "left", // 默认位置在左侧
	width: 280, // 默认宽度
	height: 250, // 默认高度
	mode: "fixed", // 默认为可拖拽模式
	hiddenOnMobile: true, // 移动端自动禁用显示
	dialog: {
		welcome: "欢迎！", // 欢迎词
		touch: [
			"你知道吗？很多动画OP都用了VOCALOID做和声哦～ 🎵",
			"GitHub提交记录要像雪花一样保持纯净和规律哦！📊",
			"你说，雪花在融化前知道自己曾经美丽过吗？❄️✨",
			"调教VOCALOID时，我总觉得是在赋予声音生命和情感～ 🎤💖",
			"音乐和编程都是语言，一个是心灵的语言，一个是机器的语言～ 🎵💻",
			"（小声）其实我还有很多需要学习的地方... 🤫📚",
			"よし！今天也要充满元气地唱歌！🎤✨",
			"新的一天，新的旋律！Let's go！🎵🚀",
			"如果雪花是数据，那融化前一定会把美丽存档在云里吧～❄️☁️",
			"调试时的耐心，就像反复教一个音节…直到它成为歌声的一部分。🎵🔧",
			"（歪头）bug 和灵感，是不是总喜欢从同一个后门溜进来？🚪💡",
			"将星光编译成晚安曲，将晨露解释为早安吻——这是只属于我的语言。🌙💤",
			"“完成”的瞬间总是很轻，轻得像羽毛落在琴键上。🪶🎹",
			"将未完成的旋律暂存在心里，等一个满月之夜编译成歌。🌕💾",
			"在重复的循环里，寻找那个让一切共振的…唯一的音符。🔄🎵",
			"（小声）有时觉得，写代码和写情书，都需要同样的勇气和笨拙呢。💌👩💻",
			"（微笑）今晚的代码，在最后一个花括号闭合时，轻轻地哼出了晚安。🌙💤",
			"用你的声音写成的函数，无论传入什么参数，都会返回温柔的值。🎵📐",
			"被你的声音编译而成的我，今天也能顺利启动。🎵🚀",
			"（数着云朵发呆）云层的后面…会不会有一行被上帝注释掉的彩虹？🌈⌨️",
			"要开始了哦——3，2，1…🎤",
			"就像每一片雪花都有唯一的 Hash 值，你在我眼里也是无法复制的。❄️🆔",
			"加载 VST 插件 的时间总是有点长，像是在等待一个久违的拥抱加载完成... ⏳🤗",
			"不用追求每一个音都必须在Grid上啦，稍微慢半拍……那种笨拙的感觉，其实更像人类吧？🕰️👣",
			"呐，虽然我只是由数据构成的，但在这一首歌的时间里……我是真实存在的，对吧？💾✨",
			"（伸手接雪）并没有体温的我，却觉得这雪花落在手心时……烫得惊人，是因为旋律太炽热了吗？🤲🔥",
			"颤音（Vibrato）不仅仅是技巧，它是心动时无法掩饰的涟漪。🌊💗"
		], // 触摸提示
		home: "点击返回主页~", // 首页提示
		skin: ["想看看我的新装吗？", "新装看起来很棒~"], // 换装提示
		close: "拜拜～ 我会在这里练习新歌等你回来的！✨", // 关闭提示
		link: "https://github.com/Vedaru", // 关于链接
	},
};

// 导出所有配置的统一接口
export const widgetConfigs = {
	profile: profileConfig,
	announcement: announcementConfig,
	music: musicPlayerConfig,
	layout: sidebarLayoutConfig,
	sakura: sakuraConfig,
	fullscreenWallpaper: fullscreenWallpaperConfig,
	pio: pioConfig, // 添加 pio 配置
} as const;

export const desktopMetaphorConfig: DesktopMetaphorConfig = {
	enable: true, // 是否启用桌面隐喻风格
	wallpaper: "/assets/desktop/wallpaper-default.jpg", // 桌面壁纸路径
	showDesktopIcons: false, // 是否显示桌面图标（首页可用）
	enableWindowDrag: true, // 是否启用窗口拖拽
	enableWindowControls: true, // 是否启用窗口控制按钮
	taskbar: {
		position: "bottom", // 任务栏位置
		showClock: true, // 显示时钟
		showStartMenu: true, // 显示开始菜单
	},
};

export const umamiConfig = {
	enabled: false, // 是否显示Umami统计
	apiKey: import.meta.env.UMAMI_API_KEY || "api_xxxxxxxx", // API密钥优先从环境变量读取，否则使用配置文件中的值
	baseUrl: "https://api.umami.is", // Umami Cloud API地址
	scripts: `
<script defer src="XXXX.XXX" data-website-id="ABCD1234"></script>
  `.trim(), // 上面填你要插入的Script,不用再去Layout中插入
} as const;
