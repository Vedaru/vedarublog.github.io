/**
 * 音乐加载优化工具函数
 * 提供封面图片加载重试、备用源、懒加载等功能
 */

// 默认封面
const DEFAULT_COVER = "/favicon/favicon.ico";

/**
 * 获取备用封面URL列表
 * 对于 Meting API 返回的封面，只使用原始 URL，不尝试重新构建
 */
export function getFallbackCovers(originalUrl: string): string[] {
	const fallbacks: string[] = [];

	// 如果是本地路径，直接返回
	if (
		!originalUrl.startsWith("http://") &&
		!originalUrl.startsWith("https://")
	) {
		return [originalUrl, DEFAULT_COVER];
	}

	// 首选原始URL
	fallbacks.push(originalUrl);

	// 尝试HTTPS协议（如果原始是HTTP）
	if (originalUrl.startsWith("http://")) {
		fallbacks.push("https://" + originalUrl.slice(7));
	}

	// 如果是 Meting API 代理 URL，不生成备用源（因为代理不稳定）
	// 直接回退到默认封面
	if (originalUrl.includes("/meting/") && originalUrl.includes("type=pic")) {
		fallbacks.push(DEFAULT_COVER);
		return Array.from(new Set(fallbacks));
	}

	// 如果是网易云 CDN 直接 URL（包含完整路径），保留它
	// 添加默认封面作为最后的备选
	fallbacks.push(DEFAULT_COVER);

	// 去重
	return Array.from(new Set(fallbacks));
}

/**
 * 带重试的图片加载
 * @param url 图片URL
 * @param timeout 超时时间（毫秒）
 * @param maxRetries 最大重试次数
 * @returns 成功加载的URL或默认封面
 */
export async function loadImageWithRetry(
	url: string,
	timeout = 5000,
	maxRetries = 2,
): Promise<string> {
	if (!url) return DEFAULT_COVER;

	// 本地路径直接返回
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return url;
	}

	// 如果是 Meting API 代理 URL，使用更短的超时时间
	const isMettingProxy = url.includes("/meting/") && url.includes("type=pic");
	const actualTimeout = isMettingProxy ? 2000 : timeout;
	const actualMaxRetries = isMettingProxy ? 0 : maxRetries; // 代理URL不重试

	const fallbackUrls = getFallbackCovers(url);
	let lastError: unknown = null;

	for (const testUrl of fallbackUrls) {
		// 如果已经是默认封面，直接返回
		if (testUrl === DEFAULT_COVER) {
			return DEFAULT_COVER;
		}

		for (let attempt = 0; attempt <= actualMaxRetries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

				// 使用 GET + no-cors，避免部分源拒绝 HEAD；发生 CORS 也不抛错
				await fetch(testUrl, {
					method: "GET",
					mode: "no-cors",
					cache: "force-cache",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);
				return testUrl;
			} catch (error) {
				lastError = error;
				if (attempt < actualMaxRetries) {
					await new Promise((resolve) =>
						setTimeout(resolve, Math.min(500 * 2 ** attempt, 2000)),
					);
				} else {
					console.debug(
						`Failed to load cover ${testUrl} after ${actualMaxRetries + 1} attempts`,
					);
				}
			}
		}
	}

	console.debug(`All cover URLs failed for: ${url}, using default cover`);
	// 全部失败，返回默认封面
	return DEFAULT_COVER;
}

/**
 * 预加载图片（使用Image对象，更高效）
 */
export function preloadImage(url: string): Promise<string> {
	return new Promise((resolve) => {
		if (!url || url === DEFAULT_COVER) {
			resolve(url);
			return;
		}

		const img = new Image();
		img.crossOrigin = "anonymous";

		// 如果是 Meting API 代理 URL，使用更短的超时
		const isMettingProxy = url.includes("/meting/") && url.includes("type=pic");
		const timeout = isMettingProxy ? 3000 : 8000;

		const timeoutId = setTimeout(() => {
			img.src = ""; // 取消加载
			// 超时直接返回默认封面
			resolve(isMettingProxy ? DEFAULT_COVER : url);
		}, timeout);

		img.onload = () => {
			clearTimeout(timeoutId);
			resolve(url);
		};

		img.onerror = () => {
			clearTimeout(timeoutId);
			// 错误时，Meting 代理URL直接用默认封面，其他尝试备用源
			if (isMettingProxy) {
				resolve(DEFAULT_COVER);
			} else {
				loadImageWithRetry(url, 3000, 1).then(resolve);
			}
		};

		img.src = url;
	});
}

/**
 * 批量预加载封面图片（带并发控制）
 */
export async function batchPreloadCovers(
	urls: string[],
	concurrency = 3,
): Promise<Map<string, string>> {
	const results = new Map<string, string>();
	const queue = [...urls];

	const worker = async () => {
		while (queue.length > 0) {
			const url = queue.shift();
			if (!url) break;

			try {
				const loadedUrl = await preloadImage(url);
				results.set(url, loadedUrl);
			} catch (error) {
				results.set(url, DEFAULT_COVER);
			}
		}
	};

	// 创建并发worker
	const workers = Array(Math.min(concurrency, urls.length))
		.fill(null)
		.map(() => worker());

	await Promise.all(workers);
	return results;
}

/**
 * 优化的歌曲数据处理
 */
export interface SongData {
	id: string | number;
	name?: string;
	title?: string;
	artist?: string;
	author?: string;
	pic?: string;
	cover?: string;
	image?: string;
	url?: string;
	duration?: number;
}

export interface ProcessedSong {
	id: string | number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
	coverLoaded?: boolean;
}

/**
 * 处理歌曲数据，标准化字段
 */
export function processSongData(
	song: SongData,
	getAssetPath: (path: string) => string,
	normalizeCoverUrl: (path: string) => string,
): ProcessedSong {
	const title = song.name ?? song.title ?? "未知歌曲";
	const artist = song.artist ?? song.author ?? "未知艺术家";

	let duration = song.duration ?? 0;
	// Meting API有时返回毫秒
	if (duration > 10000) {
		duration = Math.floor(duration / 1000);
	}
	if (!Number.isFinite(duration) || duration <= 0) {
		duration = 0;
	}

	const rawCover = normalizeCoverUrl(
		song.pic ?? song.cover ?? song.image ?? "",
	);
	const processedCover = rawCover ? getAssetPath(rawCover) : DEFAULT_COVER;

	return {
		id: song.id,
		title,
		artist,
		cover: processedCover,
		url: getAssetPath(song.url ?? ""),
		duration,
		coverLoaded: false,
	};
}

/**
 * 带超时和重试的Meting API调用
 */
export async function fetchMetingAPI(
	apiUrl: string,
	timeout = 10000,
	maxRetries = 3,
): Promise<SongData[]> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const controller = new AbortController();
			const currentTimeout = timeout + attempt * 3000; // 递增超时时间
			const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

			const response = await fetch(apiUrl, {
				signal: controller.signal,
				cache: "no-store", // 不使用缓存，每次都获取最新数据
				headers: {
					Accept: "application/json",
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(
					`API returned ${response.status}: ${response.statusText}`,
				);
			}

			const data = await response.json();

			if (!Array.isArray(data)) {
				throw new Error("API response is not an array");
			}

			if (data.length === 0) {
				throw new Error("API returned empty playlist");
			}

			return data;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < maxRetries) {
				// 指数退避：1.5s, 3s, 4.5s
				const delay = (attempt + 1) * 1500;
				console.log(
					`Meting API attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError ?? new Error("Unknown error fetching Meting API");
}

export { DEFAULT_COVER };
