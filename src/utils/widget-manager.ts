import { sidebarLayoutConfig } from "../config";
import type {
	SidebarLayoutConfig,
	WidgetComponentConfig,
} from "../types/config";

/**
 * 组件管理器类
 * 负责管理侧边栏组件的动态加载、排序和渲染
 */
export class WidgetManager {
	private config: SidebarLayoutConfig;

	constructor(config: SidebarLayoutConfig = sidebarLayoutConfig) {
		this.config = config;
	}

	/**
	 * 获取配置
	 */
	getConfig(): SidebarLayoutConfig {
		return this.config;
	}

	/**
	 * 根据位置获取组件列表
	 * @param position 组件位置：'top' | 'sticky'
	 * @param sidebar 侧边栏位置（可选）：'left' | 'right' | 'drawer'
	 * @param deviceType 设备类型（可选）：'mobile' | 'tablet' | 'desktop'
	 */
	getComponentsByPosition(
		position: "top" | "sticky",
		sidebar: "left" | "right" | "drawer" = "left",
		deviceType: "mobile" | "tablet" | "desktop" = "desktop",
	): WidgetComponentConfig[] {
		let activeSidebar = sidebar;

		// 手机端逻辑：完全由 drawer 决定，不合并左右侧栏
		if (deviceType === "mobile") {
			activeSidebar = "drawer";
		}
		// 平板端逻辑：在左侧有配置组件的情况下仅保留左侧组件，左侧没有配置组件时则将右侧的组件移到左侧
		else if (deviceType === "tablet") {
			if (sidebar === "right") {
				return [];
			}
			if (sidebar === "left") {
				activeSidebar =
					this.config.components.left.length > 0 ? "left" : "right";
			}
		}

		const componentTypes = this.config.components[activeSidebar] || [];

		return componentTypes
			.map((type) => {
				const prop = this.config.properties.find(
					(p) => p.type === type,
				);
				if (prop && prop.position === position) {
					return prop;
				}
				// 如果没有在 properties 中找到配置，且位置匹配默认的 top，则返回一个基础配置
				if (!prop && position === "top") {
					return { type, position: "top" } as WidgetComponentConfig;
				}
				return null;
			})
			.filter(Boolean) as WidgetComponentConfig[];
	}

	/**
	 * 获取组件的动画延迟时间
	 * @param component 组件配置
	 * @param index 组件在列表中的索引
	 */
	getAnimationDelay(component: WidgetComponentConfig, index: number): number {
		if (component.animationDelay !== undefined) {
			return component.animationDelay;
		}

		if (this.config.defaultAnimation.enable) {
			return (
				this.config.defaultAnimation.baseDelay +
				index * this.config.defaultAnimation.increment
			);
		}

		return 0;
	}

	/**
	 * 获取组件的CSS类名
	 * @param component 组件配置
	 * @param index 组件在列表中的索引
	 */
	getComponentClass(
		component: WidgetComponentConfig,
		_index: number,
	): string {
		const classes: string[] = [];

		// 添加基础类名
		if (component.class) {
			classes.push(component.class);
		}

		// 添加响应式隐藏类名
		if (component.responsive?.hidden) {
			component.responsive.hidden.forEach((device) => {
				switch (device) {
					case "mobile":
						classes.push("hidden", "md:block");
						break;
					case "tablet":
						classes.push("md:hidden", "lg:block");
						break;
					case "desktop":
						classes.push("lg:hidden");
						break;
				}
			});
		}

		return classes.join(" ");
	}

	/**
	 * 获取组件的内联样式
	 * @param component 组件配置
	 * @param index 组件在列表中的索引
	 */
	getComponentStyle(component: WidgetComponentConfig, index: number): string {
		const styles: string[] = [];

		// 添加自定义样式
		if (component.style) {
			styles.push(component.style);
		}

		// 添加动画延迟样式
		const animationDelay = this.getAnimationDelay(component, index);
		if (animationDelay > 0) {
			styles.push(`animation-delay: ${animationDelay}ms`);
		}

		return styles.join("; ");
	}

	/**
	 * 检查组件是否应该折叠
	 * @param component 组件配置
	 * @param itemCount 组件内容项数量
	 */
	isCollapsed(component: WidgetComponentConfig, itemCount: number): boolean {
		if (!component.responsive?.collapseThreshold) {
			return false;
		}
		return itemCount >= component.responsive.collapseThreshold;
	}
}

/**
 * 默认组件管理器实例
 */
export const widgetManager = new WidgetManager();
