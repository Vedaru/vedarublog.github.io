import { get, writable } from "svelte/store";
import { musicPlayerConfig } from "@/config";
import Key from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";

export type Song = {
	id: number;
	title: string;
	artist: string;
	cover: string;
	url: string;
	duration: number;
};

export function createAudioPlayer() {
	let audio: HTMLAudioElement | undefined;
	let progressBar: HTMLElement | undefined;
	let volumeBar: HTMLElement | undefined;
	let willAutoPlay = false;
	let autoplayFailed = false;
	let volumeBarRect: DOMRect | null = null;

	const isPlaying = writable(false);
	const isExpanded = writable(false);
	const isHidden = writable(false);
	const showPlaylist = writable(false);
	const currentTime = writable(0);
	const duration = writable(0);
	const volume = writable(0.7);
	const isMuted = writable(false);
	const isLoading = writable(false);
	const isShuffled = writable(false);
	const isRepeating = writable(0);
	const errorMessage = writable("");
	const showError = writable(false);
	const currentSong = writable<Song>({
		id: 0,
		title: "Sample Song",
		artist: "Sample Artist",
		cover: "/favicon/favicon.ico",
		url: "",
		duration: 0,
	});
	const playlist = writable<Song[]>([]);
	const currentIndex = writable(0);

	const isProgressDragging = writable(false);
	const showProgressTooltip = writable(false);
	const progressTooltipPercent = writable(0);
	const tooltipTime = writable(0);

	const isVolumeDragging = writable(false);
	const isPointerDown = writable(false);
	const showVolumeTooltip = writable(false);
	const volumeTooltipPercent = writable(0);
	const volumeHoverValue = writable(0);

	function bindAudioElement(node: HTMLAudioElement) {
		audio = node;
		return {
			destroy() {
				if (audio === node) audio = undefined;
			},
		};
	}

	function bindProgressBar(node: HTMLElement) {
		progressBar = node;
		return {
			destroy() {
				if (progressBar === node) progressBar = undefined;
			},
		};
	}

	function bindVolumeBar(node: HTMLElement) {
		volumeBar = node;
		return {
			destroy() {
				if (volumeBar === node) volumeBar = undefined;
			},
		};
	}

	function showErrorMessage(message: string) {
		errorMessage.set(message);
		showError.set(true);
		setTimeout(() => {
			showError.set(false);
		}, 3000);
	}

	function hideError() {
		showError.set(false);
	}

	function getAssetPath(path: string): string {
		if (path.startsWith("http://") || path.startsWith("https://")) return path;
		if (path.startsWith("/")) return path;
		return `/${path}`;
	}

	function formatTime(seconds: number): string {
		if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	function loadSong(song: Song) {
		if (!song) return;
		const current = get(currentSong);
		if (song.url !== current.url) {
			currentSong.set({ ...song });
			isLoading.set(!!song.url);
		}
	}

	async function fetchMetingPlaylist() {
		isLoading.set(true);
		try {
			const res = await fetch("/assets/music/playlist.json");
			if (!res.ok) throw new Error("playlist.json not found");
			const list: Record<string, unknown>[] = await res.json();
			const songs = list.map((song, index) => {
				let title =
					(song.name as string) ??
					(song.title as string) ??
					i18n(Key.unknownSong);
				let artist =
					(song.artist as string) ??
					(song.author as string) ??
					i18n(Key.unknownArtist);
				let dur = (song.duration as number) ?? 0;
				if (dur > 10000) dur = Math.floor(dur / 1000);
				if (!Number.isFinite(dur) || dur <= 0) dur = 0;
				return {
					id: index,
					title,
					artist,
					cover:
						(song.cover as string) ??
						`/assets/music/cover/${index}-default.jpg`,
					url:
						(song.url as string) ??
						`/assets/music/url/${index}-meting.opus`,
					duration: dur,
				};
			});
			playlist.set(songs);
			if (songs.length > 0) {
				loadSong(songs[0]);
			}
			isLoading.set(false);
		} catch {
			showErrorMessage(i18n(Key.musicPlayerErrorPlaylist));
			isLoading.set(false);
		}
	}

	function togglePlay() {
		const song = get(currentSong);
		if (!audio || !song.url) return;
		if (get(isPlaying)) {
			audio.pause();
		} else {
			audio.play().catch(() => {});
		}
	}

	function toggleExpanded() {
		isExpanded.update((v) => !v);
		if (get(isExpanded)) {
			showPlaylist.set(false);
			isHidden.set(false);
		}
	}

	function toggleHidden() {
		isHidden.update((v) => !v);
		if (get(isHidden)) {
			isExpanded.set(false);
			showPlaylist.set(false);
		}
	}

	function togglePlaylist() {
		showPlaylist.update((v) => !v);
	}

	function toggleShuffle() {
		isShuffled.update((v) => !v);
		if (get(isShuffled)) {
			isRepeating.set(0);
		}
	}

	function toggleRepeat() {
		isRepeating.update((v) => (v + 1) % 3);
		if (get(isRepeating) !== 0) {
			isShuffled.set(false);
		}
	}

	function playSong(index: number, autoPlay = true) {
		const list = get(playlist);
		if (index < 0 || index >= list.length) return;
		willAutoPlay = autoPlay;
		currentIndex.set(index);
		loadSong(list[index]);
	}

	function previousSong() {
		const list = get(playlist);
		if (list.length <= 1) return;
		const idx = get(currentIndex);
		const newIndex = idx > 0 ? idx - 1 : list.length - 1;
		playSong(newIndex);
	}

	function nextSong(autoPlay = true) {
		const list = get(playlist);
		if (list.length <= 1) return;

		const idx = get(currentIndex);
		let newIndex: number;
		if (get(isShuffled)) {
			do {
				newIndex = Math.floor(Math.random() * list.length);
			} while (newIndex === idx && list.length > 1);
		} else {
			newIndex = idx < list.length - 1 ? idx + 1 : 0;
		}
		playSong(newIndex, autoPlay);
	}

	function handleLoadSuccess() {
		isLoading.set(false);
		if (audio?.duration && audio.duration > 1) {
			const dur = Math.floor(audio.duration);
			duration.set(dur);
			playlist.update((list) => {
				const idx = get(currentIndex);
				return list.map((song, i) =>
					i === idx ? { ...song, duration: dur } : song,
				);
			});
			currentSong.update((song) => ({ ...song, duration: dur }));
		}

		if (willAutoPlay || get(isPlaying)) {
			const playPromise = audio?.play();
			if (playPromise !== undefined) {
				playPromise.catch((error) => {
					console.warn("自动播放被拦截，等待用户交互:", error);
					autoplayFailed = true;
					isPlaying.set(false);
				});
			}
		}
	}

	function handleUserInteraction() {
		if (autoplayFailed && audio) {
			const playPromise = audio.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						autoplayFailed = false;
					})
					.catch(() => {});
			}
		}
	}

	function handleLoadError() {
		const song = get(currentSong);
		if (!song.url) return;
		isLoading.set(false);
		showErrorMessage(i18n(Key.musicPlayerErrorSong));

		const shouldContinue = get(isPlaying) || willAutoPlay;
		if (get(playlist).length > 1) {
			setTimeout(() => nextSong(shouldContinue), 1000);
		} else {
			showErrorMessage(i18n(Key.musicPlayerErrorEmpty));
		}
	}

	function handleAudioEnded() {
		if (get(isRepeating) === 1) {
			if (audio) {
				audio.currentTime = 0;
				audio.play().catch(() => {});
			}
		} else if (
			get(isRepeating) === 2 ||
			get(isShuffled) ||
			musicPlayerConfig.autoplayContinuous
		) {
			nextSong(true);
		} else {
			isPlaying.set(false);
		}
	}

	function setProgress(event: MouseEvent) {
		if (!audio || !progressBar) return;
		const rect = progressBar.getBoundingClientRect();
		const percent = (event.clientX - rect.left) / rect.width;
		const dur = get(duration);
		const newTime = percent * dur;
		audio.currentTime = newTime;
		currentTime.set(newTime);
	}

	function handleProgressHover(e: PointerEvent) {
		if (!progressBar) return;
		const rect = progressBar.getBoundingClientRect();
		const percent = Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
		progressTooltipPercent.set(percent * 100);
		tooltipTime.set(percent * (get(duration) || 0));
	}

	function startProgressDrag(event: PointerEvent) {
		if (!progressBar) return;
		event.preventDefault();
		progressBar.setPointerCapture(event.pointerId);
		isProgressDragging.set(true);
		showProgressTooltip.set(true);
		handleProgressHover(event);
	}

	function stopProgressDrag(event: PointerEvent) {
		if (!get(isProgressDragging)) return;
		isProgressDragging.set(false);

		if (progressBar) {
			try {
				progressBar.releasePointerCapture(event.pointerId);
			} catch {
				// ignore
			}
		}

		if (audio) {
			const time = get(tooltipTime);
			audio.currentTime = time;
			currentTime.set(time);
			if (get(isPlaying)) audio.play().catch(() => {});
		}
		showProgressTooltip.set(false);
	}

	function handleVolumeHover(e: PointerEvent) {
		if (!volumeBar) return;
		const rect = volumeBar.getBoundingClientRect();
		const percent = Math.max(
			0,
			Math.min(1, (e.clientX - rect.left) / rect.width),
		);
		volumeTooltipPercent.set(percent * 100);
		volumeHoverValue.set(percent);
	}

	function updateVolumeLogic(clientX: number) {
		if (!audio || !volumeBar) return;
		const rect = volumeBarRect || volumeBar.getBoundingClientRect();
		const percent = Math.max(
			0,
			Math.min(1, (clientX - rect.left) / rect.width),
		);
		volume.set(percent);
	}

	function startVolumeDrag(event: PointerEvent) {
		if (!volumeBar) return;
		event.preventDefault();
		isPointerDown.set(true);
		isVolumeDragging.set(true);
		volumeBar.setPointerCapture(event.pointerId);
		volumeBarRect = volumeBar.getBoundingClientRect();
		updateVolumeLogic(event.clientX);
		showVolumeTooltip.set(true);
		handleVolumeHover(event);
	}

	function handleVolumeMove(event: PointerEvent) {
		if (get(isPointerDown) && get(isVolumeDragging)) {
			event.preventDefault();
			updateVolumeLogic(event.clientX);
			handleVolumeHover(event);
		}
	}

	function stopVolumeDrag(event: PointerEvent) {
		if (!get(isPointerDown)) return;
		isPointerDown.set(false);
		isVolumeDragging.set(false);
		volumeBarRect = null;
		showVolumeTooltip.set(false);

		if (volumeBar) {
			try {
				volumeBar.releasePointerCapture(event.pointerId);
			} catch {
				// ignore
			}
		}
	}

	function toggleMute() {
		isMuted.update((v) => !v);
	}

	function handleTimeUpdate() {
		if (!get(isProgressDragging) && audio) {
			currentTime.set(audio.currentTime);
		}
	}

	return {
		stores: {
			isPlaying,
			isExpanded,
			isHidden,
			showPlaylist,
			currentTime,
			duration,
			volume,
			isMuted,
			isLoading,
			isShuffled,
			isRepeating,
			errorMessage,
			showError,
			currentSong,
			playlist,
			currentIndex,
			isProgressDragging,
			showProgressTooltip,
			progressTooltipPercent,
			tooltipTime,
			isVolumeDragging,
			showVolumeTooltip,
			volumeTooltipPercent,
			volumeHoverValue,
		},
		actions: {
			bindAudioElement,
			bindProgressBar,
			bindVolumeBar,
			fetchMetingPlaylist,
			togglePlay,
			toggleExpanded,
			toggleHidden,
			togglePlaylist,
			toggleShuffle,
			toggleRepeat,
			previousSong,
			nextSong,
			playSong,
			getAssetPath,
			formatTime,
			showErrorMessage,
			hideError,
			handleLoadSuccess,
			handleLoadError,
			handleAudioEnded,
			handleUserInteraction,
			handleTimeUpdate,
			setProgress,
			handleProgressHover,
			startProgressDrag,
			stopProgressDrag,
			handleVolumeHover,
			startVolumeDrag,
			handleVolumeMove,
			stopVolumeDrag,
			toggleMute,
		},
	};
}

export type AudioPlayer = ReturnType<typeof createAudioPlayer>;
