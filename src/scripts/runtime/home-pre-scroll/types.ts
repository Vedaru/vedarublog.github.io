export interface HomePreScrollVisit {
	to?: { url?: string };
	scroll?: { reset?: boolean };
}

export type PreScrollProgressFn = (progress: number, scrollY: number) => void;

export interface NavbarWrapperStyleSnapshot {
	opacity: string;
	transform: string;
}
