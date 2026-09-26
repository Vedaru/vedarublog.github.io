export interface DevicesPanelProps {
	/** 品牌标签，同时作为卡片 data-brand 的取值来源。 */
	brands: string[];
	/** 设备网格元素 id；卡片由服务端渲染，筛选时按此查找。 */
	containerId?: string;
}
