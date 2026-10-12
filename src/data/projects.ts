// Project data for the projects page.
//
// Every entry below is a public first-party repository: either on
// github.com/Vedaru or on the self-hosted Forgejo at git.vedaru.cn/Vedaru.
// Mirrors, vendored snapshots and forks of other people's projects are
// deliberately not listed — those are upstream work, not mine.
//
// `startDate` is the repository's real creation date, and every `links` URL
// points at an existing repository. Nothing on this page is invented.

export interface ProjectLink {
	url: string;
	/**
	 * "live" renders the theme-gradient "visit" button; "github" and "forgejo"
	 * render the brand-coloured source button for that host.
	 */
	kind: "live" | "github" | "forgejo";
}

export interface Project {
	id: string;
	title: string;
	/** 项目简介，中文（站点默认语言） */
	description: string;
	/** 英文简介（缺失时回退 description） */
	descriptionEn?: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	links: ProjectLink[];
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
}

export const projectsData: Project[] = [
	// -------------------------------------------------------------------------
	// Web
	// -------------------------------------------------------------------------
	{
		id: "vedarublog",
		title: "vedarublog",
		description:
			"本站：内容量偏大的 Astro 站点，用上了 islands、i18n、容器查询和客户端搜索索引。",
		descriptionEn:
			"This blog: a content-heavy Astro site with islands, i18n, container queries and a client-side search index.",
		image: "",
		category: "web",
		techStack: ["Astro", "TypeScript", "Tailwind CSS", "Svelte"],
		status: "completed",
		links: [
			{ url: "https://www.vedaru.cn", kind: "live" },
			{ url: "https://github.com/Vedaru/vedarublog.github.io", kind: "github" },
		],
		startDate: "2025-12-20",
		featured: true,
		tags: ["Blog", "Web", "Astro"],
	},

	// -------------------------------------------------------------------------
	// Desktop & Systems
	// -------------------------------------------------------------------------
	{
		id: "kuro",
		title: "kuro",
		description:
			"为库洛游戏（鸣潮、战双帕弥什）写的原生 Linux 安装与更新器，完全不依赖 Wine。",
		descriptionEn:
			"Native Linux installer and updater for Kuro Games titles (Wuthering Waves, Punishing: Gray Raven) — no Wine involved.",
		image: "",
		category: "desktop",
		techStack: ["Rust", "Linux"],
		status: "in-progress",
		links: [
			{ url: "https://github.com/Vedaru/kuro", kind: "github" },
			{ url: "https://git.vedaru.cn/Vedaru/kuro", kind: "forgejo" },
		],
		startDate: "2026-08-20",
		featured: true,
		tags: ["Desktop", "Rust", "Linux"],
	},
	{
		id: "aniko",
		title: "aniko",
		description:
			"面向 Linux 的 Animeko 客户端：Tauri 2 + Svelte 前端配 Rust 内核，在 Wayland 下通过进程内 libmpv 渲染。",
		descriptionEn:
			"A Linux-first Animeko interface: a Tauri 2 + Svelte frontend over a Rust core, rendering through in-process libmpv on Wayland.",
		image: "",
		category: "desktop",
		techStack: ["Rust", "Tauri", "Svelte", "libmpv", "Wayland"],
		status: "in-progress",
		links: [{ url: "https://git.vedaru.cn/Vedaru/aniko", kind: "forgejo" }],
		startDate: "2026-09-19",
		featured: true,
		tags: ["Desktop", "Rust", "Wayland"],
	},
	{
		id: "bili-tui",
		title: "bili-tui",
		description:
			"B 站直播的极简终端工具。",
		descriptionEn:
			"Minimal terminal-based tool for Bilibili live streams.",
		image: "",
		category: "desktop",
		techStack: ["Rust", "TUI"],
		status: "completed",
		links: [{ url: "https://git.vedaru.cn/Vedaru/bili-tui", kind: "forgejo" }],
		startDate: "2026-09-13",
		tags: ["Desktop", "Rust", "TUI"],
	},
	{
		id: "waydroid-hwc2-resize-fix",
		title: "waydroid-hwc2-resize-fix",
		description:
			"让 Waydroid 全屏界面能实时跟随窗口缩放：给 Waydroid 自己的 composer HAL（HWC2-on-HWC1 适配层）打的补丁，让安卓重排界面，而不是留一块黑区。",
		descriptionEn:
			"Makes the Waydroid full-UI window resize live: a patch to Waydroid's own composer HAL (the HWC2-on-HWC1 adapter) so Android reflows its UI instead of leaving a black block.",
		image: "",
		category: "desktop",
		techStack: ["C++", "Android", "Waydroid", "Wayland"],
		status: "completed",
		links: [
			{
				url: "https://github.com/Vedaru/waydroid-hwc2-resize-fix",
				kind: "github",
			},
		],
		startDate: "2026-09-11",
		featured: true,
		tags: ["Desktop", "C++", "Waydroid"],
	},
	{
		id: "gnome-shell-unlock-dialog-memory-leak",
		title: "gnome-shell-unlock-dialog-memory-leak",
		description:
			"修掉 GNOME Shell 50.1 锁屏界面每轮 4-10 MB 的内存泄漏：复用解锁对话框，而不是每轮重建。",
		descriptionEn:
			"Fixes a 4-10 MB/cycle memory leak in GNOME Shell 50.1's screen shield by reusing the unlock dialog instead of rebuilding it.",
		image: "",
		category: "desktop",
		techStack: ["JavaScript", "GNOME Shell", "GJS"],
		status: "completed",
		links: [
			{
				url: "https://github.com/Vedaru/gnome-shell-unlock-dialog-memory-leak",
				kind: "github",
			},
		],
		startDate: "2026-07-31",
		tags: ["Desktop", "JavaScript", "GNOME"],
	},

	// -------------------------------------------------------------------------
	// Other
	// -------------------------------------------------------------------------
	{
		id: "yolov5-training",
		title: "YOLOv5-training",
		description:
			"小目标识别模型的训练流程。",
		descriptionEn:
			"A training programme for small-target-identification models.",
		image: "",
		category: "other",
		techStack: ["Python", "PyTorch", "YOLOv5", "Computer Vision"],
		status: "completed",
		links: [
			{ url: "https://github.com/Vedaru/YOLOv5-training", kind: "github" },
		],
		startDate: "2025-12-16",
		tags: ["AI", "Computer Vision", "Python"],
	},
	{
		id: "local-project",
		title: "Local-project",
		description:
			"本地 AI 虚拟主机，把语音识别、大模型、记忆系统和语音合成串在一起。",
		descriptionEn:
			"A local AI virtual host integrating speech recognition, an LLM, a memory system and voice synthesis.",
		image: "",
		category: "other",
		techStack: ["Python", "LLM", "Speech Recognition", "TTS"],
		status: "in-progress",
		links: [{ url: "https://github.com/Vedaru/Local-project", kind: "github" }],
		startDate: "2026-01-31",
		tags: ["AI", "LLM", "Python"],
	},
	{
		id: "mimo-cursor-tunnel",
		title: "Mimo-cursor-tunnel",
		description:
			"绕过 Cursor 的 MiMo 思考模式 400 错误：该模式下 reasoning_content 会从请求里被丢掉。",
		descriptionEn:
			"Works around a 400 error in Cursor's MiMo thinking mode, where reasoning_content is dropped from the request.",
		image: "",
		category: "other",
		techStack: ["Python", "Cursor", "API"],
		status: "completed",
		links: [
			{ url: "https://github.com/Vedaru/Mimo-cursor-tunnel", kind: "github" },
		],
		startDate: "2026-05-18",
		tags: ["AI", "Tooling", "Python"],
	},
	{
		id: "nvim-config",
		title: "nvim-config",
		description:
			"基于 LazyVim 的 Neovim 配置，插件集经过挑选，从 chezmoi 抽出后以 submodule 的方式挂回去。",
		descriptionEn:
			"LazyVim-based Neovim configuration with a curated plugin set, extracted from chezmoi and mounted there as a submodule.",
		image: "",
		category: "other",
		techStack: ["Lua", "Neovim", "LazyVim"],
		status: "completed",
		links: [
			{ url: "https://git.vedaru.cn/Vedaru/nvim-config", kind: "forgejo" },
		],
		startDate: "2026-09-14",
		tags: ["Dotfiles", "Neovim", "Lua"],
	},
	{
		id: "dotfiles",
		title: "dotfiles",
		description:
			"chezmoi 管理的 dotfiles 层公开备份。",
		descriptionEn:
			"Public backup of the chezmoi-managed dotfiles layer.",
		image: "",
		category: "other",
		techStack: ["Lua", "Shell", "chezmoi"],
		status: "completed",
		links: [{ url: "https://github.com/Vedaru/dotfiles", kind: "github" }],
		startDate: "2026-06-14",
		tags: ["Dotfiles", "Linux"],
	},
	{
		id: "scripts",
		title: "scripts",
		description:
			"引导、发布与镜像同步脚本 —— 这台机器环境的复原路径。",
		descriptionEn:
			"Bootstrap, publish and mirroring scripts — the restore path for this machine's setup.",
		image: "",
		category: "other",
		techStack: ["Shell", "Bash"],
		status: "completed",
		links: [{ url: "https://git.vedaru.cn/Vedaru/scripts", kind: "forgejo" }],
		startDate: "2026-09-07",
		tags: ["Automation", "Shell", "Linux"],
	},
];

// Get project statistics
export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter(
		(p) => p.status === "completed",
	).length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total,
		byStatus: {
			completed,
			inProgress,
			planned,
		},
	};
};

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
