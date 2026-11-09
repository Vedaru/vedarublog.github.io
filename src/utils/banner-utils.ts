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

/** 将 banner src 转为 URL 数组 */
export function toBannerSrcList(src: string | string[] | undefined): string[] {
	return Array.isArray(src)
		? src
		: typeof src === "string" && src
			? [src]
			: [];
}

/** 获取 banner 图片 */
export function getBannerImages(): BannerImages {
	const bannerSrc = siteConfig.banner.src;
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
		w2560: `${stem}-2560.webp`,
		full: src,
	};
}
