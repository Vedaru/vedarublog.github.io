export interface SkillFilterTab {
	value: string;
	label: string;
	path: string;
	count: number;
}

export interface SkillsPanelProps {
	tabs: SkillFilterTab[];
	/** 技能网格元素 id；卡片由服务端渲染，筛选时按此查找。 */
	gridId?: string;
}
