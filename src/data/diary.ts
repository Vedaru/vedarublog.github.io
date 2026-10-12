// 日记工具函数
// 日记条目存放在 src/content/diary/ 目录下，每月一个 .md 文件，## DD 分隔各条目

import { getCollection } from "astro:content";
import { defaultLocale, type Locale } from "../i18n/locales";

export interface DiaryItem {
  id: string;           // slug ("YYYY-MM-DD")
  content: string;      // rendered markdown body
  date: string;         // ISO date string ("YYYY-MM-DDT00:00:00")
  images?: string[];
  location?: string[];
  mood?: string[];
  tags?: string[];
}

// 加载所有日记条目（从月文件中按 ## DD 分割提取每日条目）
//
// 语言按目录判定：英文日记放在 src/content/diary/en/ 下（id 形如 en/2026-01），
// 与文章的约定一致。按语言缓存，避免两种语言互相污染。
const diariesCache = new Map<Locale, Promise<DiaryItem[]>>();

async function loadDiaries(locale: Locale = defaultLocale) {
  let cached = diariesCache.get(locale);
  if (cached) return cached;

  cached = (async () => {
    const entries = await getCollection("diary", ({ id }) =>
      (/\.en$/.test(id.replace(/\.(md|mdx|markdown)$/i, ""))
        ? "en"
        : defaultLocale) === locale,
    );
    const diaryItems: DiaryItem[] = [];

    for (const entry of entries) {
      const month = entry.data.month as string;
      const body = entry.body ?? "";

      // sections: ['', 'DD', '\n\ncontent...', 'DD', '\n\ncontent...']
      const sections = body.split(/^## (\d{1,2})$/m);
      for (let i = 1; i < sections.length; i += 2) {
        const day = sections[i].padStart(2, "0");
        const content = (sections[i + 1] ?? "").trim();
        if (!content) continue;
        diaryItems.push({
          id: `${month}-${day}`,
          content,
          date: `${month}-${day}T00:00:00`,
        });
      }
    }

    return diaryItems;
  })();

  diariesCache.set(locale, cached);
  return cached;
}

// 获取日记统计数据
export const getDiaryStats = async (locale: Locale = defaultLocale) => {
  const diaryData = await loadDiaries(locale);
  const total = diaryData.length;
  const hasImages = diaryData.filter(
    (item) => item.images && item.images.length > 0,
  ).length;
  const hasLocation = diaryData.filter((item) => item.location).length;
  const hasMood = diaryData.filter((item) => item.mood).length;

  return {
    total,
    hasImages,
    hasLocation,
    hasMood,
    imagePercentage: total ? Math.round((hasImages / total) * 100) : 0,
    locationPercentage: total ? Math.round((hasLocation / total) * 100) : 0,
    moodPercentage: total ? Math.round((hasMood / total) * 100) : 0,
  };
};

// 获取日记列表（按时间倒序）
export const getDiaryList = async (
  limit?: number,
  locale: Locale = defaultLocale,
) => {
  const diaryData = await loadDiaries(locale);
  const sortedData = diaryData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  if (limit && limit > 0) {
    return sortedData.slice(0, limit);
  }

  return sortedData;
};

// 获取最新的日记
export const getLatestDiary = async () => {
  const list = await getDiaryList(1);
  return list[0];
};

// 根据ID获取日记
export const getDiaryById = async (id: string) => {
  const diaryData = await loadDiaries();
  return diaryData.find((item) => item.id === id);
};

// 获取包含图片的日记
export const getDiaryWithImages = async () => {
  const diaryData = await loadDiaries();
  return diaryData.filter((item) => item.images && item.images.length > 0);
};

// 根据标签筛选日记
export const getDiaryByTag = async (tag: string) => {
  const diaryData = await loadDiaries();
  return diaryData
    .filter((item) => item.tags?.includes(tag))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
};

// 按年份获取日记（按时间倒序）
export const getDiaryByYear = async (year: number) => {
  const list = await getDiaryList();
  return list.filter((item) => {
    const y = parseInt(item.id.split("-")[0], 10);
    return y === year;
  });
};

// 按年份和月份获取日记（按时间倒序）；month 取值 1-12
export const getDiaryByYearMonth = async (year: number, month: number) => {
  const list = await getDiaryList();
  return list.filter((item) => {
    const parts = item.id.split("-");
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return y === year && m === month;
  });
};

// 获取所有标签
export const getAllTags = async () => {
  const diaryData = await loadDiaries();
  const tags = new Set<string>();
  diaryData.forEach((item) => {
    if (item.tags) {
      item.tags.forEach((tag) => {
        tags.add(tag);
      });
    }
  });
  return Array.from(tags).sort();
};
