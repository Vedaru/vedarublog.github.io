<script lang="ts">
import "@/lib/iconify-offline";
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { musicPlayerConfig } from "@/config";
import Key from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import { createAudioPlayer, type Song } from "@/lib/audio/useAudioPlayer";
import Controls from "./music/Controls.svelte";
import Playlist from "./music/Playlist.svelte";

export let initialSong: Song | undefined = undefined;

const player = createAudioPlayer({ initialSong });
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
	ensurePlaylistLoaded,
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
});

async function handlePlayerInteraction(action: () => void) {
	if (musicPlayerConfig.enable) {
		await ensurePlaylistLoaded();
	}
	action();
}

onDestroy(() => {
	if (typeof document !== "undefined") {
		interactionEvents.forEach((event) => {
			document.removeEventListener(event, handleUserInteraction, {
				capture: true,
			});
		});
	}
});

function handleRoleButtonKeydown(
	event: KeyboardEvent,
	action: () => void,
) {
	if (event.key === "Enter" || event.key === " ") {
		event.preventDefault();
		action();
	}
}
</script>

<audio
	use:bindAudioElement
	volume={$volume}
	muted={$isMuted}
	on:play={() => isPlaying.set(true)}
	on:pause={() => isPlaying.set(false)}
	on:timeupdate={handleTimeUpdate}
	on:ended={handleAudioEnded}
	on:error={handleLoadError}
	on:loadeddata={handleLoadSuccess}
	preload="none"
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
		<div class="fixed bottom-20 right-4 z-[60] max-w-sm" role="alert">
			<div
				class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up"
			>
				<Icon icon="material-symbols:error" class="text-xl flex-shrink-0" />
				<span class="text-sm flex-1">{$errorMessage}</span>
				<button
					on:click={hideError}
					class="text-white/80 hover:text-white transition-colors"
					aria-label={i18n(Key.announcementClose)}
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
			on:click={() => void handlePlayerInteraction(toggleHidden)}
			on:keydown={(e) => handleRoleButtonKeydown(e, () => void handlePlayerInteraction(toggleHidden))}
			role="button"
			tabindex="0"
			aria-label={i18n(Key.musicPlayerShow)}
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
					on:click={() => void handlePlayerInteraction(togglePlay)}
					on:keydown={(e) => handleRoleButtonKeydown(e, () => void handlePlayerInteraction(togglePlay))}
					role="button"
					tabindex="0"
					aria-label={$isPlaying ? i18n(Key.musicPlayerPause) : i18n(Key.musicPlayerPlay)}
				>
					<img
						src={getAssetPath($currentSong.cover)}
						alt=""
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
					on:click={() => void handlePlayerInteraction(toggleExpanded)}
					on:keydown={(e) => handleRoleButtonKeydown(e, () => void handlePlayerInteraction(toggleExpanded))}
					role="button"
					tabindex="0"
					aria-label={i18n(Key.musicPlayerExpand)}
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
						aria-label={i18n(Key.musicPlayerHide)}
					>
						<Icon icon="material-symbols:visibility-off" class="text-lg" />
					</button>
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						on:click|stopPropagation={toggleExpanded}
						aria-label={i18n(Key.musicPlayerExpand)}
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
						alt=""
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
						aria-label={i18n(Key.musicPlayerHide)}
					>
						<Icon icon="material-symbols:visibility-off" class="text-lg" />
					</button>
					<button
						class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
						class:text-[var(--primary)]={$showPlaylist}
						on:click={togglePlaylist}
						aria-label={i18n(Key.musicPlayerPlaylist)}
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
{/if}
