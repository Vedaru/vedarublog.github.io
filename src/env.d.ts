/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly UMAMI_API_KEY?: string;
	readonly BCRYPT_SALT_ROUNDS?: string;
	readonly PROD: boolean;
	readonly DEV: boolean;
	readonly SSR: boolean;
	readonly BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare namespace astroHTML.JSX {
	interface ImgHTMLAttributes {
		fetchpriority?: "high" | "low" | "auto";
	}
	interface LinkHTMLAttributes {
		fetchpriority?: "high" | "low" | "auto";
	}
}
