/** 可取消 rAF tween：新动画自动打断旧帧，取消时 reject 避免 stale .then */

export class AnimationCancelledError extends Error {
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
	scaleDurationByRemaining?: boolean;
	onFrame: (t: number, progress: number, now: number) => void;
	onComplete?: () => void;
}

export interface CancellableTweenHandle {
	promise: Promise<void>;
	cancel: (reason?: string) => CancelTweenResult;
}

let activeGeneration = 0;
let activeRafId = 0;
let lastProgress = 0;
let activeReject: ((err: AnimationCancelledError) => void) | null = null;

function cancelActiveTweenInternal(reason = "superseded"): CancelTweenResult {
	activeGeneration += 1;

	if (activeRafId) {
		cancelAnimationFrame(activeRafId);
		activeRafId = 0;
	}

	const result: CancelTweenResult = {
		progress: lastProgress,
		reason,
	};

	if (activeReject) {
		const reject = activeReject;
		activeReject = null;
		reject(new AnimationCancelledError(result.progress, reason));
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
			return { progress: lastProgress, reason: "already-finished" };
		}
		return cancelActiveTweenInternal(reason);
	};

	promise = new Promise<void>(function (resolve, reject) {
		if (duration <= 0 || startProgress >= 1) {
			const progress = 1;
			lastProgress = progress;
			options.onFrame(ease(progress), progress, performance.now());
			options.onComplete?.();
			resolve();
			return;
		}

		activeReject = reject;
		const startTime = performance.now();

		function step(now: number) {
			if (generation !== activeGeneration) {
				return;
			}

			const elapsedProgress = Math.min(1, (now - startTime) / duration);
			const progress = startProgress + remainingRatio * elapsedProgress;
			const t = ease(progress);
			lastProgress = progress;

			options.onFrame(t, progress, now);

			if (progress < 1) {
				activeRafId = requestAnimationFrame(step);
				return;
			}

			activeRafId = 0;
			activeReject = null;
			options.onComplete?.();
			resolve();
		}

		activeRafId = requestAnimationFrame(step);
	});

	return { promise, cancel };
}
