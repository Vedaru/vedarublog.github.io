/**
 * Bangumi 标签的英文对照（词汇表，不是逐条内容翻译）。
 *
 * Bangumi 的标签由用户产出，只有中文；英文站点没有可拉取的英文标签源。
 * 好在标签是一个有界的词汇表（题材、改编来源、播出形式），不像简介那样
 * 逐条不同，所以这里像语言表一样维护一份对照即可：
 *
 * - 中文站点：原样显示 Bangumi 的标签
 * - 英文站点：命中对照表就显示英文；本身是拉丁文（MADHOUSE、TV）原样显示；
 *   两者都不是（作品名、作者名之类被用户当成标签的词）返回空串，由调用方过滤，
 *   而不是在英文页面上丢一个中文词。
 */

const TAG_LABELS: Record<string, string> = {
	// 改编来源 / 形式
	漫画改: "Manga adaptation",
	轻小说改: "Light novel adaptation",
	小说改: "Novel adaptation",
	游戏改: "Game adaptation",
	原创: "Original",
	剧场版: "Movie",
	TV: "TV",
	OVA: "OVA",
	国产: "Chinese production",
	// 题材
	奇幻: "Fantasy",
	异世界: "Isekai",
	冒险: "Adventure",
	校园: "School",
	恋爱: "Romance",
	青春: "Youth",
	战斗: "Action",
	百合: "Yuri",
	日常: "Slice of life",
	推理: "Mystery",
	智斗: "Battle of wits",
	科幻: "Sci-fi",
	治愈: "Healing",
	公路片: "Road movie",
	悬疑: "Suspense",
	恐怖: "Horror",
	音乐: "Music",
	运动: "Sports",
	搞笑: "Comedy",
	剧情: "Drama",
	美食: "Food",
	机战: "Mecha",
	战争: "War",
	// 制作公司（用户常用昵称）
	骨头社: "BONES",
	京阿尼: "Kyoto Animation",
};

const MONTHS = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 2026年7月 -> Jul 2026（英文）/ 原样（中文） */
function formatSeasonTag(tag: string, locale: string): string | null {
	const match = tag.match(/^(\d{4})年(\d{1,2})月$/);
	if (!match) return null;
	if (locale !== "en") return tag;
	const month = Number.parseInt(match[2], 10);
	return month >= 1 && month <= 12
		? `${MONTHS[month - 1]} ${match[1]}`
		: match[1];
}

/**
 * 按语言转换一个 Bangumi 标签。
 * 英文下无法转换的返回 ""（拉丁文标签除外，它们直接可用）。
 */
export function localizeBangumiTag(tag: string, locale: string): string {
	const trimmed = (tag || "").trim();
	if (!trimmed) return "";
	if (locale !== "en") return trimmed;

	const season = formatSeasonTag(trimmed, locale);
	if (season) return season;

	const mapped = TAG_LABELS[trimmed];
	if (mapped) return mapped;

	// 已经是英文/拉丁文（MADHOUSE、MAPPA、TV）就能直接用
	const hasLatin = /[A-Za-z]/.test(trimmed);
	const hasCjk = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/.test(trimmed);
	return hasLatin && !hasCjk ? trimmed : "";
}
