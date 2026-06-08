import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchBangumi } from "./bangumi-fetch.mjs";
import { loadEnv } from "./load-env.js";

loadEnv();

const API_BASE = "https://api.bgm.tv";
const FETCH_TIMEOUT_MS = 20_000;
const CONFIG_PATH = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/config.ts",
);
const OUTPUT_FILE = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/data/bangumi-data.json",
);
const COVER_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	"../public/assets/anime/cover",
);

async function getUserIdFromConfig() {
	try {
		const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
		const match = configContent.match(
			/bangumi:\s*\{[\s\S]*?userId:\s*["']([^"']+)["']/,
		);

		if (match && match[1]) {
			const userId = match[1];
			if (
				userId === "your-bangumi-id" ||
				userId === "your-user-id" ||
				!userId
			) {
				console.warn(
					"Warning: userId in src/config.ts appears to be a default value.",
				);
				return userId;
			}
			return userId;
		}
		throw new Error("Could not find bangumi.userId in src/config.ts");
	} catch (error) {
		console.error("✘ Failed to read Bangumi ID from src/config.ts");
		throw error;
	}
}

async function getAnimeModeFromConfig() {
	try {
		const configContent = await fs.readFile(CONFIG_PATH, "utf-8");
		const match = configContent.match(
			/anime:\s*\{[\s\S]*?mode:\s*["']([^"']+)["']/,
		);

		if (match && match[1]) {
			return match[1];
		}
		return "bangumi";
	} catch (error) {
		return "bangumi";
	}
}

// 模拟延迟防止 API 限制
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBgm(url) {
	return fetchBangumi(url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
}

function getFetchErrorCode(error) {
	return error?.cause?.code || error?.code || "";
}

function formatFetchError(error) {
	const code = getFetchErrorCode(error);
	return code ? `${error.message} (code=${code})` : error.message;
}

function printNetworkHelp(errorText) {
	const proxy = process.env.BANGUMI_PROXY;
	console.error(
		"提示: /calendar 能打开不代表 /v0/* 可直连，v0 接口在国内通常需要代理。",
	);

	if (errorText.includes("ECONNREFUSED")) {
		console.error(
			`代理连接被拒绝${proxy ? `（当前 BANGUMI_PROXY=${proxy}）` : ""}：`,
		);
		console.error("  1. 确认 Clash / V2Ray 等代理软件已启动");
		console.error(
			"  2. 在代理软件设置里查看 HTTP 代理端口（常见 7890、7897、10809，不一定是 7890）",
		);
		console.error(
			"  3. 在 .env 写入正确端口，例如 BANGUMI_PROXY=http://127.0.0.1:7897",
		);
		return;
	}

	if (errorText.includes("CONNECT_TIMEOUT") || errorText.includes("ETIMEDOUT")) {
		if (!proxy) {
			console.error(
				"当前为直连（未设置 BANGUMI_PROXY），请在 .env 添加代理，例如：",
			);
			console.error("  BANGUMI_PROXY=http://127.0.0.1:7890");
		} else {
			console.error(
				`已配置代理但仍超时（BANGUMI_PROXY=${proxy}），请检查代理规则是否放行 api.bgm.tv`,
			);
		}
	}
}

async function probeV0Api(userId) {
	const url = `${API_BASE}/v0/users/${userId}/collections?subject_type=2&type=3&limit=1&offset=0`;
	try {
		const response = await fetchBgm(url);
		return { ok: response.ok, status: response.status };
	} catch (error) {
		return { ok: false, error: formatFetchError(error) };
	}
}

async function readExistingDataCount() {
	try {
		const raw = await fs.readFile(OUTPUT_FILE, "utf-8");
		const data = JSON.parse(raw);
		return Array.isArray(data) ? data.length : 0;
	} catch {
		return 0;
	}
}

async function fetchSubjectDetail(subjectId) {
	try {
		const response = await fetchBgm(`${API_BASE}/v0/subjects/${subjectId}`);
		if (!response.ok) return null;
		return await response.json();
	} catch (error) {
		return null;
	}
}

function getStudioFromInfobox(infobox) {
	if (!Array.isArray(infobox)) return "Unknown";

	const targetKeys = ["动画制作", "制作", "製作", "开发"];

	for (const key of targetKeys) {
		const item = infobox.find((i) => i.key === key);
		if (item) {
			if (typeof item.value === "string") {
				return item.value;
			}
			if (Array.isArray(item.value)) {
				const validItem = item.value.find((v) => v.v);
				if (validItem) return validItem.v;
			}
		}
	}
	return "Unknown";
}

async function fetchCollection(userId, type) {
	let allData = [];
	let offset = 0;
	const limit = 50;
	let hasMore = true;

	console.log(`Fetching type: ${type}...`);

	while (hasMore) {
		const url = `${API_BASE}/v0/users/${userId}/collections?subject_type=2&type=${type}&limit=${limit}&offset=${offset}`;
		try {
			const response = await fetchBgm(url);

			if (!response.ok) {
				if (response.status === 404) {
					console.log(
						`   User ${userId} does not exist or has no data of this type.`,
					);
					return [];
				}
				throw new Error(`API Error ${response.status}`);
			}

			const data = await response.json();

			if (data.data && data.data.length > 0) {
				allData = [...allData, ...data.data];
				process.stdout.write(
					`   Fetched ${allData.length} records...\r`,
				);
			}

			if (!data.data || data.data.length < limit) {
				hasMore = false;
			} else {
				offset += limit;
				await delay(300);
			}
		} catch (e) {
			console.error(`\nFetch failed (Type ${type}):`, formatFetchError(e));
			hasMore = false;
		}
	}
	console.log("");
	return allData;
}

async function downloadCover(subjectId, remoteUrl) {
	if (!remoteUrl || !subjectId) {
		return "/assets/anime/default.webp";
	}

	const coverFilename = `${subjectId}.jpg`;
	const coverPath = path.join(COVER_DIR, coverFilename);
	const localUrl = `/assets/anime/cover/${coverFilename}`;

	if (fssync.existsSync(coverPath)) {
		return localUrl;
	}

	try {
		const response = await fetchBangumi(remoteUrl, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				Accept: "image/*",
				Referer: "https://bgm.tv/",
			},
		});
		if (response.ok) {
			const buffer = Buffer.from(await response.arrayBuffer());
			await fs.mkdir(COVER_DIR, { recursive: true });
			await fs.writeFile(coverPath, buffer);
			return localUrl;
		}
		console.warn(
			`\n⚠ Failed to download cover ${subjectId}: HTTP ${response.status}`,
		);
	} catch (error) {
		console.warn(
			`\n⚠ Error downloading cover ${subjectId}: ${formatFetchError(error)}`,
		);
	}

	return remoteUrl;
}

async function processData(items, status) {
	const results = [];
	let count = 0;
	const total = items.length;

	for (const item of items) {
		count++;
		process.stdout.write(
			`[${status}] Processing progress: ${count}/${total} (${item.subject_id})\r`,
		);

		const subjectDetail = await fetchSubjectDetail(item.subject_id);
		await delay(150);

		const year = item.subject?.date
			? item.subject.date.slice(0, 4)
			: "Unknown";

		const rating = item.rate
			? Number.parseFloat(item.rate.toFixed(1))
			: item.subject?.score
				? Number.parseFloat(item.subject.score.toFixed(1))
				: 0;

		const progress = item.ep_status || 0;
		const totalEpisodes = item.subject?.eps || progress;

		const studio = subjectDetail
			? getStudioFromInfobox(subjectDetail.infobox)
			: "Unknown";

		const description = (
			subjectDetail?.summary ||
			item.subject?.short_summary ||
			item.subject?.name_cn ||
			""
		).trimStart();

		const remoteCover = item.subject?.images?.medium || "";
		const cover = await downloadCover(item.subject_id, remoteCover);

		results.push({
			title:
				item.subject?.name_cn || item.subject?.name || "Unknown Title",
			status: status,
			rating: rating,
			cover: cover,
			description: description,
			episodes: `${totalEpisodes} episodes`,
			year: year,
			genre: item.subject?.tags
				? item.subject.tags.slice(0, 3).map((tag) => tag.name)
				: ["Unknown"],
			studio: studio,
			link: item.subject?.id
				? `https://bgm.tv/subject/${item.subject.id}`
				: "#",
			progress: progress,
			totalEpisodes: totalEpisodes,
			startDate: item.subject?.date || "",
			endDate: item.subject?.date || "",
		});
	}
	console.log(`\n✓ Completed ${status} list processing`);
	return results;
}

async function main() {
	console.log("Initializing Bangumi data update script...");

	const isCi = process.env.CI === "true";
	const forceUpdate = process.env.FORCE_BANGUMI_UPDATE === "true";

	if (!isCi && !forceUpdate) {
		const existingCount = await readExistingDataCount();
		console.log(
			`跳过 Bangumi 拉取（非 CI 环境）。使用仓库内 bangumi-data.json（${existingCount} 条）。`,
		);
		console.log(
			"番剧数据由 GitHub Actions 定时更新；本地强制刷新: FORCE_BANGUMI_UPDATE=true pnpm update-anime",
		);
		return;
	}

	const animeMode = await getAnimeModeFromConfig();
	if (animeMode !== "bangumi") {
		console.log(
			`Detected current anime mode is "${animeMode}", skipping Bangumi data update.`,
		);
		return;
	}

	const USER_ID = await getUserIdFromConfig();
	console.log(`Read User ID: ${USER_ID}`);
	console.log(
		`Network: ${process.env.BANGUMI_PROXY ? `proxy → ${process.env.BANGUMI_PROXY}` : "direct (no BANGUMI_PROXY)"}`,
	);

	const probe = await probeV0Api(USER_ID);
	if (!probe.ok) {
		const existingCount = await readExistingDataCount();
		const errorText = probe.error ?? `HTTP ${probe.status}`;
		console.error(`\n✘ 无法访问 Bangumi v0 API: ${errorText}`);
		printNetworkHelp(errorText);
		if (existingCount > 0) {
			console.warn(
				`保留现有 bangumi-data.json（${existingCount} 条），构建可继续。`,
			);
			return;
		}
		process.exit(1);
	}

	const collections = [
		{ type: 3, status: "watching" },
		{ type: 1, status: "planned" },
		{ type: 2, status: "completed" },
		{ type: 4, status: "onhold" },
		{ type: 5, status: "dropped" },
	];

	let finalAnimeList = [];

	for (const c of collections) {
		const rawData = await fetchCollection(USER_ID, c.type);
		if (rawData.length > 0) {
			const processed = await processData(rawData, c.status);
			finalAnimeList = [...finalAnimeList, ...processed];
		}
	}

	const dir = path.dirname(OUTPUT_FILE);
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}

	if (finalAnimeList.length === 0) {
		const existingCount = await readExistingDataCount();
		if (existingCount > 0) {
			console.warn(
				`\n未拉取到任何数据，保留现有 bangumi-data.json（${existingCount} 条）。`,
			);
			return;
		}
	}

	await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalAnimeList, null, 2));
	console.log(`\nUpdate complete! Data saved to: ${OUTPUT_FILE}`);
	console.log(`Total collected: ${finalAnimeList.length} anime series`);
	console.log(`Cover images saved to: ${COVER_DIR}`);
}

main().catch((err) => {
	console.error("\n✘ Script execution error:");
	console.error(err);
	process.exit(1);
});