export interface Visit {
	to?: { url?: string };
	scroll?: { reset?: boolean };
}

export type PreScrollProgressFn = (progress: number, scrollY: number) => void;

export interface NavbarWrapperStyleSnapshot {
	opacity: string;
	transform: string;
}

export interface SwupHooks {
	on: (
		hook: string,
		fn: (visit: Visit) => unknown,
		options?: { priority?: number; before?: boolean },
	) => void;
}

export interface SwupLike {
	hooks: SwupHooks;
}
