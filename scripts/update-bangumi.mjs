import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchBangumi } from "./bangumi-fetch.mjs";
import { loadEnv } from "./load-env.js";
import { convertFileToWebp, saveBufferAsWebp } from "./image-to-webp.mjs";

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

/**
 * 制作公司。
 *
 * 优先「动画制作」（真正的制作公司），其次「制作」；只有「製作」时那通常是
 * 制作委员会，值里还跟着一长串出品方名单，卡片上放不下 —— 只取委员会名字
 * 本身（到第一个括号为止）。
 */
function getStudioFromInfobox(infobox) {
	if (!Array.isArray(infobox)) return "Unknown";

	const readValue = (key) => {
		const item = infobox.find((i) => i.key === key);
		if (!item) return "";
		if (typeof item.value === "string") return item.value;
		if (Array.isArray(item.value)) {
			return item.value.find((v) => v.v)?.v || "";
		}
		return "";
	};

	for (const key of ["动画制作", "制作", "アニメーション制作"]) {
		const value = readValue(key).trim();
		if (value) return value;
	}

	const committee = readValue("製作").trim();
	if (!committee) return "Unknown";
	// 「葬送のフリーレン」製作委員会【東宝（…）…】 -> 「葬送のフリーレン」製作委員会
	const head = committee.split(/[【（(／/]/)[0].trim();
	return head || committee;
}

/** infobox 中可能存放别名的键名（不同条目用词不一致）。 */
const ALIAS_INFOBOX_KEYS = [
	"别名",
	"別名",
	"英文名",
	"英文名稱",
	"英文名(别名)",
	"引述名称",
];

const ASCII_ONLY = /^[\x20-\x7E]+$/;
// 别名里的英文名可能带印刷标点（· ’ ‐ 等），只要求含拉丁字母且不含中日文
const NO_CJK = /^[^\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]+$/;
const HAS_LATIN = /[A-Za-z]/;

/** 从日文原名里捞出英文段，例如 "狼と香辛料 MERCHANT MEETS THE WISE WOLF 第2期"。 */
function extractLatinRun(name) {
	const runs = (name || "").match(/[A-Za-z][A-Za-z0-9'’:,!.\- ]{3,}/g) || [];
	const longest = runs
		.map((r) => r.trim())
		.filter((r) => r.split(/\s+/).length >= 2)
		.sort((a, b) => b.length - a.length)[0];
	return longest || "";
}

/**
 * 从别名候选里挑一个最像"官方英文名"的。
 *
 * infobox 的别名常同时含罗马音（Sousou no Frieren 2nd Season）和官方
 * 英文名（Frieren: Beyond Journey's End Season 2）。官方名一般带冒号或
 * 破折号，且通常更长，因此优先带标点的、其次取最长的。
 */
function pickEnglishTitle(candidates) {
	const ascii = candidates.filter(
		(v) => (ASCII_ONLY.test(v) || NO_CJK.test(v)) && HAS_LATIN.test(v),
	);
	if (ascii.length === 0) return "";

	const punctuated = ascii.filter((v) => /[:：]| - /.test(v));
	const pool = punctuated.length > 0 ? punctuated : ascii;
	return pool.reduce((best, v) => (v.length > best.length ? v : best));
}

/**
 * 尝试从 Bangumi infobox 里取英文标题。
 *
 * Bangumi 的 `name` 通常是日文原名、`name_cn` 是中文名，两者都不一定是
 * 英文；英文名一般作为别名存在 infobox 里。这里按"纯 ASCII 且含字母"
 * 过滤，避免把日文/中文别名误当成英文。
 */
function getEnglishTitleFromInfobox(infobox) {
	if (!Array.isArray(infobox)) return "";

	const values = [];
	for (const item of infobox) {
		if (!ALIAS_INFOBOX_KEYS.includes(item.key)) continue;
		if (typeof item.value === "string") {
			values.push(item.value);
		} else if (Array.isArray(item.value)) {
			for (const entry of item.value) {
				if (entry && typeof entry.v === "string") values.push(entry.v);
			}
		}
	}

	return pickEnglishTitle(values);
}

/**
 * 归一化后的三种标题：
 * - title：中文名（列表默认显示，保持既有行为）
 * - titleOriginal：Bangumi 原名（多为日文）
 * - titleEn：英文名（找不到则为空，交给前端回退）
 */
function resolveTitles(item, subjectDetail) {
	const original = item.subject?.name || "";
	const zh = item.subject?.name_cn || original || "Unknown Title";

	// 英文名来源（全部来自 Bangumi 自身）：
	// 1. infobox 的别名（多数条目有官方英文名）
	// 2. 原名里夹带的英文段（"狼と香辛料 MERCHANT MEETS THE WISE WOLF 第2期"）
	// 3. 原名本身就是英文时直接用
	// 都没有就留空，前端回退。
	const infoboxEn = getEnglishTitleFromInfobox(subjectDetail?.infobox);
	const originalIsAscii = original && ASCII_ONLY.test(original) && HAS_LATIN.test(original);
	const titleEn =
		infoboxEn ||
		(originalIsAscii ? original : extractLatinRun(original));

	return {
		title: zh,
		titleOriginal: original,
		titleEn,
	};
}

/**
 * Bangumi 的 summary 末尾常附一段日文原版简介 [简介原文]，卡片上不需要，
 * 所以在写数据时就切掉，而不是留给前端每次渲染去处理。
 */
function stripBangumiArtifact(text) {
	return (text || "").split("[简介原文]")[0].trim();
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

	const coverFilename = `${subjectId}.webp`;
	const coverPath = path.join(COVER_DIR, coverFilename);
	const legacyJpgPath = path.join(COVER_DIR, `${subjectId}.jpg`);
	const localUrl = `/assets/anime/cover/${coverFilename}`;

	if (fssync.existsSync(coverPath)) {
		return localUrl;
	}

	if (fssync.existsSync(legacyJpgPath)) {
		try {
			await fs.mkdir(COVER_DIR, { recursive: true });
			await convertFileToWebp(legacyJpgPath, coverPath);
			await fs.unlink(legacyJpgPath);
			return localUrl;
		} catch (error) {
			console.warn(
				`\n⚠ Failed to convert legacy cover ${subjectId}: ${formatFetchError(error)}`,
			);
		}
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
			await saveBufferAsWebp(buffer, coverPath);
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

		const infoboxStudio = subjectDetail
			? getStudioFromInfobox(subjectDetail.infobox)
			: "Unknown";

		const description = stripBangumiArtifact(
			(
				subjectDetail?.summary ||
				item.subject?.short_summary ||
				item.subject?.name_cn ||
				""
			).trimStart(),
		);

		const remoteCover = item.subject?.images?.medium || "";
		const cover = await downloadCover(item.subject_id, remoteCover);

		const titles = resolveTitles(item, subjectDetail);

		const studio = infoboxStudio;

		results.push({
			title: titles.title,
			titleOriginal: titles.titleOriginal,
			titleEn: titles.titleEn,
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