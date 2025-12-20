// 日记工具函数
// 日记条目存放在 src/content/diary/ 目录下，每月一个 .md 文件，## DD 分隔各条目

import { getCollection } from "astro:content";

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
async function loadDiaries() {
  const entries = await getCollection("diary");
  const diaryItems: DiaryItem[] = [];

  for (const entry of entries) {
    const month = entry.data.month as string;
    const body = entry.body ?? "";

    const sections = body.split(/^## (\d{1,2})$/m);
    // sections: ['', 'DD', '\n\ncontent...', 'DD', '\n\ncontent...']
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
}

// 获取日记统计数据
export const getDiaryStats = async () => {
  const diaryData = await loadDiaries();
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
export const getDiaryList = async (limit?: number) => {
  const diaryData = await loadDiaries();
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
