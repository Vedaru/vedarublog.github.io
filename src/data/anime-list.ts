import fs from "node:fs";
import path from "node:path";
import { siteConfig } from "../config";
import localAnimeList from "./anime";

/**
 * 番剧条目结构：页面渲染与岛屿 props 都基于它。
 * 与 localAnimeList 的 AnimeItem 兼容（后者是其超集）。
 */
export interface AnimeEntry {
	title: string;
	cover: string;
	link: string;
	status: string;
	rating: number;
	progress: number;
	totalEpisodes: number;
	description: string;
	year: string;
	studio: string;
	genre: string[];
}

export const ANIME_MODE = siteConfig.anime?.mode || "bangumi";
export const BANGUMI_USER_ID = siteConfig.bangumi?.userId || "your-user-id";

/** 首屏渲染条数；其余在岛屿滚动到哨兵时按批揭示（全量数据已随 props 下发）。 */
export const INITIAL_DISPLAY_COUNT = 24;

let cachedList: AnimeEntry[] | null = null;

/** 读取番剧数据：local 模式读本地列表，bangumi 模式读构建期生成的 JSON。 */
export function loadAnimeList(): AnimeEntry[] {
	if (cachedList) return cachedList;

	if (ANIME_MODE === "local") {
		cachedList = localAnimeList as AnimeEntry[];
		return cachedList;
	}

	// 开发环境默认跳过 Bangumi 数据加载，避免每次启动都读大文件。
	if (import.meta.env.DEV && !(siteConfig.bangumi?.fetchOnDev ?? false)) {
		console.log("[Dev] Skipping Bangumi data load (fetchOnDev is off).");
		cachedList = [];
		return cachedList;
	}

	try {
		const dataPath = path.join(process.cwd(), "src/data/bangumi-data.json");
		if (fs.existsSync(dataPath)) {
			const rawData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
			cachedList = (rawData as any[]).map((item) => ({
				title: item.title || "Unknown",
				cover: item.cover || "",
				link: item.link || "",
				status: item.status || "planned",
				rating: Number(item.rating) || 0,
				progress: Number(item.progress) || 0,
				totalEpisodes: Number(item.totalEpisodes) || 12,
				description: item.description || "",
				year: item.year || "",
				studio: item.studio || "",
				genre: Array.isArray(item.genre) ? item.genre : [],
			}));
			return cachedList;
		}
		console.warn(`Bangumi data file not found at ${dataPath}.`);
	} catch (error) {
		console.error("Failed to load anime data:", error);
	}

	cachedList = [];
	return cachedList;
}
