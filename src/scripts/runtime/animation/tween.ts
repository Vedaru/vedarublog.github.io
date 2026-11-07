/**
 * Cancellable requestAnimationFrame tween.
 *
 * Only one tween runs at a time: starting a new tween cancels the previous one
 * with reason "superseded", which lets callers hand off to the new animation
 * without tearing down visual state. Explicit cancellation rejects with
 * AnimationCancelledError so stale `.then` chains cannot apply late frames.
 */

class AnimationCancelledError extends Error {
	readonly progress: number;
	readonly reason: string;

	constructor(progress: number, reason = "cancelled") {
		super("Animation cancelled");
		this.name = "AnimationCancelledError";
		this.progress = progress;
		this.reason = reason;
	}
}

export function isAnimationCancelledError(
	err: unknown,
): err is AnimationCancelledError {
	return err instanceof AnimationCancelledError;
}

export interface CancelTweenResult {
	progress: number;
	reason: string;
}

export interface RunCancellableTweenOptions {
	duration: number;
	ease?: (t: number) => number;
	startProgress?: number;
	/** Scale the duration down when resuming from a nonzero startProgress. */
	scaleDurationByRemaining?: boolean;
	onFrame: (t: number, progress: number, now: number) => void;
	onComplete?: () => void;
	/** Fired synchronously when the tween is superseded or explicitly cancelled. */
	onCancel?: (result: CancelTweenResult) => void;
}

export interface CancellableTweenHandle {
	promise: Promise<void>;
	cancel: (reason?: string) => CancelTweenResult;
}

interface ActiveTween {
	generation: number;
	reject: (err: AnimationCancelledError) => void;
	onCancel?: (result: CancelTweenResult) => void;
	lastProgress: number;
}

let activeGeneration = 0;
let activeRafId = 0;
let activeTween: ActiveTween | null = null;

function cancelActiveTweenInternal(reason = "superseded"): CancelTweenResult {
	activeGeneration += 1;

	if (activeRafId) {
		cancelAnimationFrame(activeRafId);
		activeRafId = 0;
	}

	const tween = activeTween;
	activeTween = null;

	const result: CancelTweenResult = {
		progress: tween ? tween.lastProgress : 0,
		reason,
	};

	if (tween) {
		try {
			tween.onCancel?.(result);
		} catch {
			// A failing cleanup hook must not block the cancellation itself.
		}
		tween.reject(new AnimationCancelledError(result.progress, reason));
	}

	return result;
}

export function cancelActiveTween(reason = "cancelled"): CancelTweenResult {
	return cancelActiveTweenInternal(reason);
}

export function runCancellableTween(
	options: RunCancellableTweenOptions,
): CancellableTweenHandle {
	cancelActiveTweenInternal("superseded");

	const generation = activeGeneration;
	const startProgress = Math.min(1, Math.max(0, options.startProgress ?? 0));
	const remainingRatio = 1 - startProgress;
	const baseDuration = Math.max(0, options.duration);
	const duration =
		options.scaleDurationByRemaining === false || remainingRatio <= 0
			? baseDuration
			: baseDuration * remainingRatio;
	const ease = options.ease ?? ((t: number) => t);

	let promise!: Promise<void>;
	const cancel = (reason = "cancelled"): CancelTweenResult => {
		if (generation !== activeGeneration) {
			return {
				progress: activeTween ? activeTween.lastProgress : 1,
				reason: "already-finished",
			};
		}
		return cancelActiveTweenInternal(reason);
	};

	promise = new Promise<void>((resolve, reject) => {
		if (duration <= 0 || startProgress >= 1) {
			options.onFrame(ease(1), 1, performance.now());
			options.onComplete?.();
			resolve();
			return;
		}

		const tween: ActiveTween = {
			generation,
			reject,
			onCancel: options.onCancel,
			lastProgress: startProgress,
		};
		activeTween = tween;
		const startTime = performance.now();

		function step(now: number): void {
			if (generation !== activeGeneration) {
				return;
			}

			const elapsedProgress = Math.min(1, (now - startTime) / duration);
			const progress = startProgress + remainingRatio * elapsedProgress;
			tween.lastProgress = progress;

			options.onFrame(ease(progress), progress, now);

			if (progress < 1) {
				activeRafId = requestAnimationFrame(step);
				return;
			}

			activeRafId = 0;
			activeTween = null;
			options.onComplete?.();
			resolve();
		}

		activeRafId = requestAnimationFrame(step);
	});

	return { promise, cancel };
}
