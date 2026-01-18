<script lang="ts">
// 导入 Svelte 的生命周期函数和过渡效果

// 导入 Icon 组件，用于显示图标
import Icon from "@iconify/svelte";
import { onDestroy, onMount, tick } from "svelte";
import { slide } from "svelte/transition";
// 从配置文件中导入音乐播放器配置
import { musicPlayerConfig } from "../../config";
// 导入国际化相关的 Key 和 i18n 实例
import Key from "../../i18n/i18nKey";
import { i18n } from "../../i18n/translation";
// 导入音乐加载优化工具函数
import {
	loadImageWithRetry,
	preloadImage,
	batchPreloadCovers,
	processSongData,
	fetchMetingAPI,
	loadSongInfo,
	getFallbackCovers,
	DEFAULT_COVER as UTILS_DEFAULT_COVER,
	type SongData,
	type ProcessedSong,
} from "../../utils/music-loader-utils";

// 音乐播放器模式：运行时仅保留 "local"（使用本地歌单）。Meting 仅在静态构建/下载阶段使用。
let mode = musicPlayerConfig.mode ?? "local";
// Meting API 地址，从配置中获取或使用默认地址
let meting_api =
	musicPlayerConfig.meting_api ??
	"https://api.vedaru.cn/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";

// Meting API 候选列表：优先使用 `musicPlayerConfig.meting_api_candidates`（在 `src/config.ts` 中配置），
// 若未配置则回退到单一的 `meting_api`。
const metingApiCandidates = (musicPlayerConfig.meting_api_candidates && musicPlayerConfig.meting_api_candidates.length > 0)
	? musicPlayerConfig.meting_api_candidates
	: [meting_api].filter(Boolean);
// Meting API 的 ID，从配置中获取或使用默认值
let meting_id = musicPlayerConfig.id ?? "17514570572";
// Meting API 的服务器，从配置中获取或使用默认值,有的meting的api源支持更多平台,一般来说,netease=网易云音乐, tencent=QQ音乐, kugou=酷狗音乐, xiami=虾米音乐, baidu=百度音乐
let meting_server = musicPlayerConfig.server ?? "netease";
// Meting API 的类型，从配置中获取或使用默认值
let meting_type = musicPlayerConfig.type ?? "playlist";
// Meting API 的认证信息（Cookie），从配置中获取
let meting_auth = musicPlayerConfig.auth ?? "";
// 播放状态，默认为 false (未播放)
let isPlaying = false;
// 自动播放开关
const shouldAutoplay = Boolean(musicPlayerConfig.autoplay);
// 环境标识（仅在浏览器中可用 window）
const isBrowser = typeof window !== "undefined";
// 播放器是否展开，默认为 false
let isExpanded = false;
// 播放器是否隐藏，默认为 true（打开页面时收起）
let isHidden = true;
// 是否显示播放列表，默认为 false
let showPlaylist = false;
// 自动播放是否已触发
let autoplayAttempted = false;
// 记录点击歌单后是否应当自动播放（用于 load 成功后的自动恢复）
let willAutoPlay = false;
// 标记用户是否已与页面交互（仅在交互后允许程序性播放）
let userInteracted = false;
// 是否因自动播放而处于静音状态（等待用户交互后恢复）
let mutedForAutoplay = false;
// 当前播放时间，默认为 0
let currentTime = 0;
// 歌曲总时长，默认为 0
let duration = 0;
// 音量，默认为 0.7
let volume = 0.5;
// 正在拖动音量条
let isVolumeDragging = false;
let rafId: number | null = null;
let lastClientX: number | null = null;
// 进度条拖拽支持
let isProgressDragging = false;
let progRafId: number | null = null;
let lastProgressClientX: number | null = null;
let wasPlayingDuringDrag = false;
let showProgressTooltip = false;
let progressTooltipPercent = 0; // 0-100，用于定位提示位置
// 悬停提示支持
let isProgressHovering = false;
let hoverRafId: number | null = null;
let lastHoverClientX: number | null = null;
let tooltipTime = 0; // 提示中显示的时间（拖拽=当前时间；悬停=预估时间）
// 音量提示支持
let isVolumeHovering = false;
let showVolumeTooltip = false;
let volumeTooltipPercent = 0; // 0-100
let volumeHoverValue = 0; // 0-1 用于悬停提示显示
let volHoverRafId: number | null = null;
let lastVolumeHoverClientX: number | null = null;
// 最大线性音量上限（线性滑块最大值，映射到 audio.volume 会进一步经过对数/混合计算）
const MAX_LINEAR_VOLUME = 1;
// 低端灵敏度，>1 表示低音量时变化更小（压缩），可调节以控制低音细微调节
const SENSITIVITY_GAMMA = 1;
// 平滑音量目标与当前值，用于缓动到目标音量
let audioVolumeTarget = 0;
let audioVolumeCurrent = 0;
let volRafId: number | null = null;
let lastVolTime = 0;
// 是否静音，默认为 false
let isMuted = false;
// 是否正在加载，默认为 false
let isLoading = false;
// 是否随机播放，默认为 false
let isShuffled = false;
// 循环模式，0: 不循环, 1: 单曲循环, 2: 列表循环，默认为 0
let isRepeating = 0;
// 根据配置决定是否启用自动连播（列表循环）
const shouldAutoplayContinuous = Boolean(musicPlayerConfig.autoplayContinuous);
// 如果配置要求自动连播，默认将循环模式设置为列表循环
if (shouldAutoplayContinuous) {
	isRepeating = 2;
}
// 错误信息，默认为空字符串
let errorMessage = "";
// 是否显示错误信息，默认为 false
let showError = false;
// 播放尝试锁，防止并发播放尝试
let playAttemptLock = false;

// 组件根节点与按需加载控制
let rootEl: HTMLElement;
let portalAppended = false;
let metingLoaded = false; // 防止重复加载 Meting 播放列表
let io: IntersectionObserver | null = null; // 视口可见触发

// 当前歌曲信息
const DEFAULT_COVER = "/favicon/favicon.ico";

let currentSong = {
	title: "Sample Song",
	artist: "Sample Artist",
	cover: DEFAULT_COVER,
	url: "",
	duration: 0,
};

type Song = {
	id: string | number; // 修改为 string | number 以兼容 ProcessedSong
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

// 封面加载缓存和状态
const coverCache = new Map<string, string>();
const loadingCovers = new Set<string>();

// 从 SessionStorage 恢复缓存
function restoreCoverCache() {
	if (typeof sessionStorage === 'undefined') return;
	try {
		const cached = sessionStorage.getItem('musicCoverCache');
		if (cached) {
			const data = JSON.parse(cached);
			for (const [url, storedUrl] of Object.entries(data)) {
				// Stored blob URLs are session-specific and will be invalid after reloads.
				// Ignore any persisted `blob:` URLs and let the browser load the original URL.
				if (typeof storedUrl === 'string' && storedUrl.startsWith('blob:')) {
					continue;
				}
				coverCache.set(url, storedUrl as string);
			}
		}
	} catch (e) {
		console.debug('Failed to restore cover cache', e);
	}
}

// 持久化缓存到 SessionStorage
function persistCoverCache() {
	if (typeof sessionStorage === 'undefined' || coverCache.size === 0) return;
	try {
		const data: Record<string, string> = {};
		// Persist only stable URLs. Do NOT persist session-scoped blob: URLs because
		// they become invalid after a page reload (causing ERR_FILE_NOT_FOUND).
		coverCache.forEach((value, key) => {
			if (typeof value === 'string' && value.startsWith('blob:')) {
				// Store the original key (remote URL) so after reload the browser will
				// fetch the resource again instead of using a stale blob URL.
				data[key] = key;
			} else {
				data[key] = value as string;
			}
		});
		sessionStorage.setItem('musicCoverCache', JSON.stringify(data));
	} catch (e) {
		console.debug('Failed to persist cover cache', e);
	}
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// 日志辅助：打印音频相关上下文，便于定位播放/加载失败原因
function logAudioError(err: any, context = "") {
	try {
		console.error("[MusicPlayer]", context || "audio error", err, {
			src: audio?.src,
			currentSongUrl: currentSong?.url,
			readyState: audio?.readyState,
			networkState: audio?.networkState,
			mediaError: audio?.error,
			playlistLength: playlist?.length,
		});
	} catch (e) {
		try { console.error('[MusicPlayer] failed to log audio error', e); } catch {}
	}
}
// 增强版：带重试与指数回退的封面预加载（使用新的工具函数）
/**
 * Handle image load error for the mini/compact cover.
 * Moves inline handler into script to avoid Svelte parse issues.
 */
function handleMiniCoverError(event: Event) {
	const img = event.currentTarget as HTMLImageElement;
	if (img.src.endsWith('/favicon/favicon.ico')) return;
	// 若首次失败，尝试使用原始 URL 重新加载一次；第二次失败才回退为 favicon
	const retried = img.dataset.retry === '1';
	try {
		// 删除可能的坏缓存映射
		for (const [key, val] of coverCache.entries()) {
			if (val === img.src || key === currentSong.cover) {
				coverCache.delete(key);
			}
		}
		persistCoverCache();
	} catch (e) {}
	if (!retried) {
		img.dataset.retry = '1';
		img.src = currentSong.cover;
	} else {
		img.src = '/favicon/favicon.ico';
	}
	// 触发后台重试以便尽快补全缓存
	preloadSingleCover(currentSong.cover, 8000, 2).catch(() => {});
}

/**
 * Handle image load error for the expanded/full cover.
 */
function handleExpandedCoverError(event: Event) {
	const img = event.currentTarget as HTMLImageElement;
	if (img.src.endsWith('/favicon/favicon.ico')) return;
	img.src = '/favicon/favicon.ico';
}

/**
 * Handle image load error for items in the playlist.
 */
function handleListCoverError(event: Event, song: any) {
	const img = event.currentTarget as HTMLImageElement;
	if (img.src.endsWith('/favicon/favicon.ico')) return;
	const attempt = Number(img.dataset.attempt || '0');
	// 使用备用封面地址
	const fallbacks = [song?.cover, DEFAULT_COVER, '/favicon/favicon.ico'].filter(Boolean) as string[];

	const next = fallbacks[attempt];
	if (next && attempt < fallbacks.length) {
		img.dataset.attempt = String(attempt + 1);
		img.src = next;
	} else {
		img.src = DEFAULT_COVER;
	}
}

async function preloadSingleCover(coverUrl: string, timeout = 5000, maxRetries = 2): Promise<void> {
	if (!coverUrl || coverCache.has(coverUrl) || loadingCovers.has(coverUrl)) return;

	// 对于本地路径（不是 http/https），直接设为缓存（不需要 fetch）
	if (!coverUrl.startsWith('http://') && !coverUrl.startsWith('https://')) {
		coverCache.set(coverUrl, coverUrl);
		persistCoverCache();
		return;
	}

	loadingCovers.add(coverUrl);
	try {
		// 使用优化的图片加载函数，自动处理备用源和重试
		const loadedUrl = await loadImageWithRetry(coverUrl, timeout, maxRetries);
		
		if (loadedUrl && loadedUrl !== UTILS_DEFAULT_COVER) {
			// 成功加载，尝试转换为blob以提高性能
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), timeout);
				const res = await fetch(loadedUrl, { 
					signal: controller.signal, 
					cache: 'force-cache', 
					mode: 'no-cors' // 避免CORS问题
				});
				clearTimeout(timeoutId);
				
				if (res && res.ok) {
					const blob = await res.blob();
					const objectUrl = URL.createObjectURL(blob);
					coverCache.set(coverUrl, objectUrl);
				} else {
					// 无法转blob，直接使用URL
					coverCache.set(coverUrl, loadedUrl);
				}
			} catch (e) {
				// Blob转换失败，直接使用URL
				coverCache.set(coverUrl, loadedUrl);
				console.debug('Failed to convert cover to blob, using URL directly:', e);
			}
		} else {
			// 加载失败，使用默认封面
			coverCache.set(coverUrl, DEFAULT_COVER);
		}
		
		persistCoverCache();
	} catch (error) {
		// 最终失败，使用默认封面
		coverCache.set(coverUrl, DEFAULT_COVER);
		persistCoverCache();
		console.warn(`Failed to preload cover ${coverUrl}, using default`, error);
	} finally {
		loadingCovers.delete(coverUrl);
	}
}

async function preloadCurrentAndNextCovers() {
	try {
		const toPreload: Promise<void>[] = [];
		// 优化：只预加载当前和下一首，减少初始加载时间
		const candidates = [0, 1]
			.map((offset, i) => ({ idx: (currentIndex + offset) % playlist.length, timeout: 3000 + i * 1000 }))
			.filter((x, i, arr) => arr.findIndex(y => y.idx === x.idx) === i);
		for (const c of candidates) {
			if (playlist[c.idx]?.cover) {
				// 使用处理后的 cover 路径作为缓存 key
				toPreload.push(preloadSingleCover(playlist[c.idx].cover, c.timeout));
			}
		}
		if (toPreload.length > 0) {
			await Promise.all(toPreload);
		}
	} catch (e) {
		console.debug("Preload covers skipped", e);
	}
}

function cleanupIO() {
	try { io?.disconnect(); } catch {}
	io = null;
}

function ensureMetingLoaded() {
	if (metingLoaded || mode !== "meting" || isLoading) return;
	metingLoaded = true;
	
	// 立即开始列表获取，不等待其他资源
	fetchMetingPlaylist().then(() => {
		// 列表获取后立即预加载，不等待 requestIdleCallback
		preloadCurrentAndNextCovers();
	});
	
	// 也在后台继续尝试预加载，以应对未来歌曲
	setTimeout(() => {
		if (playlist.length > 0) preloadCurrentAndNextCovers();
	}, 1500);
}

let playlist: Song[] = [];
let currentIndex = 0;
let audio: HTMLAudioElement;
let preloadAudio: HTMLAudioElement | null = null; // 预加载下一首歌的音频元素
let progressBar: HTMLElement;
let volumeBar: HTMLElement;
let audioContext: AudioContext | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;
let gainNode: GainNode | null = null;
let useAudioContext = true; // 如果因 CORS 或错误无法使用 WebAudio，则回退为 false
// 记录已预取的索引，避免重复预取
let prefetchedForIndex: number | null = null;
// 当剩余时长小于该阈值（秒）时触发预取
const PREFETCH_THRESHOLD = 15;
// pending seek 状态：用于在音频未准备好时延迟应用 seek
let pendingSeekTarget: number | null = null;
let pendingSeekTimeout: number | null = null;
let pendingSeekRetryId: number | null = null;
let pendingSeekSrc: string | null = null;
let pendingSeekWasPlaying = false; // 记录调度时是否正在播放，以便在强制 seek 后恢复播放


let localPlaylist: Song[] = [];

onMount(async () => {
    try {
        console.log('🎵 Loading playlist from /assets/music/playlist.json');
        const response = await fetch(getAssetPath('/assets/music/playlist.json'));
        console.log('🎵 Fetch response status:', response.status);
        if (response.ok) {
            localPlaylist = await response.json();
            console.log('🎵 Loaded local playlist with', Array.isArray(localPlaylist) ? localPlaylist.length : 'non-array', 'songs', Array.isArray(localPlaylist) ? localPlaylist.slice(0,3) : localPlaylist);
        } else {
            console.error('Failed to load playlist.json:', response.status);
            showErrorMessage('本地歌单加载失败：无法读取 /assets/music/playlist.json（状态 ' + response.status + '）');
            localPlaylist = [];
        }
    } catch (error) {
        console.error('Error loading playlist.json:', error);
        showErrorMessage('本地歌单加载失败：无法读取 /assets/music/playlist.json，请检查文件是否存在并有效');
        localPlaylist = [];
    }
});

const staticPlaylist = [
	{
		id: 1,
		title: "夜曲",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=211653.mp3",
		duration: 240,
	},
	{
		id: 2,
		title: "稻香",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337891.mp3",
		duration: 223,
	},
	{
		id: 3,
		title: "青花瓷",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337893.mp3",
		duration: 154,
	},
	{
		id: 4,
		title: "七里香",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337895.mp3",
		duration: 297,
	},
	{
		id: 5,
		title: "给我一首歌的时间",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337897.mp3",
		duration: 278,
	},
	{
		id: 6,
		title: "本草纲目",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337899.mp3",
		duration: 215,
	},
	{
		id: 7,
		title: "东风破",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337901.mp3",
		duration: 334,
	},
	{
		id: 8,
		title: "发如雪",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337903.mp3",
		duration: 286,
	},
	{
		id: 9,
		title: "枫",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337905.mp3",
		duration: 263,
	},
	{
		id: 10,
		title: "开不了口",
		artist: "周杰伦",
		cover: "https://p2.music.126.net/4gzU68p5TKpq9l8T9Gk2VA==/109951166361218695.jpg",
		url: "https://music.163.com/song/media/outer/url?id=337907.mp3",
		duration: 275,
	},
];

function buildMetingUrl(template: string) {
	return template
		.replace(":server", meting_server)
		.replace(":type", meting_type)
		.replace(":id", meting_id)
		.replace(":auth", meting_auth)
		.replace(":r", Date.now().toString());
}

async function fetchMetingPlaylist() {
	if (!meting_id) return;
	isLoading = true;

	// 检查构建时获取的静态数据
	if (typeof window !== "undefined" && (window as any).musicData) {
		console.log("🎵 使用构建时静态同步的音乐数据");
		const staticData = (window as any).musicData;
		if (staticData.length > 0) {
			playlist = staticData.map((song: any, index: number) =>
				processSongData({
					id: index + 1,
					title: song.name,
					author: song.artist,
					url: song.url,
					pic: song.cover,
					lrc: song.lrc
				}, getAssetPath, normalizeCoverUrl)
			);
			if (playlist.length > 0) {
				loadSong(playlist[0]);
				preloadCurrentAndNextCovers().catch((e) =>
					console.debug("封面预加载失败:", e),
				);
			}
			isLoading = false;
			return;
		}
	}

	// 如果没有静态数据，使用本地歌单
	isLoading = false;
	console.warn("没有静态音乐数据，使用本地歌单");
	showErrorMessage("在线歌单加载失败，正在使用本地歌单");
	if (localPlaylist.length > 0) {
		playlist = localPlaylist.map((s) =>
			processSongData(s as SongData, getAssetPath, normalizeCoverUrl),
		);
		// 如果配置要求自动连播，设置为列表循环
		if (shouldAutoplayContinuous) {
			isRepeating = 2;
		}
		if (playlist.length > 0) {
			loadSong(playlist[0]);
			preloadCurrentAndNextCovers().catch((e) =>
				console.debug("封面预加载失败:", e),
			);
		}
	}
}

// 确保播放器已经正确初始化
function ensurePlayerReady(): boolean {
	if (!audio) {
		console.warn("Audio element not initialized");
		return false;
	}
	
	// 检查播放列表是否已加载
	if (playlist.length === 0) {
		console.debug("Playlist is empty, attempting to load");
		if (mode === "meting") {
			ensureMetingLoaded();
			return false;
		}
	}
	
	// 检查当前歌曲是否已加载
	if (!currentSong.url && playlist.length > 0) {
		console.debug("Current song not loaded, loading first song");
		loadSong(playlist[0]);
		return false;
	}
	
	// 检查音频源是否设置
	if (!audio.src && currentSong.url) {
		console.debug("Audio src not set, reloading current song");
		loadSong(currentSong);
		return false;
	}
	
	return true;
}

function togglePlay() {
	// 首先确保播放器已初始化
	if (!ensurePlayerReady()) {
		console.debug("Player not ready, waiting for initialization");
		// 如果播放器未就绪，等待一段时间后重试
		setTimeout(() => {
			if (ensurePlayerReady() && audio) {
				// 重新触发播放
				togglePlay();
			} else {
				showErrorMessage("播放器初始化中，请稍后再试");
			}
		}, 500);
		return;
	}
	
	if (!audio) {
		console.warn("Audio element not initialized");
		return;
	}
	
	if (isPlaying) {
		audio.pause();
		return;
	}
	
	// 播放逻辑
	// 由于禁用了 AudioContext，此处不需要恢复音频上下文
	// if (audioContext?.state === "suspended") {
	// 	audioContext.resume().catch(() => {});
	// }
	
	// 确保取消静音并有合理音量
	audio.muted = false;
	if (!Number.isFinite(audio.volume) || audio.volume === 0) {
		audio.volume = Math.max(0.01, audioVolumeCurrent || 0.3);
	}
	
	// 如果音频未加载或没有歌曲URL，尝试加载当前歌曲
	if (!audio.src || !currentSong.url || audio.readyState === 0) {
		console.debug("Audio source not ready, loading...");
		
		// 如果播放列表为空，尝试确保加载
		if (playlist.length === 0) {
			console.debug("Playlist empty, attempting to load...");
			if (mode === "meting") {
				ensureMetingLoaded();
				// 等待一小段时间让播放列表加载
				setTimeout(() => {
					if (playlist.length > 0 && audio) {
						loadSong(playlist[0]);
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							playPromise.catch((err) => {
								logAudioError(err, 'togglePlay -> meting load fallback play');
								showErrorMessage("播放失败，请重试");
							});
						}
					}
				}, 500);
				return;
			}
		}
		
		// 如果有当前歌曲但未加载，加载它
		if (currentSong.url) {
			loadSong(currentSong);
			// 等待加载完成后播放
			const playWhenReady = () => {
				if (audio.readyState >= 2) {
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.catch((err) => {
							logAudioError(err, 'togglePlay -> playWhenReady (readyState>=2)');
							showErrorMessage("播放失败，请重试");
						});
					}
				} else {
					audio.addEventListener("canplay", () => {
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							playPromise.catch((err) => {
								logAudioError(err, 'togglePlay -> playWhenReady (canplay)');
								showErrorMessage("播放失败，请重试");
							});
						}
					}, { once: true });
				}
			};
			playWhenReady();
		} else if (playlist.length > 0) {
			// 如果当前歌曲无URL但播放列表有歌曲，加载第一首
			loadSong(playlist[0]);
			setTimeout(() => {
					if (audio && audio.readyState >= 2) {
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							playPromise.catch((err) => {
								logAudioError(err, 'togglePlay -> playlist first load play');
								showErrorMessage("播放失败，请重试");
							});
						}
					}
			}, 200);
		} else {
			showErrorMessage("播放列表为空，请稍候");
		}
		return;
	}
	
	// 调试信息：输出当前音频状态
	console.debug("Audio play request", {
		src: audio.src,
		volume: audio.volume,
		muted: audio.muted,
		readyState: audio.readyState,
		networkState: audio.networkState,
		currentSongUrl: currentSong.url
	});
	
	// 直接播放
	const playPromise = audio.play();
	if (playPromise !== undefined) {
		playPromise.catch((err) => {
			// 区分不同类型的播放错误
			if (err.name === 'AbortError') {
				// AbortError 表示播放被中断，通常是正常的
				console.debug('Play aborted:', err.message);
				return;
			}
			
			logAudioError(err, 'togglePlay -> audio.play direct');
			// 如果播放失败，尝试重新加载
			if (err.name === 'NotAllowedError') {
				showErrorMessage("播放被浏览器阻止，请先点击页面任意位置");
			} else if (err.name === 'NotSupportedError') {
				showErrorMessage("音频格式不支持或资源不可用");
				// 尝试重新加载
				setTimeout(() => {
					if (audio && currentSong.url) {
						loadSong(currentSong);
					}
				}, 100);
			} else {
				showErrorMessage("播放失败，请重试");
			}
		});
	}
}

function toggleExpanded() {
	isExpanded = !isExpanded;
	if (isExpanded) {
		showPlaylist = false;
		isHidden = false;
		// 展开时确保按需加载
		ensureMetingLoaded();
	}
}

async function toggleHidden() {
	isHidden = !isHidden;
	if (isHidden) {
		isExpanded = false;
		showPlaylist = false;
	} else {
		// Wait for the DOM to update so child elements (canvas/model) can initialize
		await tick();
		// If using meting mode, ensure lazy loading starts immediately
		if (mode === 'meting') ensureMetingLoaded();
		// micro-delay to let transitions / stacking contexts settle
		setTimeout(() => {}, 0);
	}
}

function togglePlaylist() {
	showPlaylist = !showPlaylist;
	// 当用户打开歌单时，确保歌单已加载并尝试预加载列表中所有封面（分批并发以避免过多并发请求）
	if (showPlaylist) {
		// 如果在 meting 模式，先确保已加载 Meting 歌单
		if (mode === 'meting') {
			ensureMetingLoaded();
		}
		// 异步触发全部歌曲信息加载（不阻塞 UI）
		setTimeout(() => {
			loadAllSongsSequentially().catch(() => {});
		}, 50);
	}
}

// 分批并发预加载整个歌单的封面（限制并发以避免突发大量请求）
async function preloadAllPlaylistCovers(concurrency = 6) {
	if (!playlist || playlist.length === 0) return;
	const covers = playlist.map((s) => s.cover).filter(Boolean) as string[];
	const queue = covers.slice();
	const workers: Promise<void>[] = [];

	const worker = async () => {
		while (queue.length > 0) {
			const url = queue.shift();
			if (!url) break;
			try {
				await preloadSingleCover(url, 8000);
			} catch (e) {
				// 单个封面预加载失败无需抛出
			}
			// small delay to avoid hammering some CDNs
			await new Promise((r) => setTimeout(r, 20));
		}
	};

	for (let i = 0; i < Math.min(concurrency, covers.length); i++) {
		workers.push(worker());
	}

	await Promise.all(workers);
}

// 按顺序加载所有歌曲的信息（先封面后音频）
async function loadAllSongsSequentially() {
	if (!playlist || playlist.length === 0) return;
	
	console.log('🎵 开始按顺序加载所有歌曲信息');
	
	for (let i = 0; i < playlist.length; i++) {
		const song = playlist[i];
		try {
			// 更新playlist中的歌曲信息
			playlist[i] = await loadSongInfo(song);
			console.debug(`✅ 已加载歌曲 ${i + 1}/${playlist.length}: ${song.title}`);
		} catch (error) {
			console.debug(`❌ 加载歌曲失败 ${song.title}:`, error);
		}
		
		// 小延迟避免过度请求
		await new Promise((r) => setTimeout(r, 100));
	}
	
	console.log('🎵 所有歌曲信息加载完成');
}

function toggleShuffle() {
	isShuffled = !isShuffled;
}

function toggleRepeat() {
	isRepeating = (isRepeating + 1) % 3;
}

function previousSong() {
	if (playlist.length <= 1) return;
	const newIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
	playSong(newIndex);
}

function nextSong() {
	// 当歌单长度为1时，仍需根据循环模式处理：
	// - 单曲循环 (isRepeating === 1): 重新从头播放当前曲目
	// - 列表循环 (isRepeating === 2): 跳回索引0并播放
	if (playlist.length <= 1) {
		if (!audio) return;
		if (isRepeating === 1) {
				try {
					audio.currentTime = 0;
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.catch((e) => { 
							if (e.name !== 'AbortError') {
								logAudioError(e, 'nextSong -> single-track replay'); 
							}
						});
					}
				} catch (e) {}
			return;
		}
		if (isRepeating === 2) {
			// 列表循环且只有一首歌，直接重播索引0
			playSong(0);
			return;
		}
		return;
	}
	let newIndex: number;
	if (isShuffled) {
		do {
			newIndex = Math.floor(Math.random() * playlist.length);
		} while (newIndex === currentIndex && playlist.length > 1);
	} else {
		newIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
	}
	playSong(newIndex);

	// 强制尝试播放，避免在某些浏览器/状态同步下切歌后未自动开始播放
	setTimeout(() => {
		try {
				if (audio && !isPlaying && !playAttemptLock) {
					playAttemptLock = true;
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.catch((e) => {
							if (e.name !== 'AbortError') {
								logAudioError(e, 'nextSong -> auto-play after nextSong');
							}
						}).finally(() => {
							playAttemptLock = false;
						});
					} else {
						playAttemptLock = false;
					}
				}
		} catch (e) {
			console.debug('Auto-play attempt threw:', e);
			playAttemptLock = false;
		}
	}, 200);
}

function playSong(index: number, autoPlay = true) {
	if (index < 0 || index >= playlist.length) return;
	// 重置播放尝试锁
	playAttemptLock = false;
	// 记录为即将播放的意图（供加载完成后自动播放判断使用）
	willAutoPlay = autoPlay;
	if (autoPlay) userInteracted = true; // 点击事件应被视为用户交互，放宽浏览器自动播放限制
	// 点击播放时传入 autoPlay=true 会覆盖之前的播放状态意图，确保点击项后可以立即尝试播放
	const wasPlaying = (autoPlay || isPlaying);
	console.debug("playSong called:", { index, wasPlaying, autoPlay, shouldAutoplayContinuous, title: playlist[index]?.title });
	currentIndex = index;
	
	// 重置播放状态，因为我们要切换歌曲
	isPlaying = false;
	
	// 检查是否可以直接使用预加载的音频
	if (preloadAudio && prefetchedForIndex === index && preloadAudio.readyState >= 2 && preloadAudio.src) {
		console.debug("Using preloaded audio for:", playlist[index].title);
		// 暂停当前音频
		if (audio) {
			try {
				audio.pause();
			} catch (e) {
				console.debug("Pause failed in playSong:", e);
			}
		}
		// 清理当前音频的事件监听器
		clearAudioEventListeners();
		// 清理任何挂起的 seek，防止预加载音频被旧的 seek 覆盖
		cleanupPendingSeekHandlers();
		// 切换到预加载音频
		audio = preloadAudio;
		preloadAudio = null;
		prefetchedForIndex = null;
		// 不要重复处理cover，playlist中的cover已经是完整路径
		currentSong = { ...playlist[currentIndex] };
		// 恢复正确的音量（预加载时设置为0）
		audio.volume = audioVolumeCurrent;
		audio.muted = false;
		handleAudioEvents(); // 重新绑定事件监听器

		// 同步时长与当前时间：若预加载音频已准备好则立即更新，否则在 loadeddata 时更新
		try {
			if (audio && audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
				duration = Math.floor(audio.duration);
				if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
				currentSong.duration = duration;
				currentTime = audio.currentTime || 0;
			} else if (audio) {
				audio.addEventListener("loadeddata", () => {
					if (audio && audio.duration && Number.isFinite(audio.duration) && audio.duration > 0) {
						duration = Math.floor(audio.duration);
						if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
						currentSong.duration = duration;
					}
					currentTime = audio.currentTime || 0;
				}, { once: true });
			}
		} catch (e) {
			console.debug('Failed to sync duration from preloaded audio:', e);
		}
		
		// 如果点击意图或之前在播放，立即开始播放（预加载场景）
			if (willAutoPlay || wasPlaying) {
				const playPromise = audio.play();
				if (playPromise !== undefined) {
					playPromise.then(() => {
						isPlaying = true;
					}).catch((err) => {
						if (err.name === 'AbortError') {
							// AbortError 表示播放被中断，通常是正常的
							console.debug('Preloaded audio play aborted:', err.message);
							return;
						}
						logAudioError(err, 'playSong -> play preloaded audio');
						// 保持 willAutoPlay 为 true，以便在后续事件中重试
					});
				}
			}
		
		// 预加载下一首
		const nextIdx = currentIndex + 1;
		if (nextIdx < playlist.length && prefetchedForIndex !== nextIdx) {
			prefetchedForIndex = nextIdx;
			prefetchNext();
		}
		return;
	}
	
	if (audio) {
		try {
			audio.pause();
		} catch (e) {
			console.debug("Pause failed in playSong:", e);
		}
	}
	
	loadSong(playlist[currentIndex]);
	
	// 预加载当前歌曲及后续歌曲的封面
	if (playlist[currentIndex]?.cover) {
		preloadSingleCover(playlist[currentIndex].cover, 3000);
	}
	const nextIndex = currentIndex + 1;
	if (nextIndex < playlist.length && playlist[nextIndex]?.cover) {
		preloadSingleCover(playlist[nextIndex].cover, 5000);
	}
	
	// 尝试立即预取下一首（如果尚未预取）以降低切换等待
	const maybeNext = currentIndex + 1;
	if (
		playlist &&
		maybeNext < playlist.length &&
		prefetchedForIndex !== maybeNext
	) {
		prefetchedForIndex = maybeNext;
		prefetchNext();
	}
	
	// 如果之前在播放，或者启用了自动连播（列表循环），则自动开始播放
	// 仅在用户已交互或配置允许自动播放时才启动自动播放（放宽条件：只要用户已交互或配置允许，就可因“正在播放”而自动续播）
	const shouldAutoPlay = (wasPlaying || shouldAutoplayContinuous) && (userInteracted || shouldAutoplay || willAutoPlay) && !playAttemptLock;
	console.debug("Should auto-play next track:", shouldAutoPlay, { wasPlaying, shouldAutoplayContinuous, playAttemptLock, willAutoPlay });
	if (shouldAutoPlay) {
		playAttemptLock = true;
		setTimeout(() => {
			if (!audio) {
				playAttemptLock = false;
				return;
			}
			
				const attemptPlay = () => {
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.then(() => {
							willAutoPlay = false;
						}).catch((err) => {
							// 区分不同类型的播放错误
							if (err.name === 'AbortError') {
								// AbortError 表示播放被新请求中断，通常是正常的（比如快速切换歌曲）
								console.debug('Play aborted (likely due to song change):', err.message);
								playAttemptLock = false;
								return;
							}
							
							logAudioError(err, 'playSong -> attemptPlay after song change');
							playAttemptLock = false;
							// 如果播放失败，尝试再次加载（同时保留 willAutoPlay 以便后续重试）
							if (err.name === 'NotSupportedError') {
								setTimeout(() => {
									if (audio && audio.readyState < 2) {
										console.debug("Reloading audio after play failure");
										audio.load();
										audio.addEventListener("canplay", () => {
											const innerPlayPromise = audio.play();
											if (innerPlayPromise !== undefined) {
												innerPlayPromise.catch((e) => { 
													if (e.name !== 'AbortError') {
														logAudioError(e, 'playSong -> reload canplay inner play'); 
													}
												});
											}
										}, { once: true });
									}
								}, 200);
							}
						}).finally(() => {
							playAttemptLock = false;
						});
					} else {
						playAttemptLock = false;
					}
				};
			// 增加针对点击播放的立即尝试以减少“切歌后暂停”的感受
			if (willAutoPlay && audio.readyState >= 2 && !isPlaying && !playAttemptLock) {
				attemptPlay();
			} else if (audio.readyState >= 2) {
				attemptPlay();
			} else {
				audio.addEventListener("canplay", attemptPlay, { once: true });
				// 如果 3 秒后还没有触发 canplay，强制尝试播放
				setTimeout(() => {
					if (audio && audio.readyState < 2 && playAttemptLock) {
						console.debug("Forcing play attempt after timeout");
						attemptPlay();
					}
				}, 3000);
			}
		}, 150);
	}
}

// 预取下一首音频以减小切换等待（在支持 CORS 的来源上有效）
async function prefetchNext() {
	try {
		const nextIndex = currentIndex + 1;
		if (!playlist || nextIndex >= playlist.length) return;
		const next = playlist[nextIndex];
		if (!next || !next.url) return;
		
		// 清理之前的预加载音频
		if (preloadAudio) {
			preloadAudio.pause();
			preloadAudio.src = '';
			preloadAudio = null;
		}
		
		// 创建新的预加载音频元素
		preloadAudio = new Audio();
		preloadAudio.preload = 'auto';
		preloadAudio.volume = 0; // 静音预加载
		
		const audioUrl = getAssetPath(next.url);
		preloadAudio.src = audioUrl;
		preloadAudio.load();
		
		// 强制预加载缓冲
		setTimeout(() => {
			if (preloadAudio && preloadAudio.readyState < 2) {
				// 仅在用户已交互或配置允许自动播放时尝试临时播放以触发缓冲
				if (shouldAutoplay && userInteracted) {
					const tempPlay = preloadAudio.play?.();
					if (tempPlay && typeof tempPlay.then === "function") {
						tempPlay.then(() => {
							setTimeout(() => {
								if (preloadAudio && preloadAudio !== audio) {
									try {
										preloadAudio.pause();
										preloadAudio.currentTime = 0;
									} catch (e) {}
								}
							}, 200);
						}).catch(() => {
							// 忽略预加载播放失败
						});
					}
				}
			}
		}, 300);
		
		console.debug("Prefetching next track:", next.title);
	} catch (e) {
		// 预取失败无需抛错，仅记录以便调试
		console.debug("Prefetch next track failed:", e);
	}
}

function getAssetPath(path: string): string {
	const base = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
	if (!path) return base + "/";
	if (path.startsWith("http://") || path.startsWith("https://")) return path;
	if (path.startsWith("/")) return `${base}${path}`;
	return `${base}/${path}`;
}

function normalizeCoverUrl(path: string): string {
	if (!path) return "";
	// 避免 https 页面加载 http 资源被阻止，尝试替换为 https
	if (path.startsWith("http://")) return "https://" + path.slice(7);
	return path;
}

function cacheCoverVariants(raw: string) {
	try {
		const normalized = getAssetPath(raw);
		const base = (import.meta.env?.BASE_URL || "/").replace(/\/$/, "");
		const stripped = normalized.startsWith(base)
			? normalized.slice(base.length)
			: normalized;
		coverCache.set(raw, normalized);
		coverCache.set(normalized, normalized);
		coverCache.set(stripped, normalized);
		persistCoverCache();
	} catch (e) {
		console.debug('cacheCoverVariants failed', e);
	}
}

function loadSong(song: typeof currentSong) {
	if (!song || !audio) {
		console.warn("Cannot load song: missing song data or audio element");
		return;
	}
	
	// song.cover已经是完整路径，不需要再次处理
	currentSong = { ...song };
	
	// 将当前封面写入缓存的多版本键，确保歌单列表与迷你封面共享同一资源
	cacheCoverVariants(song.cover);
	
	if (!song.url) {
		console.warn("Song has no URL:", song);
		isLoading = false;
		return;
	}
	
	isLoading = true;
	
	// 清理任何挂起的 seek（以免切歌后未生效的 seek 仍然触发）
	cleanupPendingSeekHandlers();
	// 暂停当前播放并重置播放状态
	try {
		audio.pause();
		isPlaying = false;
	} catch (e) {
		console.debug("Pause failed:", e);
	}
	
	audio.currentTime = 0;
	currentTime = 0;
	duration = song.duration ?? 0;
	
	// 清理旧的事件监听器
	audio.removeEventListener("loadeddata", handleLoadSuccess);
	audio.removeEventListener("error", handleLoadError);
	audio.removeEventListener("loadstart", handleLoadStart);
	
	// 添加新的事件监听器
	audio.addEventListener("loadeddata", handleLoadSuccess, { once: true });
	audio.addEventListener("error", handleLoadError, { once: true });
	audio.addEventListener("loadstart", handleLoadStart, { once: true });

	const audioUrl = getAssetPath(song.url);
	console.debug("Loading audio:", audioUrl, "readyState:", audio.readyState);
	
	// 设置音频源并加载
	audio.preload = 'none';
	audio.src = audioUrl;
	audio.load();
	
	// 强制预加载：尝试播放一小段时间然后暂停，以触发浏览器缓冲
	setTimeout(() => {
		// 仅在用户已交互或配置允许自动播放时尝试临时播放以触发缓冲
		if ((shouldAutoplay && userInteracted) && audio.readyState < 2) {
			const tempPlay = audio.play();
			if (tempPlay) {
				tempPlay.then(() => {
					setTimeout(() => {
						if (audio && !isPlaying) {
							audio.pause();
							audio.currentTime = 0;
						}
					}, 100);
				}).catch(() => {
					// 忽略播放失败，继续加载
				});
			}
		}
	}, 200);

	// 确保音频元素准备好后可以播放
	// 使用 setTimeout 确保在下一个事件循环中检查
	setTimeout(() => {
		if (audio.readyState >= 2) {
			handleLoadSuccess();
		} else if (audio.readyState === 0) {
			// 如果仍然是 HAVE_NOTHING 状态，可能需要重新加载
			console.debug("Audio still not loaded, attempting reload");
			audio.load();
		}
	}, 100);
}

function handleLoadSuccess() {
	isLoading = false;
	if (audio?.duration && audio.duration > 1) {
		duration = Math.floor(audio.duration);
		if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
		currentSong.duration = duration;
	}

	// 尝试自动播放：仅在启用且未尝试过时触发
	requestAutoplay();
}

function handleLoadError(event: Event | any) {
	isLoading = false;
	// 打印详尽的上下文以便排查（networkState/readyState/mediaError）
	try { logAudioError(event?.error || event, 'handleLoadError'); } catch (e) {}
	showErrorMessage(`无法播放 "${currentSong.title}"，正在尝试下一首...`);
	if (playlist.length > 1) setTimeout(() => nextSong(), 1000);
	else showErrorMessage("播放列表中没有可用的歌曲");
}

function requestAutoplay() {
	// 已禁用自动播放以避免页面加载时自动开始播放。
	// 若希望通过配置启用自动播放，请在 `musicPlayerConfig.autoplay` 中开启并移除此早期返回。
	autoplayAttempted = true;
	return;
}

function handleLoadStart() {}

function showErrorMessage(message: string) {
	errorMessage = message;
	showError = true;
	setTimeout(() => {
		showError = false;
	}, 3000);
}
function hideError() {
	showError = false;
}

function setProgress(event: MouseEvent) {
	if (!audio || !progressBar) return;
	const rect = progressBar.getBoundingClientRect();
	const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
	// 使用实际 audio.duration 优先，回退到组件维护的 duration
	const actualDuration = (audio.duration && Number.isFinite(audio.duration)) ? audio.duration : (Number.isFinite(duration) ? duration : 0);
	// 同步组件的 duration，保证模板渲染时进度条基于最新时长
	if (actualDuration > 0 && duration !== actualDuration) {
		duration = actualDuration;
	}
	let newTime = percent * (actualDuration || duration || 0);
	// 避免设置到音频末尾触发 ended 事件：如果接近末尾则降回一个更保守的阈值
	if (actualDuration > 0 && newTime >= actualDuration) {
		newTime = Math.max(0, actualDuration - 0.15);
	}
	// 避免不必要的重复设置
	if (Math.abs(currentTime - newTime) > 0.01) {
		audio.currentTime = newTime;
		currentTime = newTime;
	}
}

function scheduleProgressUpdate(clientX: number) {
	lastProgressClientX = clientX;
	if (!isBrowser) return;
	if (progRafId == null) {
		progRafId = window.requestAnimationFrame(() => {
			progRafId = null;
			if (!progressBar || lastProgressClientX == null || !audio) return;
			const rect = progressBar.getBoundingClientRect();
			const percent = Math.max(
				0,
				Math.min(1, (lastProgressClientX - rect.left) / rect.width),
			);
			// 使用实际 audio.duration 优先，回退到组件维护的 duration
			const actualDuration = (audio.duration && Number.isFinite(audio.duration)) ? audio.duration : (Number.isFinite(duration) ? duration : 0);
			// 同步组件的 duration，保证模板使用的 duration 跟随实际值
			if (actualDuration > 0 && duration !== actualDuration) {
				duration = actualDuration;
			}
			let newTime = percent * (actualDuration || duration || 0);
			if (actualDuration > 0 && newTime >= actualDuration) {
				newTime = Math.max(0, actualDuration - 0.15);
			}
			// 避免不必要的重复设置，特别是当拖动超出边界时
			if (Math.abs(currentTime - newTime) > 0.01) { // 只有当时间变化超过10ms时才更新
				currentTime = newTime;
				// 注意：在拖拽过程中不设置 audio.currentTime，只更新 UI 显示
				// audio.currentTime 只在拖拽结束时设置，避免音频跳跃
			}
			tooltipTime = newTime;
			progressTooltipPercent = percent * 100;
			lastProgressClientX = null;
		});
	}
}

function scheduleHoverUpdate(clientX: number) {
	lastHoverClientX = clientX;
	if (!isBrowser || isProgressDragging) return; // 拖拽优先
	if (hoverRafId == null) {
		hoverRafId = window.requestAnimationFrame(() => {
			hoverRafId = null;
			if (!progressBar || lastHoverClientX == null) return;
			const rect = progressBar.getBoundingClientRect();
			const percent = Math.max(
				0,
				Math.min(1, (lastHoverClientX - rect.left) / rect.width),
			);
			tooltipTime = percent * duration;
			progressTooltipPercent = percent * 100;
			lastHoverClientX = null;
		});
	}
}

function onProgressPointerMove(e: PointerEvent) {
	if (!isProgressDragging) return;
	e.preventDefault();
	scheduleProgressUpdate(e.clientX);
}

// 尝试应用挂起的 seek（在 audio 开始缓冲/可播放后重试）
function tryApplyPendingSeek() {
	if (!audio || pendingSeekTarget == null) return false;
	const target = pendingSeekTarget;
	// 确保目标仍然针对同一音源
	if (pendingSeekSrc && audio.src !== pendingSeekSrc) {
		console.debug('tryApplyPendingSeek: audio src changed, aborting seek');
		return false;
	}
	// 确保音频已准备好进行 seek
	if (audio.readyState < 1) {
		console.debug('tryApplyPendingSeek: audio not ready for seek, readyState:', audio.readyState);
		return false;
	}
	try {
		if (audio.seekable && audio.seekable.length > 0) {
			for (let i = 0; i < audio.seekable.length; i++) {
				const s = audio.seekable.start(i);
				const e = audio.seekable.end(i);
				if (target >= s && target <= e) {
					console.debug('tryApplyPendingSeek: applying seek to', target, 'in range [', s, ',', e, ']');
					audio.currentTime = target;
					currentTime = target;
					const was = wasPlayingDuringDrag;
					cleanupPendingSeekHandlers();
					if (was && audio && !isPlaying) {
						const playPromise = audio.play();
						if (playPromise !== undefined) {
							playPromise.catch((err) => { 
								if (err.name !== 'AbortError') {
									logAudioError(err, 'tryApplyPendingSeek -> resume'); 
								}
							});
						}
					}
					return true;
				}
			}
			console.debug('tryApplyPendingSeek: target', target, 'not in any seekable range');
		} else {
			console.debug('tryApplyPendingSeek: no seekable ranges available');
		}
		if (audio.buffered && audio.buffered.length > 0) {
			const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
			if (target <= bufferedEnd) {
				console.debug('tryApplyPendingSeek: applying buffered seek to', target, 'buffered end:', bufferedEnd);
				audio.currentTime = target;
				currentTime = target;
				const was2 = wasPlayingDuringDrag;
				cleanupPendingSeekHandlers();
				// 验证读回
				setTimeout(async () => {
					try {
						if (!audio || pendingSeekSrc !== audio.src) return;
						if (Math.abs((audio.currentTime || 0) - target) > 0.5) {
							console.debug('tryApplyPendingSeek(buffered): verification mismatch, performing forced seek for', target);
							const ok = await performForcedSeek(target, was2);
							console.log('tryApplyPendingSeek(buffered) performForcedSeek result:', ok, 'audio.currentTime now:', audio.currentTime);
						}
					} catch (e) { console.debug('tryApplyPendingSeek(buffered) verification error:', e); }
				}, 120);
				if (was2 && audio && !isPlaying) {
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.catch((err) => { 
							if (err.name !== 'AbortError') {
								logAudioError(err, 'tryApplyPendingSeek -> resume'); 
							}
						});
					}
				}
				return true;
			}
			console.debug('tryApplyPendingSeek: target', target, 'beyond buffered end', bufferedEnd);
		} else {
			console.debug('tryApplyPendingSeek: no buffered ranges available');
		}
	} catch (e) {
		console.debug('tryApplyPendingSeek error:', e);
	}
	return false;
}

let forcedSeekInProgress = false;
let forcedSeekGeneration = 0;

async function performForcedSeek(target: number, wasPlaying: boolean) {
	if (!audio) return false;
	// generation-based cancellation and concurrency guard
	if (forcedSeekInProgress) return false;
	forcedSeekInProgress = true;
	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
	const myGen = ++forcedSeekGeneration;
	try {
		// If user restarted drag, abort
		if (isProgressDragging) return false;
		// Check if audio is ready for seeking
		if (audio.readyState < 1) {
			console.debug('performForcedSeek: audio not ready, readyState:', audio.readyState);
			return false;
		}
		const prevPaused = audio.paused;
		// Only pause if audio is currently playing and the caller expects resume
		const shouldPause = !prevPaused && wasPlaying;
		if (shouldPause) {
			audio.pause();
		}
		// Attempt seek + verify, abort early if generation changed or drag restarted
		console.debug('performForcedSeek: setting currentTime to', target);
		audio.currentTime = target;
		await sleep(150);
		if (forcedSeekGeneration !== myGen || isProgressDragging) {
			console.debug('performForcedSeek aborted (stale or new drag)', target);
			return false;
		}
		console.debug('performForcedSeek verification 1 readback:', audio.currentTime, 'target:', target);
		if (Math.abs((audio.currentTime || 0) - target) <= 0.5) {
			currentTime = audio.currentTime;
			if (wasPlaying && shouldPause && audio.paused) {
				const playPromise = audio.play();
				if (playPromise !== undefined) {
					playPromise.catch((e) => {
						if (e.name !== 'AbortError') {
							logAudioError(e, 'performForcedSeek -> resume');
						}
					});
				}
			}
			return true;
		}
		// second attempt
		console.debug('performForcedSeek: second attempt to set currentTime to', target);
		audio.currentTime = target;
		await sleep(300);
		if (forcedSeekGeneration !== myGen || isProgressDragging) {
			console.debug('performForcedSeek aborted after second attempt (stale or new drag)', target);
			return false;
		}
		console.debug('performForcedSeek verification 2 readback:', audio.currentTime, 'target:', target);
		if (Math.abs((audio.currentTime || 0) - target) <= 0.5) {
			currentTime = audio.currentTime;
			if (wasPlaying && shouldPause && audio.paused) {
				const playPromise = audio.play();
				if (playPromise !== undefined) {
					playPromise.catch((e) => {
						if (e.name !== 'AbortError') {
							logAudioError(e, 'performForcedSeek -> resume');
						}
					});
				}
			}
			return true;
		}
		console.debug('performForcedSeek: seek failed after two attempts');
	} catch (e) {
		console.debug('performForcedSeek error:', e);
	} finally {
		forcedSeekInProgress = false;
	}
	return false;
}

function cleanupPendingSeekHandlers() {
	pendingSeekTarget = null;
	pendingSeekSrc = null;
	// Bump generation to cancel any in-flight forced seeks
	forcedSeekGeneration++;
	if (pendingSeekTimeout != null) {
		clearTimeout(pendingSeekTimeout);
		pendingSeekTimeout = null;
	}
	if (pendingSeekRetryId != null) {
		clearInterval(pendingSeekRetryId);
		pendingSeekRetryId = null;
	}
	if (audio) {
		audio.removeEventListener('progress', tryApplyPendingSeek);
		audio.removeEventListener('canplay', tryApplyPendingSeek);
		audio.removeEventListener('loadedmetadata', tryApplyPendingSeek);
	}
}

// 在未能立即设置 seek 时安排重试，直到成功或超时
function scheduleSeekRetry(target: number, wasPlaying = false) {
	cleanupPendingSeekHandlers();
	pendingSeekTarget = target;
	pendingSeekWasPlaying = wasPlaying;
	pendingSeekSrc = audio?.src ?? null;
	// 先尝试一次立即应用
	if (tryApplyPendingSeek()) return;
	if (audio) {
		audio.addEventListener('progress', tryApplyPendingSeek);
		audio.addEventListener('canplay', tryApplyPendingSeek);
		audio.addEventListener('loadedmetadata', tryApplyPendingSeek);
	}
	// 周期性重试（每250ms）直到成功。若 tryApplyPendingSeek 一直失败，额外尝试 performForcedSeek
	pendingSeekRetryId = window.setInterval(() => {
		try {
			const applied = tryApplyPendingSeek();
			if (!applied && audio && audio.readyState >= 2) {
				// 在可播放状态下尝试强制 seek
				performForcedSeek(target, pendingSeekWasPlaying).then((ok) => {
					if (ok) {
						console.log('scheduleSeekRetry: performForcedSeek succeeded for', target);
						cleanupPendingSeekHandlers();
					}
				}).catch((e) => { console.debug('scheduleSeekRetry performForcedSeek error:', e); });
			}
		} catch (e) { console.debug('scheduleSeekRetry interval error:', e); }
	}, 250);
	// 3s 后放弃并做最后一次尝试（包含强制 seek）
	pendingSeekTimeout = window.setTimeout(() => {
		if (!tryApplyPendingSeek() && audio && audio.readyState >= 2) {
			performForcedSeek(target, pendingSeekWasPlaying).then((ok) => {
				console.debug('scheduleSeekRetry final performForcedSeek:', ok);
			}).catch((e) => { console.debug('scheduleSeekRetry final performForcedSeek error:', e); });
		}
		cleanupPendingSeekHandlers();
	}, 3000);
	console.debug('scheduleSeekRetry set for target:', target, 'src:', pendingSeekSrc, 'wasPlaying:', pendingSeekWasPlaying);
}





function stopProgressDrag() {
	if (!isProgressDragging) return;
	isProgressDragging = false;
	showProgressTooltip = isProgressHovering;
	if (!isBrowser) return;
	document.removeEventListener("pointermove", onProgressPointerMove);
	document.removeEventListener("pointerup", stopProgressDrag);
	document.removeEventListener("pointercancel", stopProgressDrag);
	try {
		document.body.style.userSelect = "";
	} catch (e) {}
	if (progRafId != null) {
		cancelAnimationFrame(progRafId);
		progRafId = null;
		lastProgressClientX = null;
	}
	// 确保最终位置已应用到 audio.currentTime（再次截断防止触发 ended）
	try {
		if (audio) {
			const actualDuration = (audio.duration && Number.isFinite(audio.duration)) ? audio.duration : (Number.isFinite(duration) ? duration : 0);
			let finalTime = currentTime;
			if (actualDuration > 0 && finalTime >= actualDuration) {
				finalTime = Math.max(0, actualDuration - 0.15);
			}
			console.log('Progress drag ended. Attempting to set audio.currentTime to:', finalTime, 'audio exists:', !!audio, 'currentTime was:', currentTime);
			// Diagnostic: dump audio state for debugging seek failures
			try {
				console.debug('Audio state dump:', {
					src: audio.src,
					readyState: audio.readyState,
					paused: audio.paused,
					networkState: audio.networkState,
					duration: audio.duration,
					currentTimeBefore: audio.currentTime,
					buffered: Array.from({length: audio.buffered.length}).map((_, i) => [audio.buffered.start(i), audio.buffered.end(i)]),
					seekable: Array.from({length: audio.seekable.length}).map((_, i) => [audio.seekable.start(i), audio.seekable.end(i)]),
				});
			} catch (e) { console.debug('Error dumping audio state:', e); }
			// Check if audio is ready for seeking
			if (audio.readyState < 1) {
				console.debug('Audio not ready for seek in stopProgressDrag, readyState:', audio.readyState, 'scheduling retry');
				scheduleSeekRetry(finalTime, wasPlayingDuringDrag);
				return;
			}
			const onSeekedLog = () => { console.log('audio.seeked event fired, audio.currentTime:', audio.currentTime); audio.removeEventListener('seeked', onSeekedLog); };
			const onLoadedMetaLog = () => { console.log('audio.loadedmetadata event fired, audio.currentTime:', audio.currentTime); audio.removeEventListener('loadedmetadata', onLoadedMetaLog); };
			const onCanPlayLog = () => { console.log('audio.canplay event fired, audio.currentTime:', audio.currentTime); audio.removeEventListener('canplay', onCanPlayLog); };
			const onProgressLog = () => { console.log('audio.progress event fired, buffered:', Array.from({length: audio.buffered.length}).map((_, i) => [audio.buffered.start(i), audio.buffered.end(i)])); };
			audio.addEventListener('seeked', onSeekedLog);
			audio.addEventListener('loadedmetadata', onLoadedMetaLog);
			audio.addEventListener('canplay', onCanPlayLog);
			audio.addEventListener('progress', onProgressLog);

			// 立即尝试应用
			let applied = false;
			try {
				if (audio.seekable && audio.seekable.length > 0) {
					for (let i = 0; i < audio.seekable.length; i++) {
						const s = audio.seekable.start(i);
						const e = audio.seekable.end(i);
						if (finalTime >= s && finalTime <= e) {
							console.debug('stopProgressDrag: applying seek to', finalTime, 'in seekable range [', s, ',', e, ']');
							audio.currentTime = finalTime;
							currentTime = finalTime;
							// 如果先前正在播放，则在设置成功后尝试恢复播放
							if (wasPlayingDuringDrag && audio && !isPlaying) {
								const playPromise = audio.play();
								if (playPromise !== undefined) {
									playPromise.catch((e) => { 
										if (e.name !== 'AbortError') {
											logAudioError(e, 'stopProgressDrag -> resume after immediate seek'); 
										}
									});
								}
							}
							applied = true;
							break;
						}
					}
				}
				if (!applied && audio.buffered && audio.buffered.length > 0) {
					const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
					if (finalTime <= bufferedEnd) {
						console.debug('stopProgressDrag: applying buffered seek to', finalTime, 'buffered end:', bufferedEnd);
						audio.currentTime = finalTime;
						currentTime = finalTime;
						if (wasPlayingDuringDrag && audio && !isPlaying) {
							const playPromise = audio.play();
							if (playPromise !== undefined) {
								playPromise.catch((e) => { 
									if (e.name !== 'AbortError') {
										logAudioError(e, 'stopProgressDrag -> resume after immediate seek'); 
									}
								});
							}
						}
						applied = true;
					}
				}
			} catch (e) {
				console.debug('Immediate seek attempt failed:', e);
			}
			if (!applied) {
				// 若音频已具备一定就绪度，先尝试立即进行强制 seek（pause -> set -> verify），以减少用户等待
				if (audio && audio.readyState >= 2) {
					console.debug('Attempting performForcedSeek immediately for', finalTime);
					performForcedSeek(finalTime, wasPlayingDuringDrag).then((ok) => {
						if (ok) {
							console.log('performForcedSeek succeeded immediately:', finalTime, 'audio.currentTime:', audio.currentTime);
							cleanupPendingSeekHandlers();
							try { audio.removeEventListener('progress', onProgressLog); audio.removeEventListener('canplay', onCanPlayLog); audio.removeEventListener('loadedmetadata', onLoadedMetaLog); audio.removeEventListener('seeked', onSeekedLog); } catch (e) {}
							return;
						} else {
							// 立即强制 seek 尝试失败，回退到延迟重试机制
							scheduleSeekRetry(finalTime);
							console.debug('performForcedSeek failed, Seek deferred until buffered/canplay. pendingSeekTarget:', pendingSeekTarget, 'audio.currentTime now:', audio.currentTime);
						}
					}).catch((e) => { scheduleSeekRetry(finalTime); console.debug('performForcedSeek threw:', e); });
				} else {
					// 延迟应用：使用统一的调度器并重试，直到成功或超时
					scheduleSeekRetry(finalTime);
					console.debug('Seek deferred until buffered/canplay. pendingSeekTarget:', pendingSeekTarget, 'audio.currentTime now:', audio.currentTime);
				}
			} else {
				console.log('After setting: audio.currentTime is:', audio.currentTime, 'currentTime is:', currentTime);
				// Verification readback after slight delay to catch non-immediate seek behavior
				setTimeout(async () => {
					try {
						console.log('Verification readback after setTimeout: audio.currentTime:', audio.currentTime, 'audio.paused:', audio.paused, 'audio.src:', audio.src);
						if (Math.abs((audio.currentTime || 0) - finalTime) > 0.5) {
							console.debug('Verification mismatch: initiating forced seek to', finalTime);
							const ok = await performForcedSeek(finalTime, wasPlayingDuringDrag);
							console.log('performForcedSeek result:', ok, 'audio.currentTime now:', audio.currentTime);
						}
					} catch (e) { console.debug('Verification readback failed:', e); }
				}, 120);
				// Clean up temporary listeners
				try {
					audio.removeEventListener('progress', onProgressLog);
					audio.removeEventListener('canplay', onCanPlayLog);
					audio.removeEventListener('loadedmetadata', onLoadedMetaLog);
					audio.removeEventListener('seeked', onSeekedLog);
				} catch (e) { }
			}
		} else {
			console.warn('Audio element not found when stopping progress drag');
		}
	} catch (e) {
		console.debug('Error applying final seek after drag:', e);
	}
	// 释放拖动时恢复自动连播：如果当前已接近末尾，则在释放后触发下一首或单曲循环
	try {
		const actualDuration2 = (audio?.duration && Number.isFinite(audio.duration)) ? audio.duration : (Number.isFinite(duration) ? duration : 0);
		const nearEnd = actualDuration2 > 0 && currentTime >= actualDuration2 - 0.15;
		if (nearEnd) {
			// 与 ended 处理逻辑一致
			if (isRepeating === 1) {
				// 单曲循环：重置并播放
				if (audio) {
					audio.currentTime = 0;
					const playPromise = audio.play();
					if (playPromise !== undefined) {
						playPromise.catch((e) => { 
							if (e.name !== 'AbortError') {
								logAudioError(e, 'stopProgressDrag -> near-end single-loop replay'); 
							}
						});
					}
				}
			} else if (isRepeating === 2 || currentIndex < playlist.length - 1 || isShuffled) {
				setTimeout(() => {
					try { nextSong(); } catch (e) { console.debug('nextSong after drag failed', e); }
				}, 150);
			} else {
				isPlaying = false;
			}
		}
	} catch (e) {
		console.debug('Error while handling near-end after drag:', e);
	}
	// 如果拖动前正在播放，尝试恢复播放（某些浏览器在设置 currentTime 后会自动暂停）
	try {
		if (wasPlayingDuringDrag && audio && !isPlaying) {
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise.catch((e) => { logAudioError(e, 'stopProgressDrag -> resume after drag'); });
			}
		}
	} catch (e) {
		console.debug('Error while trying to resume after drag:', e);
	} finally {
		wasPlayingDuringDrag = false;
	}
}

function startProgressDrag(e: PointerEvent) {
	if (!audio || !progressBar) return;
	// 清理任何挂起的 seek 操作，以避免快速拖拽时的冲突
	cleanupPendingSeekHandlers();
	// 记录拖动开始前的播放状态，以便拖动结束后恢复
	wasPlayingDuringDrag = Boolean(isPlaying);
	isProgressDragging = true;
	e.preventDefault();
	showProgressTooltip = true;
	scheduleProgressUpdate(e.clientX);
	if (!isBrowser) return;
	try {
		progressBar.setPointerCapture?.(e.pointerId);
	} catch (err) {}
	document.addEventListener("pointermove", onProgressPointerMove, {
		passive: false,
	});
	document.addEventListener("pointerup", stopProgressDrag);
	document.addEventListener("pointercancel", stopProgressDrag);
	try {
		document.body.style.userSelect = "none";
	} catch (e) {}
}

// 将线性 0-1 音量映射为对数曲线，低音量混入少量线性成分以避免突降
function getLogVolume(percent: number, alpha = 1.5, linearMix = 0.6) {
	const clamped = Math.max(0, Math.min(1, percent));
	const logVal = Math.log10(1 + alpha * clamped) / Math.log10(1 + alpha);
	// 动态线性混合：在非常低音量时更多使用线性映射以避免突降
	let dynamicMix = linearMix;
	if (clamped < 0.2) {
		// clamped=0 -> mix=1.0, clamped=0.2 -> mix=linearMix
		dynamicMix = linearMix + 0.8 * (1 - clamped / 0.2);
	}
	return logVal * (1 - dynamicMix) + clamped * dynamicMix;
}

// 对线性百分比应用灵敏度压缩：gamma>1 会在低端压缩变化
function applySensitivity(percent: number, gamma = 2) {
	const p = Math.max(0, Math.min(1, percent));
	return p ** gamma;
}

function setVolume(event: MouseEvent | PointerEvent) {
	if (!audio || !volumeBar) return;
	const rect = volumeBar.getBoundingClientRect();
	const clientX =
		(event as MouseEvent).clientX ?? (event as PointerEvent).clientX;
	let percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
	percent = Math.min(percent, MAX_LINEAR_VOLUME);
	volume = percent;
	volumeTooltipPercent = percent * 100;
	volumeHoverValue = percent;
	// 对音频映射应用低端灵敏度压缩，但保留 UI 滑块为线性显示
	const adjusted = applySensitivity(volume, SENSITIVITY_GAMMA);
	audioVolumeTarget = getLogVolume(adjusted);
	ensureVolumeLoop();
	isMuted = volume === 0;
}

function scheduleVolumeUpdate(clientX: number) {
	lastClientX = clientX;
	if (!isBrowser) return;
	if (rafId == null) {
		rafId = window.requestAnimationFrame(() => {
			rafId = null;
			if (!volumeBar || lastClientX == null) return;
			const rect = volumeBar.getBoundingClientRect();
			let percent = Math.max(
				0,
				Math.min(1, (lastClientX - rect.left) / rect.width),
			);
			percent = Math.min(percent, MAX_LINEAR_VOLUME);
			volume = percent;
			volumeTooltipPercent = percent * 100;
			volumeHoverValue = percent;
			// 应用低端灵敏度压缩后设定目标音量，由平滑循环逐帧逼近
			const adjusted = applySensitivity(volume, SENSITIVITY_GAMMA);
			audioVolumeTarget = getLogVolume(adjusted);
			ensureVolumeLoop();
			isMuted = volume === 0;
			lastClientX = null;
		});
	}
}

function scheduleVolumeHoverUpdate(clientX: number) {
	lastVolumeHoverClientX = clientX;
	if (!isBrowser || isVolumeDragging) return; // 拖拽优先
	if (volHoverRafId == null) {
		volHoverRafId = window.requestAnimationFrame(() => {
			volHoverRafId = null;
			if (!volumeBar || lastVolumeHoverClientX == null) return;
			const rect = volumeBar.getBoundingClientRect();
			const percent = Math.max(
				0,
				Math.min(1, (lastVolumeHoverClientX - rect.left) / rect.width),
			);
			volumeHoverValue = percent;
			volumeTooltipPercent = percent * 100;
			lastVolumeHoverClientX = null;
		});
	}
}

function ensureVolumeLoop() {
	if (!isBrowser) return;
	if (volRafId == null) {
		lastVolTime = performance.now();
		volLoop();
	}
}

function volLoop() {
	volRafId = window.requestAnimationFrame(volLoop);
	const now = performance.now();
	const dt = Math.max(0, (now - lastVolTime) / 1000);
	lastVolTime = now;
	const rate = 30; // 平滑速率，越大越快（更激进）
	const t = 1 - Math.exp(-rate * dt);
	audioVolumeCurrent += (audioVolumeTarget - audioVolumeCurrent) * t;
	if (audio && Math.abs((audio.volume || 0) - audioVolumeCurrent) > 0.0002) {
		audio.volume = audioVolumeCurrent;
	}
	if (
		!isVolumeDragging &&
		Math.abs(audioVolumeCurrent - audioVolumeTarget) < 0.0002
	) {
		if (volRafId != null) {
			cancelAnimationFrame(volRafId);
			volRafId = null;
		}
	}
}

function onVolumePointerMove(e: PointerEvent) {
	if (!isVolumeDragging) return;
	e.preventDefault();
	scheduleVolumeUpdate(e.clientX);
}

function stopVolumeDrag() {
	if (!isVolumeDragging) return;
	isVolumeDragging = false;
	showVolumeTooltip = isVolumeHovering;
	if (!isBrowser) return;
	document.removeEventListener("pointermove", onVolumePointerMove);
	document.removeEventListener("pointerup", stopVolumeDrag);
	document.removeEventListener("pointercancel", stopVolumeDrag);
	try {
		document.body.style.userSelect = "";
	} catch (e) {}
	if (rafId != null) {
		cancelAnimationFrame(rafId);
		rafId = null;
		lastClientX = null;
	}
}

function startVolumeDrag(e: PointerEvent) {
	if (!audio || !volumeBar) return;
	isVolumeDragging = true;
	e.preventDefault();
	showVolumeTooltip = true;
	scheduleVolumeUpdate(e.clientX);
	if (!isBrowser) return;
	try {
		volumeBar.setPointerCapture?.(e.pointerId);
	} catch (err) {}
	document.addEventListener("pointermove", onVolumePointerMove, {
		passive: false,
	});
	document.addEventListener("pointerup", stopVolumeDrag);
	document.addEventListener("pointercancel", stopVolumeDrag);
	try {
		document.body.style.userSelect = "none";
	} catch (e) {}
}

function toggleMute() {
	if (!audio) return;
	// 如果是因自动播放而静音，取消该标记
	if (mutedForAutoplay) {
		mutedForAutoplay = false;
	}
	isMuted = !isMuted;
	audio.muted = isMuted;
}

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const total = Math.floor(seconds);
	const hrs = Math.floor(total / 3600);
	const mins = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function clearAudioEventListeners() {
	// 由于事件监听器是匿名函数，我们通过克隆音频元素来清理所有事件监听器
	if (audio) {
		const newAudio = audio.cloneNode() as HTMLAudioElement;
		// 复制重要属性
		newAudio.volume = audio.volume;
		newAudio.currentTime = audio.currentTime;
		newAudio.preload = audio.preload;
		newAudio.crossOrigin = audio.crossOrigin;
		// 暂停旧音频
		audio.pause();
		// 替换音频元素
		audio = newAudio;
	}
}

function handleAudioEvents() {
	if (!audio) return;
	
	// 先清理之前的事件监听器
	clearAudioEventListeners();
	
	audio.addEventListener("play", () => {
		isPlaying = true;
		// 开始播放时立即预加载下一首歌
		setTimeout(() => {
			const nextIdx = currentIndex + 1;
			if (nextIdx < playlist.length && prefetchedForIndex !== nextIdx) {
				prefetchedForIndex = nextIdx;
				prefetchNext();
			}
		}, 1000);
	});
	audio.addEventListener("pause", () => {
		isPlaying = false;
	});
	audio.addEventListener("timeupdate", () => {
		if (!isProgressDragging) {
			currentTime = audio.currentTime;
		}
		// 当快要播放完当前曲目时，预取下一首以减少切换等待（仅在尚未预取时触发）
		try {
			const nextIdx = currentIndex + 1;
			if (
				nextIdx < playlist.length &&
				prefetchedForIndex !== nextIdx &&
				audio.duration &&
				Number.isFinite(audio.duration)
			) {
				const remaining = audio.duration - audio.currentTime;
				if (remaining <= PREFETCH_THRESHOLD) {
					prefetchedForIndex = nextIdx;
					prefetchNext();
				}
			}
		} catch (e) {
			// 安全容错，若出现异常则忽略
		}
	});
	audio.addEventListener("ended", () => {
		console.debug("Track ended. isRepeating:", isRepeating, "currentIndex:", currentIndex, "playlist.length:", playlist.length, "isProgressDragging:", isProgressDragging);
		// 如果正在拖动进度条，则忽略 ended 事件，等用户释放后再处理
		if (isProgressDragging) {
			console.debug("Ended ignored because progress drag is active");
			return;
		}
		if (isRepeating === 1) {
			// 单曲循环
			audio.currentTime = 0;
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise.catch((e) => { 
					if (e.name !== 'AbortError') {
						logAudioError(e, 'audio ended -> single-loop replay'); 
					}
				});
			}
		} else if (
			isRepeating === 2 ||
			currentIndex < playlist.length - 1 ||
			isShuffled
		) {
			// 列表循环、还有下一首、或随机播放
			console.debug("Calling nextSong() for continuous playback");
			nextSong();
		} else {
			console.debug("Playback stopped at end of playlist");
			isPlaying = false;
		}
	});
	audio.addEventListener("error", (_event) => {
		isLoading = false;
	});
	audio.addEventListener("stalled", () => {
		console.debug("Audio stalled, attempting to reload");
		isLoading = true;
		// 尝试重新加载音频
		setTimeout(() => {
			if (audio && audio.readyState < 3) {
				audio.load();
			}
			isLoading = false;
		}, 1000);
	});
	audio.addEventListener("progress", () => {
		// 监控缓冲进度
		if (audio.buffered.length > 0) {
			const buffered = audio.buffered.end(audio.buffered.length - 1);
			const duration = audio.duration || 1;
			const bufferPercent = (buffered / duration) * 100;
			console.debug(`Buffer progress: ${bufferPercent.toFixed(1)}% (${buffered.toFixed(1)}s / ${duration.toFixed(1)}s)`);
		}
	});
}

onMount(() => {
	// 尽早恢复缓存
	restoreCoverCache();

	audio = new Audio();
	// 关键修复：仅在确定音源支持CORS时才设置crossOrigin
	// 默认情况下不设置，避免CORS错误阻止播放
	// audio.crossOrigin = "anonymous"; // 注释掉，改为按需设置
	
	// 修改预加载策略：使用 auto 而非 metadata，确保音频内容预加载以避免播放卡顿
	audio.preload = "auto";
	
	// 增强缓冲策略：设置更大的缓冲区
	if (audio.buffered !== undefined) {
		// 尝试设置缓冲属性（如果浏览器支持）
		try {
			// 一些浏览器支持设置缓冲大小
			if ('buffered' in audio && typeof audio.buffered === 'object') {
				console.debug("Audio buffering enabled");
			}
		} catch (e) {
			console.debug("Buffer settings not supported:", e);
		}
	}
	
	// 初始化平滑音量当前/目标值（使用灵敏度压缩以使初始低音量更平滑）
	const initAdjusted = applySensitivity(volume, SENSITIVITY_GAMMA);
	audioVolumeCurrent = getLogVolume(initAdjusted);
	audioVolumeTarget = audioVolumeCurrent;
	if (audio) audio.volume = audioVolumeCurrent;
	
	// 禁用 Web Audio API 以避免 CORS 问题
	// Web Audio API 的 MediaElementAudioSource 在跨域音频源上会因 CORS 限制而输出零值（静音）
	// 因此我们直接使用原生 Audio 元素，虽然无法使用增益节点提升音量，但至少能正常播放
	useAudioContext = false;
	console.debug("Audio context disabled to avoid CORS issues");

	// 尝试将播放器根节点移至 document.body，以避免父容器的 overflow/transform 导致裁剪
	try {
		if (isBrowser && rootEl && rootEl.parentElement !== document.body) {
			document.body.appendChild(rootEl);
			portalAppended = true;
			console.debug('MusicPlayer portal appended to document.body');
		}
	} catch (e) {
		console.debug('Failed to append MusicPlayer to body', e);
	}
	
	handleAudioEvents();
	
	if (!musicPlayerConfig.enable) {
		return;
	}
	
	// 视口可见后再加载 Meting 歌单
	if (isBrowser && mode === "meting") {
		io = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				ensureMetingLoaded();
				cleanupIO();
			}
		}, { rootMargin: "200px" });
		if (rootEl) io.observe(rootEl);

		// 任意一次用户交互也触发加载
		const trigger = () => {
			ensureMetingLoaded();
		};
		window.addEventListener("click", trigger, { once: true, capture: true });
		window.addEventListener("keydown", trigger, { once: true, capture: true });

		// 标记首次用户交互，允许之后的程序性播放（但仍受配置控制）
		const markInteracted = () => {
			userInteracted = true;
			window.removeEventListener("click", markInteracted, true);
			window.removeEventListener("keydown", markInteracted, true);
			window.removeEventListener("touchstart", markInteracted, true);
		};
		window.addEventListener("click", markInteracted, { once: true, capture: true });
		window.addEventListener("keydown", markInteracted, { once: true, capture: true });
		window.addEventListener("touchstart", markInteracted, { once: true, capture: true });
		// 刷新后立即尝试加载，不等待交互
		setTimeout(() => {
			ensureMetingLoaded();
		}, 100);
	}
	else {
		// 本地歌单：优先使用构建的 public/music/playlist.json（通过 window.musicData 注入），若不存在回退到内置 localPlaylist
		function initPlaylistFromLocalData() {
			console.debug('initPlaylistFromLocalData: localPlaylist length=', localPlaylist.length, 'window.musicData length=', (typeof window !== 'undefined' && (window as any).musicData ? (window as any).musicData.length : 0), 'BASE_URL=', import.meta.env?.BASE_URL || '/');
			if (localPlaylist.length > 0) console.debug('initPlaylistFromLocalData: first local item=', localPlaylist[0]);
			if (typeof window !== "undefined" && (window as any).musicData && (window as any).musicData.length > 0) {
				console.log("🎵 使用构建时静态同步的本地音乐数据");
				const staticData = (window as any).musicData;
				console.debug('initPlaylistFromLocalData: first static item=', staticData[0]);
				playlist = staticData.map((song: any, index: number) =>
					processSongData({
						id: index + 1,
						title: song.name ?? song.title,
						author: song.artist,
						url: song.url,
						pic: song.cover,
						lrc: song.lrc
					}, getAssetPath, normalizeCoverUrl)
				);
			} else if (localPlaylist.length > 0) {
				playlist = localPlaylist.map((s) =>
					processSongData(s as SongData, getAssetPath, normalizeCoverUrl),
				);
			}

			// 如果配置要求自动连播，设置为列表循环
			if (shouldAutoplayContinuous) {
				isRepeating = 2;
			}

			if (playlist.length > 0) {
				loadSong(playlist[0]);
				// 确保音频元素有正确的初始状态
				setTimeout(() => {
					if (audio && (!audio.src || audio.readyState === 0)) {
						console.debug("Ensuring audio is loaded on mount");
						loadSong(playlist[0]);
					}
				}, 200);
				// 立即预加载当前+后续歌曲的封面，不等待空闲时刻
				preloadCurrentAndNextCovers().catch(() => {});
			} else {
				showErrorMessage("本地播放列表为空");
			}
		}

		// 如果本地列表尚未加载（fetch 异步），等待最多 2s 再初始化，避免竞态导致误报空列表
		if (localPlaylist.length > 0 || (typeof window !== "undefined" && (window as any).musicData && (window as any).musicData.length > 0)) {
			initPlaylistFromLocalData();
		} else {
			// 等待 localPlaylist 被 onMount 的 fetch 填充
			(async () => {
				let waited = 0;
				while (waited < 2000 && localPlaylist.length === 0) {
					await sleep(100);
					waited += 100;
				}
				initPlaylistFromLocalData();
				if (playlist.length === 0) {
					showErrorMessage("本地播放列表为空");
				}
			})();
		}
	}
});

onDestroy(() => {
	cleanupIO();
	if (audio) {
		audio.pause();
		audio.src = "";
	}
	if (preloadAudio) {
		preloadAudio.pause();
		preloadAudio.src = "";
		preloadAudio = null;
	}
	if (isBrowser) {
		document.removeEventListener("pointermove", onVolumePointerMove);
		document.removeEventListener("pointerup", stopVolumeDrag);
		document.removeEventListener("pointercancel", stopVolumeDrag);
		try {
			document.body.style.userSelect = "";
		} catch (e) {}
		if (rafId != null) {
			cancelAnimationFrame(rafId);
			rafId = null;
			lastClientX = null;
		}

		// 清理 portal（如果已移动到 body）
		try {
			if (isBrowser && portalAppended && rootEl && rootEl.parentElement === document.body) {
				rootEl.remove();
				portalAppended = false;
				console.debug('MusicPlayer portal removed from document.body');
			}
		} catch (e) { /* ignore */ }
		if (volHoverRafId != null) {
			cancelAnimationFrame(volHoverRafId);
			volHoverRafId = null;
			lastVolumeHoverClientX = null;
		}
		if (hoverRafId != null) {
			cancelAnimationFrame(hoverRafId);
			hoverRafId = null;
			lastHoverClientX = null;
		}
		if (progRafId != null) {
			cancelAnimationFrame(progRafId);
			progRafId = null;
			lastProgressClientX = null;
		}
		// Revoke any session-scoped blob URLs created during this session to avoid leaks.
		try {
			for (const val of coverCache.values()) {
				if (typeof val === 'string' && val.startsWith('blob:')) {
					try { URL.revokeObjectURL(val); } catch (e) {}
				}
			}
		} catch (e) {}
		if (audioSource) {
			try {
				audioSource.disconnect();
			} catch (e) {}
			audioSource = null;
		}
		if (gainNode) {
			try {
				gainNode.disconnect();
			} catch (e) {}
			gainNode = null;
		}
		if (audioContext) {
			try {
				audioContext.close();
			} catch (e) {}
			audioContext = null;
		}
	}
});
</script>

{#if musicPlayerConfig.enable}
{#if showError}
<div class="fixed bottom-20 right-4 z-[9999] max-w-sm">
    <div class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
        <Icon icon="material-symbols:error" class="text-xl flex-shrink-0" />
        <span class="text-sm flex-1">{errorMessage}</span>
        <button on:click={hideError} class="text-white/80 hover:text-white transition-colors">
            <Icon icon="material-symbols:close" class="text-lg" />
        </button>
    </div>
</div>
{/if}

<div class="music-player fixed bottom-4 right-4 z-[9998] transition-all duration-300 ease-in-out"
	bind:this={rootEl}
	class:expanded={isExpanded}
	class:hidden-mode={isHidden}>
    <!-- 隐藏状态的小圆球 -->
    <div class="orb-player w-12 h-12 bg-[var(--primary)] rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95"
         class:opacity-0={!isHidden}
         class:scale-0={!isHidden}
         class:pointer-events-none={!isHidden}
         on:click={toggleHidden}
         on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHidden();
            }
         }}
         role="button"
         tabindex="0"
         aria-label="显示音乐播放器">
        {#if isLoading}
            <Icon icon="eos-icons:loading" class="text-white text-lg" />
        {:else if isPlaying}
            <div class="flex space-x-0.5">
                <div class="w-0.5 h-3 bg-white rounded-full animate-pulse"></div>
                <div class="w-0.5 h-4 bg-white rounded-full animate-pulse" style="animation-delay: 150ms;"></div>
                <div class="w-0.5 h-2 bg-white rounded-full animate-pulse" style="animation-delay: 300ms;"></div>
            </div>
        {:else}
            <Icon icon="material-symbols:music-note" class="text-white text-lg" />
        {/if}
    </div>
    <!-- 收缩状态的迷你播放器（封面圆形） -->
    <div class="mini-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-3 transition-all duration-500 ease-in-out"
         class:opacity-0={isExpanded || isHidden}
         class:scale-95={isExpanded || isHidden}
         class:pointer-events-none={isExpanded || isHidden}>
        <div class="flex items-center gap-3">
            <!-- 封面区域：点击控制播放/暂停 -->
            <div class="cover-container relative w-12 h-12 rounded-full overflow-hidden cursor-pointer"
                 on:click={togglePlay}
                 on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePlay();
                    }
                 }}
                 role="button"
                 tabindex="0"
                 aria-label={isPlaying ? '暂停' : '播放'}>
				 <img src={currentSong.cover} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading}
					 loading="eager" decoding="sync" fetchpriority="high"
 on:error={handleMiniCoverError} />
                <div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    {#if isLoading}
                        <Icon icon="eos-icons:loading" class="text-white text-xl" />
                    {:else if isPlaying}
                        <Icon icon="material-symbols:pause" class="text-white text-xl" />
                    {:else}
                        <Icon icon="material-symbols:play-arrow" class="text-white text-xl" />
                    {/if}
                </div>
            </div>
            <!-- 歌曲信息区域：点击展开播放器 -->
            <div class="flex-1 min-w-0 cursor-pointer"
                 on:click={toggleExpanded}
                 on:keydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded();
                    }
                 }}
                 role="button"
                 tabindex="0"
                 aria-label="展开音乐播放器">
                <div class="text-sm font-medium text-90 truncate">{currentSong.title}</div>
                <div class="text-xs text-50 truncate">{currentSong.artist}</div>
            </div>
            <div class="flex items-center gap-1">
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click|stopPropagation={toggleHidden}
                        title="隐藏播放器">
                    <Icon icon="material-symbols:visibility-off" class="text-lg" />
                </button>
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click|stopPropagation={toggleExpanded}>
                    <Icon icon="material-symbols:expand-less" class="text-lg" />
                </button>
            </div>
        </div>
    </div>
    <!-- 展开状态的完整播放器（封面圆形） -->
    <div class="expanded-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out"
         class:opacity-0={!isExpanded}
         class:scale-95={!isExpanded}
         class:pointer-events-none={!isExpanded}>
        <div class="flex items-center gap-4 mb-4">
            <div class="cover-container relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
				 <img src={currentSong.cover} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading}
					 loading="eager" decoding="sync" fetchpriority="high"
					 on:error={(event) => {
						const img = event.currentTarget as HTMLImageElement;
						if (img.src.endsWith('/favicon/favicon.ico')) return;
						img.src = '/favicon/favicon.ico';
					}} />
            </div>
            <div class="flex-1 min-w-0">
                <div class="song-title text-lg font-bold text-90 truncate mb-1">{currentSong.title}</div>
                <div class="song-artist text-sm text-50 truncate">{currentSong.artist}</div>
                <div class="text-xs text-30 mt-1">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click={toggleHidden}
                        title="隐藏播放器">
                    <Icon icon="material-symbols:visibility-off" class="text-lg" />
                </button>
                <button class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
                        on:click={toggleExpanded}>
                    <Icon icon="material-symbols:expand-more" class="text-lg" />
                </button>
            </div>
        </div>
        <div class="progress-section mb-4">
						<div class="progress-bar relative flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer"
                 bind:this={progressBar}
                 style="touch-action: none;"
                 on:click={setProgress}
                 on:pointerdown={startProgressDrag}
								 on:mousemove={(e) => { isProgressHovering = true; showProgressTooltip = true; scheduleHoverUpdate(e.clientX); }}
								 on:mouseenter={(e) => { isProgressHovering = true; showProgressTooltip = true; scheduleHoverUpdate(e.clientX); }}
								 on:mouseleave={() => { isProgressHovering = false; if (!isProgressDragging) showProgressTooltip = false; }}
                 on:keydown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                         e.preventDefault();
                         const percent = 0.5;
                         const newTime = percent * duration;
                         if (audio) {
                             audio.currentTime = newTime;
                             currentTime = newTime;
                         }
                     } else if (e.key === 'ArrowLeft') {
                         e.preventDefault();
                         if (duration > 0 && audio) {
                             const newTime = Math.max(0, currentTime - 5);
                             audio.currentTime = newTime;
                             currentTime = newTime;
                         }
                     } else if (e.key === 'ArrowRight') {
                         e.preventDefault();
                         if (duration > 0 && audio) {
                             const newTime = Math.min(duration, currentTime + 5);
                             audio.currentTime = newTime;
                             currentTime = newTime;
                         }
                     }
                 }}
                 role="slider"
                 tabindex="0"
                 aria-label="播放进度"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-valuenow={duration > 0 ? (currentTime / duration * 100) : 0}>
                 <div class="h-full bg-[var(--primary)] rounded-full"
                     style="width: {duration > 0 ? (currentTime / duration) * 100 : 0}%; transition: {isProgressDragging ? 'none' : 'width 200ms ease'}"></div>
								 {#if showProgressTooltip}
									 <div class="progress-tooltip" style="left: {progressTooltipPercent}%">
										 {formatTime(isProgressDragging ? currentTime : tooltipTime)} / {formatTime(duration)}
									 </div>
								 {/if}
            </div>
        </div>
        <div class="controls flex items-center justify-center gap-2 mb-4">
            <!-- 随机按钮高亮 -->
            <button class="w-10 h-10 rounded-lg"
                    class:btn-regular={isShuffled}
                    class:btn-plain={!isShuffled}
                    on:click={toggleShuffle}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:shuffle" class="text-lg" />
            </button>
            <button class="btn-plain w-10 h-10 rounded-lg" on:click={previousSong}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:skip-previous" class="text-xl" />
            </button>
            <button class="btn-regular w-12 h-12 rounded-full"
                    class:opacity-50={isLoading}
                    disabled={isLoading}
                    on:click={togglePlay}>
                {#if isLoading}
                    <Icon icon="eos-icons:loading" class="text-xl" />
                {:else if isPlaying}
                    <Icon icon="material-symbols:pause" class="text-xl" />
                {:else}
                    <Icon icon="material-symbols:play-arrow" class="text-xl" />
                {/if}
            </button>
            <button class="btn-plain w-10 h-10 rounded-lg" on:click={nextSong}
                    disabled={playlist.length <= 1}>
                <Icon icon="material-symbols:skip-next" class="text-xl" />
            </button>
            <!-- 循环按钮高亮 -->
            <button class="w-10 h-10 rounded-lg"
                    class:btn-regular={isRepeating > 0}
                    class:btn-plain={isRepeating === 0}
                    on:click={toggleRepeat}>
                {#if isRepeating === 1}
                    <Icon icon="material-symbols:repeat-one" class="text-lg" />
                {:else if isRepeating === 2}
                    <Icon icon="material-symbols:repeat" class="text-lg" />
                {:else}
                    <Icon icon="material-symbols:repeat" class="text-lg opacity-50" />
                {/if}
            </button>
        </div>
        <div class="bottom-controls flex items-center gap-2">
            <button class="btn-plain w-8 h-8 rounded-lg" on:click={toggleMute}>
                {#if isMuted || volume === 0}
                    <Icon icon="material-symbols:volume-off" class="text-lg" />
                {:else if volume < 0.5}
                    <Icon icon="material-symbols:volume-down" class="text-lg" />
                {:else}
                    <Icon icon="material-symbols:volume-up" class="text-lg" />
                {/if}
            </button>
				<div class="flex-1 h-2 bg-[var(--btn-regular-bg)] rounded-full cursor-pointer relative"
                     bind:this={volumeBar}
                     style="touch-action: none;"
                     on:click={setVolume}
                     on:pointerdown={startVolumeDrag}
					 on:mousemove={(e) => { isVolumeHovering = true; showVolumeTooltip = true; scheduleVolumeHoverUpdate(e.clientX); }}
					 on:mouseenter={(e) => { isVolumeHovering = true; showVolumeTooltip = true; scheduleVolumeHoverUpdate(e.clientX); }}
					 on:mouseleave={() => { isVolumeHovering = false; if (!isVolumeDragging) showVolumeTooltip = false; }}
                     on:keydown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                         e.preventDefault();
                         if (e.key === 'Enter') toggleMute();
                     }
                 }}
                 role="slider"
                 tabindex="0"
                 aria-label="音量控制"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-valuenow={volume * 100}>
                    <div class="h-full bg-[var(--primary)] rounded-full"
                         style="width: {volume * 100}%; transition: {isVolumeDragging ? 'none' : 'width 200ms ease'}"></div>
						{#if showVolumeTooltip}
							<div class="progress-tooltip" style="left: {volumeTooltipPercent}%">
								{Math.round((isVolumeDragging ? volume : volumeHoverValue) * 100)}%
							</div>
						{/if}
            </div>
            <button class="btn-plain w-8 h-8 rounded-lg"
                    class:text-[var(--primary)]={showPlaylist}
                    on:click={togglePlaylist}>
                <Icon icon="material-symbols:queue-music" class="text-lg" />
            </button>
        </div>
    </div>
    {#if showPlaylist}
        <div class="playlist-panel float-panel fixed bottom-20 right-4 w-80 max-h-96 overflow-hidden z-50"
             transition:slide={{ duration: 300, axis: 'y' }}>
            <div class="playlist-header flex items-center justify-between p-4 border-b border-[var(--line-divider)]">
                <h3 class="text-lg font-semibold text-90">{i18n(Key.playlist)}</h3>
                <button class="btn-plain w-8 h-8 rounded-lg" on:click={togglePlaylist}>
                    <Icon icon="material-symbols:close" class="text-lg" />
                </button>
            </div>
            <div class="playlist-content overflow-y-auto max-h-80" style="scrollbar-width: none; -ms-overflow-style: none;">
                {#each playlist as song, index}
                    <div class="playlist-item flex items-center gap-3 p-3 cursor-pointer transition-colors"
                         class:bg-[var(--btn-plain-bg)]={index === currentIndex}
                         class:text-[var(--primary)]={index === currentIndex}
                         on:click={() => playSong(index, true)}
                         on:keydown={(e) => {
                             if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 playSong(index, true);
                             }
                         }}
                         role="button"
                         tabindex="0"
                         aria-label="播放 {song.title} - {song.artist}">
                        <div class="w-6 h-6 flex items-center justify-center">
                            {#if index === currentIndex && isPlaying}
                                <Icon icon="material-symbols:graphic-eq" class="text-[var(--primary)] animate-pulse" />
                            {:else if index === currentIndex}
                                <Icon icon="material-symbols:pause" class="text-[var(--primary)]" />
                            {:else}
                                <span class="text-sm text-[var(--content-meta)]">{index + 1}</span>
                            {/if}
                        </div>
                        <!-- 歌单列表内封面仍为圆角矩形 -->
                        <div class="w-10 h-10 rounded-lg overflow-hidden bg-[var(--btn-regular-bg)] flex-shrink-0">
							<img src={song.cover} alt={song.title} class="w-full h-full object-cover"
								loading={index < 12 ? "eager" : "lazy"}
								fetchpriority={index < 12 ? "high" : "low"}
								decoding="async"
								on:error={(event) => {
									const img = event.currentTarget as HTMLImageElement;
									if (img.src.endsWith('/favicon/favicon.ico')) return;
									const attempt = Number(img.dataset.attempt || '0');
									// 使用备用封面地址
									const fallbacks = [song.cover, DEFAULT_COVER, '/favicon/favicon.ico']
										.filter(Boolean) as string[];

									const next = fallbacks[attempt];
									if (next && attempt < fallbacks.length) {
										img.dataset.attempt = String(attempt + 1);
										img.src = next;
									} else {
										img.src = '/favicon/favicon.ico';
									}
								}} />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium truncate" class:text-[var(--primary)]={index === currentIndex} class:text-90={index !== currentIndex}>
                                {song.title}
                            </div>
                            <div class="text-sm text-[var(--content-meta)] truncate" class:text-[var(--primary)]={index === currentIndex}>
                                {song.artist}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
.orb-player {
	/* 固定在视口右下角，避免随父容器（.music-player）宽度变化而错位 */
	position: fixed;
	right: 16px;
	bottom: 24px;
	z-index: 10001;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	/* 平滑缩放与淡入，启用 GPU 加速 */
	transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease;
	will-change: transform, opacity;
	transform: translateZ(0);
}
.orb-player::before {
	content: '';
	position: absolute;
	inset: -2px;
	background: linear-gradient(45deg, var(--primary), transparent, var(--primary));
	border-radius: 50%;
	z-index: -1;
	opacity: 0;
	transition: opacity 0.3s ease;
}
.orb-player:hover::before {
	opacity: 0.3;
	animation: rotate 2s linear infinite;
}
.orb-player .animate-pulse {
	animation: musicWave 1.5s ease-in-out infinite;
}
@keyframes rotate {
	from { transform: rotate(0deg); }
	to   { transform: rotate(360deg); }
}
@keyframes musicWave {
	0%, 100% { transform: scaleY(0.5); }
	50% { transform: scaleY(1); }
}
.music-player.hidden-mode {
	width: 48px;
	height: 48px;
}
.music-player {
    max-width: 320px;
    user-select: none;
}
.mini-player {
	width: 280px;
	position: fixed;
	bottom: 24px;
	right: 16px;
	z-index: 9999;
	/* Use transform/opacity for smooth GPU-accelerated transitions */
	transform: translateY(6px) scale(1);
	opacity: 1;
	transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform, opacity;
	-webkit-backface-visibility: hidden;
	backface-visibility: hidden;
}
.mini-player.opacity-0,
.mini-player.scale-95 {
	transform: translateY(14px) scale(0.95);
	opacity: 0;
	pointer-events: none;
}
.expanded-player {
	width: 320px;
	position: fixed;
	bottom: 24px;
	right: 16px;
	z-index: 9999;
	transform: translateY(8px) scale(0.98);
	opacity: 0;
	transition: transform 360ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform, opacity;
	-webkit-backface-visibility: hidden;
	backface-visibility: hidden;
}
.expanded-player:not(.opacity-0) {
	transform: translateY(0) scale(1);
	opacity: 1;
	pointer-events: auto;
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}
.progress-section div:hover,
.bottom-controls > div:hover {
    transform: scaleY(1.2);
    transition: transform 0.2s ease;
}
/* 进度条拖拽提示 */
.progress-tooltip {
    position: absolute;
    top: -28px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1.4;
    white-space: nowrap;
    pointer-events: none;
    z-index: 5;
}
@media (max-width: 768px) {
    .music-player {
        max-width: 280px;
        /*left: 8px !important;*/
        bottom: 8px !important;
        right: 8px !important;
    }
    .music-player.expanded {
        width: calc(100vw - 16px);
        max-width: none;
        /*left: 8px !important;*/
        right: 8px !important;
    }
    .playlist-panel {
        width: calc(100vw - 16px) !important;
        /*left: 8px !important;*/
        right: 8px !important;
        max-width: none;
    }
    .controls {
        gap: 8px;
    }
    .controls button {
        width: 36px;
        height: 36px;
    }
    .controls button:nth-child(3) {
        width: 44px;
        height: 44px;
    }
	/* Adjust fixed mini/expanded player offsets on small screens */
	.mini-player,
	.expanded-player {
		bottom: 24px;
		right: 8px;
	}

	/* Mobile: 确保 orb-player 在小屏幕上对齐边距一致，平滑过渡 */
	.orb-player {
		right: 8px;
		bottom: 24px;
		transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease;
	}
}
@media (max-width: 480px) {
    .music-player {
        max-width: 260px;
    }
    .song-title {
        font-size: 14px;
    }
    .song-artist {
        font-size: 12px;
    }
    .controls {
        gap: 6px;
        margin-bottom: 12px;
    }
    .controls button {
        width: 32px;
        height: 32px;
    }
    .controls button:nth-child(3) {
        width: 40px;
        height: 40px;
    }
    .playlist-item {
        padding: 8px 12px;
    }
    .playlist-item .w-10 {
        width: 32px;
        height: 32px;
    }
}
@keyframes slide-up {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
.animate-slide-up {
    animation: slide-up 0.3s ease-out;
}
@media (hover: none) and (pointer: coarse) {
    .music-player button,
    .playlist-item {
        min-height: 44px;
    }
    .progress-section > div,
    .bottom-controls > div:nth-child(2) {
        /* 触摸设备优化 */
    }
}
/* 自定义旋转动画：仅旋转，不修改宽高，停止时保持当前位置 */
@keyframes spin-continuous {
	from { transform: rotate(0deg); }
	to   { transform: rotate(360deg); }
}

.cover-container img {
	transform-origin: 50% 50%;
	animation: spin-continuous 6s linear infinite;
	animation-play-state: paused;
}

.cover-container img.spinning {
	animation-play-state: running;
}

/* 让主题色按钮更有视觉反馈 */
button.bg-\[var\(--primary\)\] {
    box-shadow: 0 0 0 2px var(--primary);
    border: none;
}

/* 隐藏歌单列表滚动条 - 强制覆盖 */
.playlist-content {
	-ms-overflow-style: none !important; /* IE/Edge */
	scrollbar-width: none !important; /* Firefox */
}
.playlist-content::-webkit-scrollbar {
	display: none !important; /* Chrome/Safari */
	width: 0 !important;
	height: 0 !important;
}
:global(.playlist-content) {
	-ms-overflow-style: none !important;
	scrollbar-width: none !important;
}
:global(.playlist-content::-webkit-scrollbar) {
	display: none !important;
	width: 0 !important;
	height: 0 !important;
}

/* 禁用播放列表项目的文本选中和触控高亮，避免主题色高亮时出现黑色横条 */
.playlist-item,
.playlist-item * {
	-webkit-tap-highlight-color: transparent; /* 移动/触控设备 */
	-webkit-user-select: none; /* Safari */
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}
.playlist-item ::selection,
.playlist-item *::selection {
	background: transparent !important;
}
</style>
{/if}
