import { siteConfig } from "../../config";
import localAnimeList from "../../data/anime";
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";

interface AnimeItem {
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

const ANIME_MODE = siteConfig.anime?.mode || "bangumi";
const BANGUMI_USER_ID = siteConfig.bangumi?.userId || "your-user-id";
const INITIAL_DISPLAY_COUNT = 24;

let cachedList: AnimeItem[] | null = null;

function loadAnimeList(): AnimeItem[] {
	if (cachedList) return cachedList;
	if (ANIME_MODE === "local") {
		cachedList = localAnimeList as AnimeItem[];
		return cachedList;
	}
	try {
		const dataPath = path.join(
			process.cwd(),
			"src/data/bangumi-data.json",
		);
		if (fs.existsSync(dataPath)) {
			const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
			cachedList = (raw as any[]).map((item) => ({
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
	} catch (e) {
		console.error("Failed to load anime data:", e);
	}
	cachedList = [];
	return cachedList;
}

export const GET: APIRoute = () => {
	if (ANIME_MODE !== "local" && BANGUMI_USER_ID === "your-user-id") {
		return new Response(JSON.stringify({ items: [] }), {
			headers: { "Content-Type": "application/json" },
		});
	}
	const hidden = loadAnimeList().slice(INITIAL_DISPLAY_COUNT);
	return new Response(JSON.stringify({ items: hidden }), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=3600",
		},
	});
};