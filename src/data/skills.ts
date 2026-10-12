// Skill data for the skills page.
//
// Unlike the theme's placeholder data, every entry here is grounded in a real
// source: the public repositories on github.com/Vedaru and git.vedaru.cn/Vedaru,
// the self-hosted server behind git.vedaru.cn, and the machine itself as
// described by the private chezmoi source of truth (dotfiles + Ansible).
//
// This page lists skills only — repository links belong on the projects page.
//
// `experience` is not hand-written — each skill records the month its first
// public evidence appeared, and `since()` turns that into years/months. Update
// the date, not the numbers.

import I18nKey from "../i18n/i18nKey";

export type SkillCategory =
	| "languages"
	| "systems"
	| "web"
	| "infra"
	| "tools"
	| "other";

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface Skill {
	id: string;
	name: string;
	/** 技能说明，中文（站点默认语言） */
	description: string;
	/** 英文说明（缺失时回退 description） */
	descriptionEn?: string;
	icon: string; // Iconify icon name
	category: SkillCategory;
	level: SkillLevel;
	experience: {
		years: number;
		months: number;
	};
	color?: string; // Skill card theme color
}

// The first month with a public repository on the account. Used for the
// overall "years of experience" figure displayed by the chart.
export const CAREER_START = "2025-12";

// Turns "YYYY-MM" into an experience object relative to today. Computed at
// build time so the page never carries a stale hard-coded duration.
const since = (ym: string): { years: number; months: number } => {
	const [year, month] = ym.split("-").map(Number);
	const now = new Date();
	let months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
	if (months < 0) months = 0;
	return { years: Math.floor(months / 12), months: months % 12 };
};

// Display order of the category sections and chart bars.
export const SKILL_CATEGORIES: SkillCategory[] = [
	"languages",
	"systems",
	"web",
	"infra",
	"tools",
	"other",
];

// Category -> i18n label key and chart color.
export const categoryMeta: Record<
	SkillCategory,
	{ i18nKey: I18nKey; color: string }
> = {
	languages: { i18nKey: I18nKey.skillsLanguages, color: "#8B5CF6" },
	systems: { i18nKey: I18nKey.skillsSystems, color: "#3B82F6" },
	web: { i18nKey: I18nKey.skillsWeb, color: "#06B6D4" },
	infra: { i18nKey: I18nKey.skillsInfra, color: "#F59E0B" },
	tools: { i18nKey: I18nKey.skillsTools, color: "#10B981" },
	other: { i18nKey: I18nKey.skillsOther, color: "#EC4899" },
};

export const skillsData: Skill[] = [
	// -------------------------------------------------------------------------
	// Languages
	// -------------------------------------------------------------------------
	{
		id: "cpp",
		name: "C++",
		description:
		"系统层 C++：给 Hyprland 合成器打补丁、修 Waydroid / Krita 的宿主集成，以及写原生小工具。",
		descriptionEn:
		"Systems-level C++: patching the Hyprland compositor, fixing Waydroid/Krita host integration, and building native desktop tools.",
		icon: "logos:c-plusplus",
		category: "languages",
		level: "advanced",
		experience: since("2026-06"),
		color: "#00599C",
	},
	{
		id: "rust",
		name: "Rust",
		description:
		"命令行与桌面应用：Tauri 2 + Svelte 前端、B 站直播 TUI、Wayland 剪贴板桥，以及游戏相关的小工具。",
		descriptionEn:
		"CLI and desktop apps: a Tauri 2 + Svelte frontend, a Bilibili live TUI, a Wayland clipboard bridge, and a game installer/updater.",
		icon: "logos:rust",
		category: "languages",
		level: "advanced",
		experience: since("2026-08"),
		color: "#CE422B",
	},
	{
		id: "python",
		name: "Python",
		description:
		"落地型 AI 与自动化：本地语音 / 大模型虚拟主机、小目标检测训练，以及 GitHub Actions 脚本。",
		descriptionEn:
		"Applied AI and automation: a local voice/LLM virtual host, small-target detection training, and the GitHub Actions mirroring job.",
		icon: "logos:python",
		category: "languages",
		level: "advanced",
		experience: since("2025-12"),
		color: "#3776AB",
	},
	{
		id: "typescript",
		name: "TypeScript",
		description:
		"在 Astro、Svelte、Vue 代码库里写类型安全的 Web 代码，从本站到协作型网页客户端。",
		descriptionEn:
		"Type-safe web work across Astro, Svelte and Vue codebases, from this blog to collaborative web clients and tooling.",
		icon: "logos:typescript-icon",
		category: "languages",
		level: "advanced",
		experience: since("2025-12"),
		color: "#3178C6",
	},
	{
		id: "shell",
		name: "Shell / Bash",
		description:
		"整台机器的复原路径：固定版本并用 sha256 校验下载的引导脚本，以及公开发布脚本。",
		descriptionEn:
		"The restore path for this whole machine: a bootstrap script that pins and sha256-verifies downloads, plus publish and mirroring scripts.",
		icon: "simple-icons:gnubash",
		category: "languages",
		level: "expert",
		experience: since("2026-01"),
		color: "#4EAA25",
	},
	{
		id: "lua",
		name: "Lua",
		description:
		"把配置当代码：Lua 配置的 Hyprland 环境，以及带独立插件集的 LazyVim 风格 Neovim 配置。",
		descriptionEn:
		"Configuration as code: a Lua-configured Hyprland setup and a LazyVim-based Neovim config with its own plugin set.",
		icon: "simple-icons:lua",
		category: "languages",
		level: "advanced",
		experience: since("2026-06"),
		color: "#2C2D72",
	},
	{
		id: "kotlin",
		name: "Kotlin",
		description:
		"Android / JVM 方向的尝试：课程作业工具，以及给一个纯 Kotlin 的跨平台动漫客户端做贡献。",
		descriptionEn:
		"Android / JVM experiments, including coursework tooling and contribution to a 100% Kotlin cross-platform anime app.",
		icon: "logos:kotlin-icon",
		category: "languages",
		level: "intermediate",
		experience: since("2026-08"),
		color: "#7F52FF",
	},
	{
		id: "c",
		name: "C",
		description:
		"小而精的 C 工具，以及系统代码库里的阅读与修补式改进。",
		descriptionEn:
		"Small, sharp C utilities and read-and-patch fixes in systems codebases.",
		icon: "logos:c",
		category: "languages",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#A8B9CC",
	},
	{
		id: "javascript",
		name: "JavaScript",
		description:
		"浏览器与运行时 JavaScript：包括 GNOME Shell 内存泄漏修复和容器化的 API / 评论服务。",
		descriptionEn:
		"Browser and runtime JavaScript, including a GNOME Shell memory-leak fix and containerized API/comment services.",
		icon: "logos:javascript",
		category: "languages",
		level: "intermediate",
		experience: since("2025-12"),
		color: "#F7DF1E",
	},
	{
		id: "go",
		name: "Go",
		description:
		"读懂并修补 Go 代码库；仍是我用得最少的一门语言。",
		descriptionEn:
		"Reading and patching Go codebases; still the language I reach for least.",
		icon: "logos:go",
		category: "languages",
		level: "beginner",
		experience: since("2026-03"),
		color: "#00ADD8",
	},

	// -------------------------------------------------------------------------
	// Systems & Desktop
	// -------------------------------------------------------------------------
	{
		id: "linux",
		name: "Linux",
		description:
		"日常主力平台：Ubuntu 装机、apt / dpkg 内部机制、服务管理、防火墙与在线升级。",
		descriptionEn:
		"Daily driver and main platform: Ubuntu provisioning, apt/dpkg internals, service management, firewall and live debugging.",
		icon: "logos:linux-tux",
		category: "systems",
		level: "expert",
		experience: since("2025-12"),
		color: "#FCC624",
	},
	{
		id: "hyprland",
		name: "Hyprland / Wayland",
		description:
		"手工搭起来的 Wayland 桌面 —— 合成器、状态栏、启动器、锁屏 / 空闲、通知 —— 并持续给上游维护补丁。",
		descriptionEn:
		"A hand-built Wayland desktop — compositor, bar, launcher, lock/idle, notifications — with patches carried against Hyprland itself.",
		icon: "simple-icons:hyprland",
		category: "systems",
		level: "expert",
		experience: since("2026-06"),
		color: "#58E1FF",
	},
	{
		id: "neovim",
		name: "Neovim",
		description:
		"主力编辑器：基于 LazyVim 的配置，插件集经过挑选，并打成固定版本的归档以便离线使用。",
		descriptionEn:
		"Primary editor: a LazyVim-based config with a curated plugin set, vendored as a single pinned archive for offline restores.",
		icon: "simple-icons:neovim",
		category: "systems",
		level: "expert",
		experience: since("2026-06"),
		color: "#57A143",
	},
	{
		id: "systemd",
		name: "systemd",
		description:
		"桌面栈的系统级与用户级 unit，以及用自建方案替换默认显示管理器所需的依赖顺序。",
		descriptionEn:
		"System and user units for the desktop stack, plus the ordering needed to replace a stock display manager with ly.",
		icon: "mdi:cogs",
		category: "systems",
		level: "advanced",
		experience: since("2026-09"),
		color: "#30D475",
	},
	{
		id: "pipewire",
		name: "PipeWire / Audio",
		description:
		"音频栈相关：滤镜链、WirePlumber、给 Ardour 的 ALSA 设备占用补丁，以及内核音频补丁。",
		descriptionEn:
		"Audio stack work: filter chains, WirePlumber, an ALSA device-reservation patch for Ardour, and a kernel audio patch recipe.",
		icon: "mdi:music",
		category: "systems",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#4A8FE7",
	},
	{
		id: "kernel",
		name: "Kernel / Low-level",
		description:
		"自编译内核：音频补丁加精简 .config，打包成可复现的配方，因为产物本身不进仓库。",
		descriptionEn:
		"Custom kernel builds: audio patch plus a trimmed .config, packaged as a reproducible recipe because the artifacts are too large to mirror.",
		icon: "mdi:chip",
		category: "systems",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#8B5CF6",
	},
	{
		id: "gpu",
		name: "GPU / Graphics",
		description:
		"硬件加速的采集与渲染：GPU 录屏、OBS 管线，以及 GLSL / WGSL 着色器。",
		descriptionEn:
		"Hardware-accelerated capture and rendering: GPU screen recording, OBS pipelines, and GLSL/WGSL shader work.",
		icon: "mdi:video",
		category: "systems",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#E11D48",
	},
	{
		id: "packaging",
		name: "Linux Packaging",
		description:
		"打包：厂商 .deb、手工构建的包、dpkg 基线与清理逻辑，外加自建仓库对外提供固定版本的包。",
		descriptionEn:
		"Vendor .debs, hand-built packages, dpkg baselines and purge logic — plus a self-hosted registry serving pinned, checksum-verified tarballs.",
		icon: "mdi:package-variant",
		category: "systems",
		level: "advanced",
		experience: since("2026-09"),
		color: "#E95420",
	},

	// -------------------------------------------------------------------------
	// Web & Frontend
	// -------------------------------------------------------------------------
	{
		id: "astro",
		name: "Astro",
		description:
		"本站：内容量偏大的 Astro 构建，含 islands、i18n、容器查询与搜索索引。",
		descriptionEn:
		"This site: a content-heavy Astro build with islands, i18n, container queries and a search index.",
		icon: "logos:astro-icon",
		category: "web",
		level: "advanced",
		experience: since("2025-12"),
		color: "#FF5D01",
	},
	{
		id: "tailwindcss",
		name: "Tailwind CSS",
		description:
		"原子化样式：暗色模式、主题变量与自定义容器查询布局。",
		descriptionEn:
		"Utility-first styling with dark mode, theming variables and custom container-query layouts.",
		icon: "logos:tailwindcss-icon",
		category: "web",
		level: "advanced",
		experience: since("2025-12"),
		color: "#06B6D4",
	},
	{
		id: "svelte",
		name: "Svelte",
		description:
		"桌面应用的交互前端：包括自建媒体客户端的 Tauri 2 + Svelte 界面。",
		descriptionEn:
		"Interactive frontends for desktop apps, including the Tauri 2 + Svelte UI of a self-hosted media client.",
		icon: "logos:svelte-icon",
		category: "web",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#FF3E00",
	},
	{
		id: "vue",
		name: "Vue",
		description:
		"参与并改造 Vue 3 网页客户端，包括一个跨平台聊天客户端。",
		descriptionEn:
		"Contributing to and adapting Vue 3 web clients, including a cross-platform chat client.",
		icon: "logos:vue",
		category: "web",
		level: "intermediate",
		experience: since("2026-03"),
		color: "#4FC08D",
	},

	// -------------------------------------------------------------------------
	// Infrastructure & Automation
	// -------------------------------------------------------------------------
	{
		id: "ansible",
		name: "Ansible",
		description:
		"把机器的系统层写成代码：apt 源、软件包、文件、flatpak 与服务，可在一台新机上重放。",
		descriptionEn:
		"The machine's system layer as code: apt sources, packages, files, flatpaks and services, replayed onto a fresh install.",
		icon: "logos:ansible",
		category: "infra",
		level: "advanced",
		experience: since("2026-09"),
		color: "#EE0000",
	},
	{
		id: "chezmoi",
		name: "chezmoi / Dotfiles",
		description:
		"$HOME 下的一切用单一事实源管理，带模板与 age 加密的私密信息，可随仓库一起带走。",
		descriptionEn:
		"Everything under $HOME managed as a single source of truth, with templates and age-encrypted secrets that travel with the repo.",
		icon: "mdi:home-edit",
		category: "infra",
		level: "expert",
		experience: since("2026-06"),
		color: "#1A73E8",
	},
	{
		id: "home-server",
		name: "Home Server",
		description:
		"一台旧笔记本常驻当服务器：托管着其余部分依赖的代码服务与软件仓库。",
		descriptionEn:
		"An old laptop kept running as an always-on server — it hosts the forge and the package registry the rest of this setup depends on, published through a Cloudflare tunnel.",
		icon: "mdi:server",
		category: "infra",
		level: "advanced",
		experience: since("2026-09"),
		color: "#64748B",
	},
	{
		id: "forgejo",
		name: "Forgejo / Self-hosting",
		description:
		"在那台服务器上自己跑 Git 服务：仓库、API 驱动的自动化，以及对外服务的通用软件仓库。",
		descriptionEn:
		"Running my own Forge on that server: repositories, API-driven automation, and a generic package registry that mirrors GFW-blocked artifacts.",
		icon: "simple-icons:forgejo",
		category: "infra",
		level: "advanced",
		experience: since("2026-09"),
		color: "#FB923C",
	},
	{
		id: "github-actions",
		name: "GitHub Actions / CI",
		description:
		"定时工作流：在不限速的 runner 上拉取并发布镜像产物到自建仓库。",
		descriptionEn:
		"A scheduled workflow running on an unrestricted runner to fetch and publish mirrored artifacts into the self-hosted registry.",
		icon: "simple-icons:github",
		category: "infra",
		level: "advanced",
		experience: since("2026-09"),
		color: "#2088FF",
	},
	{
		id: "cloudflare",
		name: "Cloudflare",
		description:
		"自建代码服务前面的隧道与边缘行为，包括绕过缓存与上传大小限制的坑。",
		descriptionEn:
		"Tunnels and edge behavior in front of the self-hosted forge, including cache and upload-limit quirks worked around in code.",
		icon: "simple-icons:cloudflare",
		category: "infra",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#F38020",
	},
	{
		id: "networking",
		name: "Networking & Proxies",
		description:
		"墙内的可达性工程：TUN 模式策略路由、IPv4 固定、镜像选择与实测数据。",
		descriptionEn:
		"Reachability engineering behind the GFW: TUN-mode policy routing, IPv4 pinning, mirror selection and measured latency/status checks.",
		icon: "mdi:lan",
		category: "infra",
		level: "advanced",
		experience: since("2026-09"),
		color: "#0EA5E9",
	},
	{
		id: "age",
		name: "Secrets / age",
		description:
		"凭据管理：用 age 加密的文件，私钥刻意不进仓库。",
		descriptionEn:
		"Managing credentials as age-encrypted files whose identity is deliberately kept out of the repository.",
		icon: "mdi:shield-lock",
		category: "infra",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#6366F1",
	},
	{
		id: "podman",
		name: "Podman / Containers",
		description:
		"无 root 容器与仓库，通过桌面栈配置；能容器化的服务就跑在容器里。",
		descriptionEn:
		"Rootless containers and registries configured through the desktop stack; services run containerized where it helps.",
		icon: "simple-icons:podman",
		category: "infra",
		level: "intermediate",
		experience: since("2026-08"),
		color: "#892CA0",
	},

	// -------------------------------------------------------------------------
	// Development Tools
	// -------------------------------------------------------------------------
	{
		id: "git",
		name: "Git",
		description:
		"跨两个代码托管平台的分布式版本控制，含 submodule、加密凭据，历史即事实源。",
		descriptionEn:
		"Distributed version control across two forges, with submodules, encrypted credentials and history kept as the source of truth.",
		icon: "logos:git-icon",
		category: "tools",
		level: "expert",
		experience: since("2025-12"),
		color: "#F05032",
	},
	{
		id: "ffmpeg",
		name: "FFmpeg",
		description:
		"桌面录屏与媒体播放的采集、转码管线。",
		descriptionEn:
		"Capture and transcode pipelines for screen recording and media playback on the desktop.",
		icon: "simple-icons:ffmpeg",
		category: "tools",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#007808",
	},
	{
		id: "obsidian",
		name: "Obsidian",
		description:
		"纳入版本管理的笔记与文档库，通过自建代码服务同步。",
		descriptionEn:
		"A version-controlled knowledge vault of notes and documentation, synced through the self-hosted forge.",
		icon: "simple-icons:obsidian",
		category: "tools",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#7C3AED",
	},

	// -------------------------------------------------------------------------
	// Other
	// -------------------------------------------------------------------------
	{
		id: "ai",
		name: "AI / LLM Integration",
		description:
		"用本地模型做东西：语音识别、带记忆层的大模型、agent 框架与 MCP 工具。",
		descriptionEn:
		"Building with local models: speech recognition, an LLM with a memory layer, agent frameworks and MCP tooling.",
		icon: "mdi:robot-outline",
		category: "other",
		level: "intermediate",
		experience: since("2026-01"),
		color: "#10B981",
	},
	{
		id: "computer-vision",
		name: "Computer Vision",
		description:
		"为反无人机平台训练与调优小目标检测模型。",
		descriptionEn:
		"Training and tuning small-target detection models for a counter-UAV platform.",
		icon: "mdi:eye-outline",
		category: "other",
		level: "intermediate",
		experience: since("2025-12"),
		color: "#F97316",
	},
	{
		id: "technical-writing",
		name: "Technical Writing",
		description:
		"长篇 README 与清单，让一台机器可复现 —— 包括实测基准与取舍理由。",
		descriptionEn:
		"Long-form READMEs and manifests that make a machine reproducible — including measured benchmarks and the reasoning behind each choice.",
		icon: "simple-icons:markdown",
		category: "other",
		level: "advanced",
		experience: since("2025-12"),
		color: "#0EA5E9",
	},
	{
		id: "cjk-input",
		name: "CJK Input / i18n",
		description:
		"fcitx5 输入法配置及其所需的桌面集成，细到为候选窗口携带合成器补丁。",
		descriptionEn:
		"fcitx5 input setup and the desktop integration it needs, down to carrying a compositor patch for candidate-window behaviour.",
		icon: "mdi:keyboard",
		category: "other",
		level: "intermediate",
		experience: since("2026-09"),
		color: "#EC4899",
	},
];

// Get skill statistics
export const getSkillStats = () => {
	const total = skillsData.length;
	const byLevel = {
		beginner: skillsData.filter((s) => s.level === "beginner").length,
		intermediate: skillsData.filter((s) => s.level === "intermediate").length,
		advanced: skillsData.filter((s) => s.level === "advanced").length,
		expert: skillsData.filter((s) => s.level === "expert").length,
	};
	const byCategory = SKILL_CATEGORIES.reduce(
		(acc, category) => {
			acc[category] = skillsData.filter(
				(s) => s.category === category,
			).length;
			return acc;
		},
		{} as Record<SkillCategory, number>,
	);

	return { total, byLevel, byCategory };
};

// Get skills by category
export const getSkillsByCategory = (category?: SkillCategory) => {
	if (!category) {
		return skillsData;
	}
	return skillsData.filter((s) => s.category === category);
};

// Get advanced skills
export const getAdvancedSkills = () => {
	return skillsData.filter(
		(s) => s.level === "advanced" || s.level === "expert",
	);
};

// Calculate total years of experience from the first public repository.
export const getTotalExperience = () => {
	return since(CAREER_START);
};

// Categories that actually hold at least one skill, in display order.
export const getActiveCategories = () => {
	const stats = getSkillStats();
	return SKILL_CATEGORIES.filter((category) => stats.byCategory[category] > 0);
};
