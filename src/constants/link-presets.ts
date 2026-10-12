import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

/**
 * 导航预设链接（按语言生成）。
 *
 * 以前这里是模块级常量，标签在首次 import 时就用 siteConfig.lang 固定了，
 * 双语站点下无论访问哪种语言都会显示同一套文案。改成函数后由调用方传入
 * 当前页语言。
 *
 * 注意：URL 目前仍是根路径（"/about/" 等），英文页面的路径前缀在
 * /en/ 路由树落地时统一处理，避免现在就把链接指向尚不存在的页面。
 */
export function getLinkPresets(locale?: string): {
	[key in LinkPreset]: NavBarLink;
} {
	return {
		[LinkPreset.Home]: {
			name: i18n(I18nKey.home, locale),
			url: "/",
			icon: "material-symbols:home",
		},
		[LinkPreset.About]: {
			name: i18n(I18nKey.about, locale),
			url: "/about/",
			icon: "material-symbols:person",
		},
		[LinkPreset.Archive]: {
			name: i18n(I18nKey.archive, locale),
			url: "/archive/",
			icon: "material-symbols:archive",
		},
		[LinkPreset.Friends]: {
			name: i18n(I18nKey.friends, locale),
			url: "/friends/",
			icon: "material-symbols:group",
		},
		[LinkPreset.Anime]: {
			name: i18n(I18nKey.anime, locale),
			url: "/anime/",
			icon: "material-symbols:movie",
		},
		[LinkPreset.Diary]: {
			name: i18n(I18nKey.diary, locale),
			url: "/diary/",
			icon: "material-symbols:book",
		},
		[LinkPreset.Albums]: {
			name: i18n(I18nKey.albums, locale),
			url: "/albums/",
			icon: "material-symbols:photo-library",
		},
		[LinkPreset.Projects]: {
			name: i18n(I18nKey.projects, locale),
			url: "/projects/",
			icon: "material-symbols:work",
		},
		[LinkPreset.Skills]: {
			name: i18n(I18nKey.skills, locale),
			url: "/skills/",
			icon: "material-symbols:psychology",
		},
		[LinkPreset.Timeline]: {
			name: i18n(I18nKey.timeline, locale),
			url: "/timeline/",
			icon: "material-symbols:timeline",
		},
	};
}
