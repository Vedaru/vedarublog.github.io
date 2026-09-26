import type { AnimeEntry } from "../../../data/anime-list";

/** 状态徽章文案/配色/图标；服务端从 i18n 解析后作为 props 传入。 */
export interface AnimeStatusMeta {
	text: string;
	class: string;
	icon: string;
}

export interface AnimeFilterTab {
	value: string;
	label: string;
}

export interface AnimeCardLabels {
	year: string;
	studio: string;
}

export interface AnimePanelProps {
	/** 全部番剧；首屏只渲染前 initialCount 条，其余滚到哨兵时按批揭示。 */
	items: AnimeEntry[];
	/** 首屏渲染条数（不放进数据模块 import，避免把 node:fs 拖进客户端产物）。 */
	initialCount: number;
	tabs: AnimeFilterTab[];
	statusMeta: Record<string, AnimeStatusMeta>;
	labels: AnimeCardLabels;
	/** 网格容器 id。 */
	listId?: string;
}
