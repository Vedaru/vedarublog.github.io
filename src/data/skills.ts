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
	description: string;
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
