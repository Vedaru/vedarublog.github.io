<script lang="ts">
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { musicPlayerConfig } from "@/config";
import Key from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import { createAudioPlayer } from "@/lib/audio/useAudioPlayer";
import Controls from "./music/Controls.svelte";
import Playlist from "./music/Playlist.svelte";

const player = createAudioPlayer();
const { stores, actions } = player;
const {
	isPlaying,
	isExpanded,
	isHidden,
	showPlaylist,
	currentTime,
	duration,
	volume,
	isMuted,
	isLoading,
	showError,
	errorMessage,
	currentSong,
	isProgressDragging,
	isVolumeDragging,
} = stores;

const {
	bindAudioElement,
	fetchMetingPlaylist,
	togglePlay,
	toggleExpanded,
	toggleHidden,
	togglePlaylist,
	getAssetPath,
	formatTime,
	hideError,
	handleLoadSuccess,
	handleLoadError,
	handleAudioEnded,
	handleUserInteraction,
	handleTimeUpdate,
	handleVolumeMove,
	stopVolumeDrag,
	stopProgressDrag,
} = actions;

const interactionEvents = ["click", "keydown", "touchstart"];

onMount(() => {
	interactionEvents.forEach((event) => {
		document.addEventListener(event, handleUserInteraction, { capture: true });
	});

	if (!musicPlayerConfig.enable) {
		return;
	}
	fetchMetingPlaylist();
});

onDestroy(() => {
	if (typeof document !== "undefined") {
		interactionEvents.forEach((event) => {
			document.removeEventListener(event, handleUserInteraction, {
				capture: true,
			});
		});
	}
});
</script>

<audio
	use:bindAudioElement
	src={getAssetPath($currentSong.url)}
	volume={$volume}
	muted={$isMuted}
	on:play={() => isPlaying.set(true)}
	on:pause={() => isPlaying.set(false)}
	on:timeupdate={handleTimeUpdate}
	on:ended={handleAudioEnded}
	on:error={handleLoadError}
	on:loadeddata={handleLoadSuccess}
	preload="auto"
></audio>

<svelte:window
	on:pointermove={(e) => {
		if ($isVolumeDragging) handleVolumeMove(e);
		if ($isProgressDragging) actions.handleProgressHover(e);
	}}
	on:pointerup={(e) => {
		if ($isVolumeDragging) stopVolumeDrag(e);
		if ($isProgressDragging) stopProgressDrag(e);
	}}
/>

{#if musicPlayerConfig.enable}
	{#if $showError}
		<div class="fixed bottom-20 right-4 z-[60] max-w-sm">
			<div
				class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up"
			>
				<Icon icon="material-symbols:error" class="text-xl flex-shrink-0" />
				<span class="text-sm flex-1">{$errorMessage}</span>
				<button
					on:click={hideError}
					class="text-white/80 hover:text-white transition-colors"
				>
					<Icon icon="material-symbols:close" class="text-lg" />
				</button>
			</div>
		</div>
	{/if}

	<div
		class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
		class:expanded={$isExpanded}
		class:hidden-mode={$isHidden}
	>
		<div
			class="orb-player w-12 h-12 bg-[var(--primary)] rounded-full shadow-lg cursor-pointer transition-all duration-500 ease-in-out flex items-center justify-center hover:scale-110 active:scale-95"
			class:opacity-0={!$isHidden}
			class:scale-0={!$isHidden}
			class:pointer-events-none={!$isHidden}
			on:click={toggleHidden}
			role="button"
			tabindex="0"
		>
			{#if $isLoading}
				<Icon icon="material-symbols:progress-activity" class="text-white text-lg" />
			{:else if $isPlaying}
				<div class="flex space-x-0.5">
					<div class="w-0.5 h-3 bg-white rounded-full animate-pulse"></div>
					<div
						class="w-0.5 h-4 bg-white rounded-full animate-pulse"
						style="animation-delay: 150ms;"
					></div>
					<div
						class="w-0.5 h-2 bg-white rounded-full animate-pulse"
						style="animation-delay: 300ms;"
					></div>
				</div>
			{:else}
				<Icon icon="material-symbols:music-note" class="text-white text-lg" />
			{/if}
		</div>

		<div
			class="mini-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-3 transition-all duration-500 ease-in-out"
			class:opacity-0={$isExpanded || $isHidden}
			class:scale-95={$isExpanded || $isHidden}
			class:pointer-events-none={$isExpanded || $isHidden}
		>
			<div class="flex items-center gap-3">
				<div
					class="cover-container relative w-12 h-12 rounded-full overflow-hidden cursor-pointer"
					on:click={togglePlay}
					role="button"
					tabindex="0"
				>
					<img
						src={getAssetPath($currentSong.cover)}
						alt={i18n(Key.musicPlayerCover)}
						class="w-full h-full object-cover transition-transform duration-300"
						class:spinning={$isPlaying && !$isLoading}
						class:animate-pulse={$isLoading}
					/>
					<div
						class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
					>
						{#if $isLoading}
							<Icon
								icon="material-symbols:progress-activity"
								class="text-white text-xl"
							/>
						{:else if $isPlaying}
							<Icon icon="material-symbols:pause" class="text-white text-xl" />
						{:else}
							<Icon icon="material-symbols:play-arrow" class="text-white text-xl" />
						{/if}
					</div>
				</div>
				<div
					class="flex-1 min-w-0 cursor-pointer"
					on:click={toggleExpanded}
					role="button"
					tabindex="0"
				>
					<div class="text-sm font-medium text-90 truncate">
						{$currentSong.title}
					</div>
					<div class="text-xs text-50 truncate">{$currentSong.artist}</div>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						on:click|stopPropagation={toggleHidden}
					>
						<Icon icon="material-symbols:visibility-off" class="text-lg" />
					</button>
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						on:click|stopPropagation={toggleExpanded}
					>
						<Icon icon="material-symbols:expand-less" class="text-lg" />
					</button>
				</div>
			</div>
		</div>

		<div
			class="expanded-player card-base bg-[var(--float-panel-bg)] shadow-xl rounded-2xl p-4 transition-all duration-500 ease-in-out"
			class:opacity-0={!$isExpanded}
			class:scale-95={!$isExpanded}
			class:pointer-events-none={!$isExpanded}
		>
			<div class="flex items-center gap-4 mb-4">
				<div
					class="cover-container relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
				>
					<img
						src={getAssetPath($currentSong.cover)}
						alt={i18n(Key.musicPlayerCover)}
						class="w-full h-full object-cover transition-transform duration-300"
						class:spinning={$isPlaying && !$isLoading}
						class:animate-pulse={$isLoading}
					/>
				</div>
				<div class="flex-1 min-w-0">
					<div class="song-title text-lg font-bold text-90 truncate mb-1">
						{$currentSong.title}
					</div>
					<div class="song-artist text-sm text-50 truncate">
						{$currentSong.artist}
					</div>
					<div class="text-xs text-30 mt-1">
						{formatTime($currentTime)} / {formatTime($duration)}
					</div>
				</div>
				<div class="flex items-center gap-1">
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						on:click={toggleHidden}
					>
						<Icon icon="material-symbols:visibility-off" class="text-lg" />
					</button>
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						class:text-[var(--primary)]={$showPlaylist}
						on:click={togglePlaylist}
					>
						<Icon icon="material-symbols:queue-music" class="text-lg" />
					</button>
				</div>
			</div>

			<Controls {player} />
		</div>

		{#if $showPlaylist}
			<Playlist {player} />
		{/if}
	</div>

	<style>
		.transition-none {
			transition: none !important;
		}

		.orb-player {
			position: relative;
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
		}
		.orb-player::before {
			content: "";
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
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}
		@keyframes musicWave {
			0%,
			100% {
				transform: scaleY(0.5);
			}
			50% {
				transform: scaleY(1);
			}
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
			0%,
			100% {
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
		@media (max-width: 768px) {
			.music-player {
				max-width: 280px;
				bottom: 8px !important;
				right: 8px !important;
			}
			.music-player.expanded {
				width: calc(100vw - 16px);
				max-width: none;
				right: 8px !important;
			}
			.playlist-panel {
				width: calc(100vw - 16px) !important;
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

		button.bg-\[var\(--primary\)\] {
			box-shadow: 0 0 0 2px var(--primary);
			border: none;
		}

		.progress-tooltip,
		.volume-tooltip {
			bottom: 100%;
			transform: translateX(-50%);
			pointer-events: none;
			padding-bottom: 8px;
			z-index: 100;
		}

		.tooltip-card {
			background: var(--float-panel-bg);
			color: var(--content-meta);
			padding: 4px 8px;
			border-radius: 6px;
			font-size: 12px;
			font-weight: 500;
			white-space: nowrap;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			border: 1px solid var(--line-divider);
			position: relative;
		}

		.tooltip-card::after {
			content: "";
			position: absolute;
			bottom: -4px;
			left: 50%;
			transform: translateX(-50%) rotate(45deg);
			width: 8px;
			height: 8px;
			background: var(--float-panel-bg);
			border-right: 1px solid var(--line-divider);
			border-bottom: 1px solid var(--line-divider);
		}

		.playlist-content {
			-ms-overflow-style: none;
			scrollbar-width: none;
			padding-bottom: 0.75rem;
			scroll-padding-bottom: 0.75rem;
			box-sizing: border-box;
		}
		.playlist-content::-webkit-scrollbar {
			width: 0;
			height: 0;
			display: none;
		}
	</style>
{/if}
