<script lang="ts">
// 导入 Svelte 的生命周期函数和过渡效果

// 导入 Icon 组件，用于显示图标
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
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
	getFallbackCovers,
	DEFAULT_COVER as UTILS_DEFAULT_COVER,
	type SongData,
	type ProcessedSong,
} from "../../utils/music-loader-utils";

// 音乐播放器模式，可选 "local" 或 "meting"，从本地配置中获取或使用默认值 "meting"
let mode = musicPlayerConfig.mode ?? "meting";
// Meting API 地址，从配置中获取或使用默认地址(bilibili.uno(由哔哩哔哩松坂有希公益管理)),服务器在海外,部分音乐平台可能不支持并且速度可能慢,也可以自建Meting API
let meting_api =
	musicPlayerConfig.meting_api ??
	"https://www.bilibili.uno/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";

// Meting API 候选列表，按优先级排列，当前源失败时自动切换到下一个
const metingApiCandidates = [
	meting_api, // 当前配置源（官方演示 api.i-meto.com）
	"https://api.wuenci.com/meting/api/?server=:server&type=:type&id=:id", // 第三方搭建
	"https://meting.qjqq.cn/api?server=:server&type=:type&id=:id", // 第三方搭建
	"https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&auth=:auth&r=:r", // 加速镜像
	"https://netease-cloud-music-api-gules-mu.vercel.app/api?server=:server&type=:type&id=:id", // Vercel 备份
].filter(Boolean);
// Meting API 的 ID，从配置中获取或使用默认值
let meting_id = musicPlayerConfig.id ?? "17514570572";
// Meting API 的服务器，从配置中获取或使用默认值,有的meting的api源支持更多平台,一般来说,netease=网易云音乐, tencent=QQ音乐, kugou=酷狗音乐, xiami=虾米音乐, baidu=百度音乐
let meting_server = musicPlayerConfig.server ?? "netease";
// Meting API 的类型，从配置中获取或使用默认值
let meting_type = musicPlayerConfig.type ?? "playlist";
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

// 组件根节点与按需加载控制
let rootEl: HTMLElement;
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
	id: string | number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
	coverLoaded?: boolean;
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

// 增强版：带重试与指数回退的封面预加载（使用新的工具函数）
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

const localPlaylist = [
	{
		id: 1,
		title: "ひとり上手",
		artist: "Kaya",
		cover: "assets/music/cover/hitori.webp",
		url: "assets/music/url/hitori.mp3",
		duration: 240,
	},
	{
		id: 2,
		title: "眩耀夜行",
		artist: "スリーズブーケ",
		cover: "assets/music/cover/xryx.webp",
		url: "assets/music/url/xryx.mp3",
		duration: 180,
	},
	{
		id: 3,
		title: "春雷の頃",
		artist: "22/7",
		cover: "assets/music/cover/cl.webp",
		url: "assets/music/url/cl.mp3",
		duration: 200,
	},
];

function buildMetingUrl(template: string) {
	return template
		.replace(":server", meting_server)
		.replace(":type", meting_type)
		.replace(":id", meting_id)
		.replace(":auth", "")
		.replace(":r", Date.now().toString());
}

async function fetchMetingPlaylist() {
	if (!meting_id) return;
	isLoading = true;

	for (let i = 0; i < metingApiCandidates.length; i++) {
		const template = metingApiCandidates[i];
		if (!template) continue;
		const apiUrl = buildMetingUrl(template);
		console.log(`尝试使用 Meting API 源 (${i + 1}/${metingApiCandidates.length}):`, apiUrl);
		try {
			const list = await fetchMetingAPI(apiUrl, 10000 + i * 3000, 3);
			if (list.length > 0) {
				console.log("🎵 Meting API 成功获取歌单，共", list.length, "首歌");
				console.log("🎵 第一首歌数据:", list[0]);
			}
			playlist = list.map((song: SongData) =>
				processSongData(song, getAssetPath, normalizeCoverUrl)
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
			isLoading = false;
			return; // 成功后退出
		} catch (e) {
			console.warn(`Meting API 源失败 (${i + 1}/${metingApiCandidates.length}):`, e);
			// 尝试下一个候选源
		}
	}

	// 所有候选源都失败，使用本地歌单
	isLoading = false;
	console.warn("所有 Meting API 源均失败，使用本地歌单");
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
						audio.play().catch((err) => {
							console.error("Audio play failed:", err);
							showErrorMessage("播放失败，请重试");
						});
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
					audio.play().catch((err) => {
						console.error("Audio play failed after reload:", err);
						showErrorMessage("播放失败，请重试");
					});
				} else {
					audio.addEventListener("canplay", () => {
						audio.play().catch((err) => {
							console.error("Audio play failed:", err);
							showErrorMessage("播放失败，请重试");
						});
					}, { once: true });
				}
			};
			playWhenReady();
		} else if (playlist.length > 0) {
			// 如果当前歌曲无URL但播放列表有歌曲，加载第一首
			loadSong(playlist[0]);
			setTimeout(() => {
				if (audio && audio.readyState >= 2) {
					audio.play().catch((err) => {
						console.error("Audio play failed:", err);
						showErrorMessage("播放失败，请重试");
					});
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
	audio.play().catch((err) => {
		console.error("Audio play failed:", err);
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

function toggleExpanded() {
	isExpanded = !isExpanded;
	if (isExpanded) {
		showPlaylist = false;
		isHidden = false;
		// 展开时确保按需加载
		ensureMetingLoaded();
	}
}

function toggleHidden() {
	isHidden = !isHidden;
	if (isHidden) {
		isExpanded = false;
		showPlaylist = false;
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
		// 异步触发全部封面预加载（不阻塞 UI）
		setTimeout(() => {
			preloadAllPlaylistCovers().catch(() => {});
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
				audio.play().catch(() => {});
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
			if (audio && !isPlaying) {
				audio.play().catch((e) => {
					console.debug('Auto-play after nextSong failed:', e);
				});
			}
		} catch (e) {
			console.debug('Auto-play attempt threw:', e);
		}
	}, 200);
}

function playSong(index: number) {
	if (index < 0 || index >= playlist.length) return;
	const wasPlaying = isPlaying;
	console.debug("playSong called:", { index, wasPlaying, shouldAutoplayContinuous, title: playlist[index]?.title });
	currentIndex = index;
	
	// 检查是否可以直接使用预加载的音频
	if (preloadAudio && prefetchedForIndex === index && preloadAudio.readyState >= 2) {
		console.debug("Using preloaded audio for:", playlist[index].title);
		// 暂停当前音频
		if (audio) {
			try {
				audio.pause();
			} catch (e) {
				console.debug("Pause failed in playSong:", e);
			}
		}
		// 切换到预加载音频
		audio = preloadAudio;
		preloadAudio = null;
		prefetchedForIndex = null;
		// 不要重复处理cover，playlist中的cover已经是完整路径
		currentSong = { ...playlist[currentIndex] };
		audio.volume = audioVolumeCurrent;
		handleAudioEvents(); // 重新绑定事件监听器
		
		// 如果之前在播放，立即开始播放
		if (wasPlaying) {
			audio.play().catch((err) => {
				console.warn("Play preloaded audio failed:", err);
			});
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
	const shouldAutoPlay = wasPlaying || shouldAutoplayContinuous;
	console.debug("Should auto-play next track:", shouldAutoPlay, { wasPlaying, shouldAutoplayContinuous });
	if (shouldAutoPlay) {
		setTimeout(() => {
			if (!audio) return;
			
			const attemptPlay = () => {
				audio.play().catch((err) => {
					console.debug("Play failed after song change:", err);
					// 如果播放失败，尝试再次加载
					if (err.name === 'NotSupportedError' || err.name === 'AbortError') {
						setTimeout(() => {
							if (audio && audio.readyState < 2) {
								console.debug("Reloading audio after play failure");
								audio.load();
								audio.addEventListener("canplay", () => {
									audio.play().catch(() => {});
								}, { once: true });
							}
						}, 200);
					}
				});
			};
			
			if (audio.readyState >= 2) {
				attemptPlay();
			} else {
				audio.addEventListener("canplay", attemptPlay, { once: true });
				// 如果 3 秒后还没有触发 canplay，强制尝试播放
				setTimeout(() => {
					if (audio && audio.readyState < 2) {
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
	
	// 暂停当前播放
	try {
		audio.pause();
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
	audio.src = audioUrl;
	audio.load();
	
	// 强制预加载：尝试播放一小段时间然后暂停，以触发浏览器缓冲
	setTimeout(() => {
		if (audio.readyState < 2) {
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

function handleLoadError(_event: Event) {
	isLoading = false;
	showErrorMessage(`无法播放 "${currentSong.title}"，正在尝试下一首...`);
	if (playlist.length > 1) setTimeout(() => nextSong(), 1000);
	else showErrorMessage("播放列表中没有可用的歌曲");
}

function requestAutoplay() {
	// 已禁用自动播放以避免页面加载时自动开始播放音乐。
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
				audio.currentTime = newTime;
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
			audio.currentTime = finalTime;
			currentTime = finalTime;
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
					audio.play().catch(() => {});
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
			audio.play().catch((e) => {
				console.debug('Resuming playback after drag failed:', e);
			});
		}
	} catch (e) {
		console.debug('Error while trying to resume after drag:', e);
	} finally {
		wasPlayingDuringDrag = false;
	}
}

function startProgressDrag(e: PointerEvent) {
	if (!audio || !progressBar) return;
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
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function handleAudioEvents() {
	if (!audio) return;
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
		currentTime = audio.currentTime;
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
			audio.play().catch(() => {});
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
		
		// 刷新后立即尝试加载，不等待交互
		setTimeout(() => {
			ensureMetingLoaded();
		}, 100);
	}
	else {
		// 本地歌单：立即加载（成本低），但不预加载所有资源
		playlist = localPlaylist.map((s) => {
			const rawCover = normalizeCoverUrl(s.cover);
			const processedCover = rawCover ? getAssetPath(rawCover) : DEFAULT_COVER;
			return {
				...s,
				cover: processedCover,
				url: getAssetPath(s.url),
			};
		});
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
						 on:error={(event) => {
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
						}} />
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
                    <div class="playlist-item flex items-center gap-3 p-3 hover:bg-[var(--btn-plain-bg-hover)] cursor-pointer transition-colors"
                         class:bg-[var(--btn-plain-bg)]={index === currentIndex}
                         class:text-[var(--primary)]={index === currentIndex}
                         on:click={() => playSong(index)}
                         on:keydown={(e) => {
                             if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 playSong(index);
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
	position: relative;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
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
	to { transform: rotate(360deg); }
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
    position: absolute;
    bottom: 0;
    right: 0;
    /*left: 0;*/
}
.expanded-player {
    width: 320px;
    position: absolute;
    bottom: 0;
    right: 0;
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
</style>
{/if}
