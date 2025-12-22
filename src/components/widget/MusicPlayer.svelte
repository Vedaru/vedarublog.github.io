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

// 音乐播放器模式，可选 "local" 或 "meting"，从本地配置中获取或使用默认值 "meting"
let mode = musicPlayerConfig.mode ?? "meting";
// Meting API 地址，从配置中获取或使用默认地址(bilibili.uno(由哔哩哔哩松坂有希公益管理)),服务器在海外,部分音乐平台可能不支持并且速度可能慢,也可以自建Meting API
let meting_api =
	musicPlayerConfig.meting_api ??
	"https://www.bilibili.uno/api?server=:server&type=:type&id=:id&auth=:auth&r=:r";
// Meting API 的 ID，从配置中获取或使用默认值
let meting_id = musicPlayerConfig.id ?? "14164869977";
// Meting API 的服务器，从配置中获取或使用默认值,有的meting的api源支持更多平台,一般来说,netease=网易云音乐, tencent=QQ音乐, kugou=酷狗音乐, xiami=虾米音乐, baidu=百度音乐
let meting_server = musicPlayerConfig.server ?? "netease";
// Meting API 的类型，从配置中获取或使用默认值
let meting_type = musicPlayerConfig.type ?? "playlist";
// 播放状态，默认为 false (未播放)
let isPlaying = false;
// 环境标识（仅在浏览器中可用 window）
const isBrowser = typeof window !== "undefined";
// 播放器是否展开，默认为 false
let isExpanded = false;
// 播放器是否隐藏，默认为 false
let isHidden = false;
// 是否显示播放列表，默认为 false
let showPlaylist = false;
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
// 错误信息，默认为空字符串
let errorMessage = "";
// 是否显示错误信息，默认为 false
let showError = false;

// 当前歌曲信息
let currentSong = {
	title: "Sample Song",
	artist: "Sample Artist",
	cover: "/favicon/favicon.ico",
	url: "",
	duration: 0,
};

type Song = {
	id: number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

async function preloadCurrentAndNextCovers() {
	try {
		const toPreload = [];
		// 仅预加载当前歌曲封面
		if (currentIndex < playlist.length && playlist[currentIndex]?.cover) {
			toPreload.push(
				fetch(playlist[currentIndex].cover, { mode: "no-cors" }).catch(
					() => {},
				),
			);
		}
		// 预加载下一首歌曲封面
		const nextIdx = (currentIndex + 1) % playlist.length;
		if (nextIdx < playlist.length && playlist[nextIdx]?.cover) {
			toPreload.push(
				fetch(playlist[nextIdx].cover, { mode: "no-cors" }).catch(
					() => {},
				),
			);
		}
		if (toPreload.length > 0) {
			await Promise.all(toPreload);
		}
	} catch (e) {
		console.debug("Preload covers skipped", e);
	}
}

let playlist: Song[] = [];
let currentIndex = 0;
let audio: HTMLAudioElement;
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

async function fetchMetingPlaylist(retryCount = 0) {
	if (!meting_api || !meting_id) return;
	isLoading = true;
	const apiUrl = meting_api
		.replace(":server", meting_server)
		.replace(":type", meting_type)
		.replace(":id", meting_id)
		.replace(":auth", "")
		.replace(":r", Date.now().toString());
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
		
		const res = await fetch(apiUrl, { 
			signal: controller.signal,
			cache: "default" // 允许浏览器缓存
		});
		clearTimeout(timeoutId);
		
		if (!res.ok) throw new Error(`meting api error: ${res.status}`);
		const list = await res.json();
		
		if (!Array.isArray(list) || list.length === 0) {
			throw new Error("歌单为空");
		}
		
		playlist = list.map((song) => {
			let title = song.name ?? song.title ?? "未知歌曲";
			let artist = song.artist ?? song.author ?? "未知艺术家";
			let dur = song.duration ?? 0;
			if (dur > 10000) dur = Math.floor(dur / 1000);
			if (!Number.isFinite(dur) || dur <= 0) dur = 0;
			return {
				id: song.id,
				title,
				artist,
				cover: getAssetPath(song.pic ?? ""),
				url: getAssetPath(song.url ?? ""),
				duration: dur,
			};
		});
		if (playlist.length > 0) {
			loadSong(playlist[0]);
			preloadCurrentAndNextCovers();
		}
		isLoading = false;
	} catch (e) {
		console.error("Meting fetch error:", e);
		isLoading = false;
		
		// 重试机制：最多重试2次，间隔递增
		if (retryCount < 2) {
			const delay = (retryCount + 1) * 1000; // 1秒、2秒
			console.log(`Retrying Meting API in ${delay}ms... (${retryCount + 1}/2)`);
			setTimeout(() => {
				fetchMetingPlaylist(retryCount + 1);
			}, delay);
		} else {
			// 最终失败：回退到本地歌单或显示友好错误
			showErrorMessage("Meting 歌单加载失败，正在使用本地歌单");
			if (localPlaylist.length > 0) {
				playlist = localPlaylist.map((s) => ({
					...s,
					cover: getAssetPath(s.cover),
					url: getAssetPath(s.url),
				}));
				if (playlist.length > 0) {
					loadSong(playlist[0]);
					preloadCurrentAndNextCovers();
				}
			}
		}
	}
}

function togglePlay() {
	if (!audio || !currentSong.url) return;
	if (isPlaying) {
		audio.pause();
	} else {
		// 确保音频上下文恢复，以启用增益节点
		if (audioContext?.state === "suspended") {
			audioContext.resume().catch(() => {});
		}
		// 调试信息：输出当前音频状态，便于排查无声问题
		console.debug("Audio play request", {
			src: audio.src,
			volume: audio.volume,
			muted: audio.muted,
			audioContextState: audioContext?.state,
			gain: gainNode?.gain?.value,
		});
		// 确保取消静音并有合理音量后播放
		audio.muted = false;
		if (!Number.isFinite(audio.volume) || audio.volume === 0) {
			audio.volume = Math.max(0.01, audioVolumeCurrent || 0.3);
		}
		audio.play().catch((err) => {
			console.error("Audio play failed:", err);
			showErrorMessage(
				"播放被阻止或音频资源不可用，请检查浏览器控制台与网络请求",
			);
		});
	}
}

function toggleExpanded() {
	isExpanded = !isExpanded;
	if (isExpanded) {
		showPlaylist = false;
		isHidden = false;
		// 当用户首次展开播放器时，立即加载 Meting 播放列表（如果还未加载）
		if (mode === "meting" && playlist.length === 0 && !isLoading) {
			console.log("User expanded player, fetching Meting playlist now...");
			fetchMetingPlaylist();
		}
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
	if (playlist.length <= 1) return;
	let newIndex: number;
	if (isShuffled) {
		do {
			newIndex = Math.floor(Math.random() * playlist.length);
		} while (newIndex === currentIndex && playlist.length > 1);
	} else {
		newIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
	}
	playSong(newIndex);
}

function playSong(index: number) {
	if (index < 0 || index >= playlist.length) return;
	const wasPlaying = isPlaying;
	currentIndex = index;
	if (audio) audio.pause();
	loadSong(playlist[currentIndex]);
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
	if (wasPlaying || !isPlaying) {
		setTimeout(() => {
			if (!audio) return;
			if (audio.readyState >= 2) {
				audio.play().catch(() => {});
			} else {
				audio.addEventListener(
					"canplay",
					() => {
						audio.play().catch(() => {});
					},
					{ once: true },
				);
			}
		}, 100);
	}
}

// 预取下一首音频以减小切换等待（在支持 CORS 的来源上有效）
async function prefetchNext() {
	try {
		const nextIndex = currentIndex + 1;
		if (!playlist || nextIndex >= playlist.length) return;
		const next = playlist[nextIndex];
		if (!next || !next.url) return;
		// 使用 fetch 尝试预取资源到浏览器缓存（若服务端允许 CORS）
		await fetch(getAssetPath(next.url), { method: "GET", mode: "cors" });
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

function loadSong(song: typeof currentSong) {
	if (!song || !audio) return;
	currentSong = { ...song, cover: getAssetPath(song.cover) };
	if (song.url) {
		isLoading = true;
		audio.pause();
		audio.currentTime = 0;
		currentTime = 0;
		duration = song.duration ?? 0;
		audio.removeEventListener("loadeddata", handleLoadSuccess);
		audio.removeEventListener("error", handleLoadError);
		audio.removeEventListener("loadstart", handleLoadStart);
		audio.addEventListener("loadeddata", handleLoadSuccess, { once: true });
		audio.addEventListener("error", handleLoadError, { once: true });
		audio.addEventListener("loadstart", handleLoadStart, { once: true });
		audio.src = getAssetPath(song.url);
		audio.load();
	} else {
		isLoading = false;
	}
}

function handleLoadSuccess() {
	isLoading = false;
	if (audio?.duration && audio.duration > 1) {
		duration = Math.floor(audio.duration);
		if (playlist[currentIndex]) playlist[currentIndex].duration = duration;
		currentSong.duration = duration;
	}
}

function handleLoadError(_event: Event) {
	isLoading = false;
	showErrorMessage(`无法播放 "${currentSong.title}"，正在尝试下一首...`);
	if (playlist.length > 1) setTimeout(() => nextSong(), 1000);
	else showErrorMessage("播放列表中没有可用的歌曲");
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
	const percent = (event.clientX - rect.left) / rect.width;
	const newTime = percent * duration;
	audio.currentTime = newTime;
	currentTime = newTime;
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
			const newTime = percent * duration;
			currentTime = newTime;
			audio.currentTime = newTime;
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
}

function startProgressDrag(e: PointerEvent) {
	if (!audio || !progressBar) return;
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
		if (isRepeating === 1) {
			audio.currentTime = 0;
			audio.play().catch(() => {});
		} else if (
			isRepeating === 2 ||
			currentIndex < playlist.length - 1 ||
			isShuffled
		) {
			nextSong();
		} else {
			isPlaying = false;
		}
	});
	audio.addEventListener("error", (_event) => {
		isLoading = false;
	});
	audio.addEventListener("stalled", () => {});
	audio.addEventListener("waiting", () => {});
}

onMount(() => {
	audio = new Audio();
	// 为跨域音频尝试启用匿名请求，必须在设置 src 之前设置
	audio.crossOrigin = "anonymous";
	// 改用 'metadata' 预加载策略：只加载元数据，不预加载音频数据，减少带宽占用
	audio.preload = "metadata";
	// 初始化平滑音量当前/目标值（使用灵敏度压缩以使初始低音量更平滑）
	const initAdjusted = applySensitivity(volume, SENSITIVITY_GAMMA);
	audioVolumeCurrent = getLogVolume(initAdjusted);
	audioVolumeTarget = audioVolumeCurrent;
	if (audio) audio.volume = audioVolumeCurrent;
	// 尝试创建 Web Audio 增益节点以提升最大音量
	if (isBrowser && !audioContext && useAudioContext) {
		try {
			audioContext = new AudioContext();
			// 在某些跨域源（无 CORS）下，createMediaElementSource 仍可创建节点但输出会被清零；
			// 因此我们在 try/catch 中创建并在出错时回退到不使用 AudioContext。
			audioSource = audioContext.createMediaElementSource(audio);
			audioSource.connect(audioContext.destination);
		} catch (e) {
			// 如果创建或连接失败（可能是 CORS 或安全限制），回退到不使用 WebAudio
			console.warn(
				"AudioContext or MediaElementAudioSource init failed, falling back:",
				e,
			);
			try {
				if (audioSource) {
					audioSource.disconnect();
				}
				if (gainNode) {
					gainNode.disconnect();
				}
			} catch (ignore) {}
			audioSource = null;
			gainNode = null;
			audioContext = null;
			useAudioContext = false;
		}
	}
	handleAudioEvents();
	if (!musicPlayerConfig.enable) {
		return;
	}
	// 延迟加载歌单：在空闲时或用户交互时加载数据
	if (mode === "meting") {
		// Meting：延迟 500ms 加载，给浏览器更多准备时间
		setTimeout(() => {
			fetchMetingPlaylist();
		}, 500);
	} else {
		// 本地歌单：立即加载（成本低），但不预加载所有资源
		playlist = localPlaylist.map((s) => ({
			...s,
			cover: getAssetPath(s.cover),
			url: getAssetPath(s.url),
		}));
		if (playlist.length > 0) {
			loadSong(playlist[0]);
			// 只预加载当前和下一首封面，不加载所有资源
			preloadCurrentAndNextCovers();
		} else {
			showErrorMessage("本地播放列表为空");
		}
	}
});

onDestroy(() => {
	if (audio) {
		audio.pause();
		audio.src = "";
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
<div class="fixed bottom-20 right-4 z-[60] max-w-sm">
    <div class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up">
        <Icon icon="material-symbols:error" class="text-xl flex-shrink-0" />
        <span class="text-sm flex-1">{errorMessage}</span>
        <button on:click={hideError} class="text-white/80 hover:text-white transition-colors">
            <Icon icon="material-symbols:close" class="text-lg" />
        </button>
    </div>
</div>
{/if}

<div class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
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
				 <img src={getAssetPath(currentSong.cover)} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading}
					 loading="lazy" decoding="async" fetchpriority="low" />
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
				 <img src={getAssetPath(currentSong.cover)} alt="封面"
					 class="w-full h-full object-cover transition-transform duration-300"
					 class:spinning={isPlaying && !isLoading}
					 class:animate-pulse={isLoading}
					 loading="lazy" decoding="async" fetchpriority="low" />
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
            <div class="playlist-content overflow-y-auto max-h-80">
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
							<img src={getAssetPath(song.cover)} alt={song.title} class="w-full h-full object-cover" loading="lazy" decoding="async" fetchpriority="low" />
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
        height: 12px;
    }
}
/* 自定义旋转动画，停止时保持当前位置 */
@keyframes spin-continuous {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.cover-container img {
    animation: spin-continuous 3s linear infinite;
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
</style>
{/if}
