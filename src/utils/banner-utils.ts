import { siteConfig } from "@/config";

export type BannerSrcObject = {
	desktop?: string | string[];
	mobile?: string | string[];
};

export type BannerImages = {
	desktop: string | string[];
	mobile: string | string[];
};

const isBannerSrcObject = (
	src: string | string[] | BannerSrcObject,
): src is BannerSrcObject => {
	return (
		typeof src === "object" &&
		src !== null &&
		!Array.isArray(src) &&
		("desktop" in src || "mobile" in src)
	);
};

/** 从 banner src 配置中取第一张 URL */
export function getFirstBannerUrl(
	images: string | string[] | undefined,
): string | null {
	if (Array.isArray(images)) return images[0] ?? null;
	if (typeof images === "string") return images;
	return null;
}

/** 将 banner src 转为 URL 数组 */
export function toBannerSrcList(
	src: string | string[] | undefined,
): string[] {
	return Array.isArray(src)
		? src
		: typeof src === "string" && src
			? [src]
			: [];
}

/** 获取默认 banner 图片 URL（用于 OG/meta） */
export function getDefaultBannerUrl(): string {
	const src = siteConfig.banner.src;
	if (typeof src === "string") {
		return src;
	}
	if (Array.isArray(src)) {
		return src[0] || "";
	}
	if (isBannerSrcObject(src)) {
		const desktopSrc = src.desktop;
		const mobileSrc = src.mobile;
		if (typeof desktopSrc === "string") {
			return desktopSrc;
		}
		if (Array.isArray(desktopSrc) && desktopSrc.length > 0) {
			return desktopSrc[0];
		}
		if (typeof mobileSrc === "string") {
			return mobileSrc;
		}
		if (Array.isArray(mobileSrc) && mobileSrc.length > 0) {
			return mobileSrc[0];
		}
	}
	return "";
}

/** 获取 banner 图片（含 API 拉取） */
export async function getBannerImages(): Promise<BannerImages> {
	let bannerSrc = siteConfig.banner.src;

	if (siteConfig.banner.imageApi?.enable && siteConfig.banner.imageApi?.url) {
		try {
			const response = await fetch(siteConfig.banner.imageApi.url);
			const text = await response.text();
			const apiImages = text.split("\n").filter((line) => line.trim());

			if (apiImages.length > 0) {
				bannerSrc = apiImages;
			}
		} catch (error) {
			console.warn("Failed to fetch images from API:", error);
		}
	}

	if (isBannerSrcObject(bannerSrc)) {
		return {
			desktop: bannerSrc.desktop || bannerSrc.mobile || "",
			mobile: bannerSrc.mobile || bannerSrc.desktop || "",
		};
	}

	return {
		desktop: bannerSrc,
		mobile: bannerSrc,
	};
}

/** 生成响应式 banner 图片变体路径 */
export function getBannerResponsive(src: string | undefined | null) {
	if (!src) return null;
	const stem = src.replace(/\.webp$/i, "");
	return {
		w768: `${stem}-768.webp`,
		w1280: `${stem}-1280.webp`,
		full: src,
	};
}
