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
	description: string;
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
