import { localePrefix } from "@i18n/locales";
import I18nKey from "@i18n/i18nKey";
import { i18n, normalizeLocale } from "@i18n/translation";
import { LinkPreset, type NavBarLink } from "@/types/config";

/**
 * 导航预设链接（按语言生成）。
 *
 * 以前这里是模块级常量，标签在首次 import 时就用 siteConfig.lang 固定了，
 * 双语站点下无论访问哪种语言都会显示同一套文案。改成函数后由调用方传入
 * 当前页语言。
 *
 * URL 同样要按语言加前缀（英文 /en/about/ 等），否则切到英文后点导航栏
 * 会被拽回中文页面，看起来像“语言根本没切换”。
 */
export function getLinkPresets(locale?: string): {
	[key in LinkPreset]: NavBarLink;
} {
	const prefix = localePrefix(normalizeLocale(locale));
	const to = (path: string) => `${prefix}${path}`;

	return {
		[LinkPreset.Home]: {
			name: i18n(I18nKey.home, locale),
			url: to("/"),
			icon: "material-symbols:home",
		},
		[LinkPreset.About]: {
			name: i18n(I18nKey.about, locale),
			url: to("/about/"),
			icon: "material-symbols:person",
		},
		[LinkPreset.Archive]: {
			name: i18n(I18nKey.archive, locale),
			url: to("/archive/"),
			icon: "material-symbols:archive",
		},
		[LinkPreset.Friends]: {
			name: i18n(I18nKey.friends, locale),
			url: to("/friends/"),
			icon: "material-symbols:group",
		},
		[LinkPreset.Anime]: {
			name: i18n(I18nKey.anime, locale),
			url: to("/anime/"),
			icon: "material-symbols:movie",
		},
		[LinkPreset.Albums]: {
			name: i18n(I18nKey.albums, locale),
			url: to("/albums/"),
			icon: "material-symbols:photo-library",
		},
		[LinkPreset.Projects]: {
			name: i18n(I18nKey.projects, locale),
			url: to("/projects/"),
			icon: "material-symbols:work",
		},
		[LinkPreset.Skills]: {
			name: i18n(I18nKey.skills, locale),
			url: to("/skills/"),
			icon: "material-symbols:psychology",
		},
		[LinkPreset.Timeline]: {
			name: i18n(I18nKey.timeline, locale),
			url: to("/timeline/"),
			icon: "material-symbols:timeline",
		},
	};
}
