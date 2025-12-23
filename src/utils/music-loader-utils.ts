/**
 * 音乐加载优化工具函数
 * 提供封面图片加载重试、备用源、懒加载等功能
 */

// 备用封面CDN源
const FALLBACK_COVER_CDNS = [
	"https://p1.music.126.net/",
	"https://p2.music.126.net/",
	"https://p3.music.126.net/",
	"https://p4.music.126.net/",
];

// 默认封面
const DEFAULT_COVER = "/favicon/favicon.ico";

/**
 * 从网易云音乐URL中提取封面ID
 */
function extractCoverId(url: string): string | null {
	try {
		// 匹配网易云封面URL模式: https://api.xxx.com/meting/?server=netease&type=pic&id=XXXXX
		const metingMatch = url.match(/[&?]id=([^&]+)/);
		if (metingMatch) return metingMatch[1];
		
		// 匹配直接的网易云CDN URL: https://pX.music.126.net/HASH/XXXXX.jpg
		const cdnMatch = url.match(/music\.126\.net\/([^/]+\/)?([^/.]+)/);
		if (cdnMatch) return cdnMatch[2];
		
		return null;
	} catch {
		return null;
	}
}

/**
 * 获取备用封面URL列表
 */
export function getFallbackCovers(originalUrl: string): string[] {
	const fallbacks: string[] = [];
	
	// 如果是本地路径，直接返回
	if (!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")) {
		return [originalUrl];
	}
	
	// 首选原始URL
	fallbacks.push(originalUrl);
	
	// 尝试HTTPS协议
	if (originalUrl.startsWith("http://")) {
		fallbacks.push("https://" + originalUrl.slice(7));
	}
	
	// 尝试从URL提取ID并生成备用CDN URL
	const coverId = extractCoverId(originalUrl);
	if (coverId) {
		FALLBACK_COVER_CDNS.forEach(cdn => {
			fallbacks.push(`${cdn}${coverId}.jpg`);
		});
	}
	
	// 最后添加默认封面
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
	maxRetries = 2
): Promise<string> {
	if (!url) return DEFAULT_COVER;
	
	// 本地路径直接返回
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		return url;
	}
	
	const fallbackUrls = getFallbackCovers(url);
	
	for (const testUrl of fallbackUrls) {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);
				
				const response = await fetch(testUrl, {
					method: 'HEAD', // 只检查头部，不下载全部内容
					mode: 'no-cors', // 避免CORS问题
					cache: 'force-cache',
					signal: controller.signal,
				});
				
				clearTimeout(timeoutId);
				
				// no-cors模式下response.ok可能为false，但只要没抛错就认为可用
				return testUrl;
			} catch (error) {
				// 最后一次尝试失败才记录
				if (attempt === maxRetries) {
					console.debug(`Failed to load cover ${testUrl} after ${maxRetries + 1} attempts`);
				}
				
				// 指数退避
				if (attempt < maxRetries) {
					await new Promise(resolve => 
						setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 5000))
					);
				}
			}
		}
	}
	
	// 所有尝试都失败，返回默认封面
	console.warn(`All cover URLs failed for: ${url}, using default`);
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
		
		const timeoutId = setTimeout(() => {
			img.src = ""; // 取消加载
			resolve(url); // 超时也返回原URL，让浏览器在显示时加载
		}, 8000);
		
		img.onload = () => {
			clearTimeout(timeoutId);
			resolve(url);
		};
		
		img.onerror = () => {
			clearTimeout(timeoutId);
			// 错误时尝试备用源
			loadImageWithRetry(url, 3000, 1).then(resolve);
		};
		
		img.src = url;
	});
}

/**
 * 批量预加载封面图片（带并发控制）
 */
export async function batchPreloadCovers(
	urls: string[],
	concurrency = 3
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
	normalizeCoverUrl: (path: string) => string
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
		song.pic ?? song.cover ?? song.image ?? ""
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
	maxRetries = 3
): Promise<SongData[]> {
	let lastError: Error | null = null;
	
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const controller = new AbortController();
			const currentTimeout = timeout + (attempt * 3000); // 递增超时时间
			const timeoutId = setTimeout(() => controller.abort(), currentTimeout);
			
			const response = await fetch(apiUrl, {
				signal: controller.signal,
				cache: "default",
				headers: {
					"Accept": "application/json",
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
				},
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				throw new Error(`API returned ${response.status}: ${response.statusText}`);
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
					`Meting API attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
				);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw lastError ?? new Error("Unknown error fetching Meting API");
}

export { DEFAULT_COVER };
