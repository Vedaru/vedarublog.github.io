// 番剧图片预加载管理器
// 使用 Intersection Observer 预加载即将进入视口的图片

class AnimeImagePreloader {
	private observer: IntersectionObserver;
	private preloadedImages: Set<string> = new Set();
	private preloadDistance = 200; // 预加载距离（像素）

	constructor() {
		this.observer = new IntersectionObserver(
			this.handleIntersection.bind(this),
			{
				rootMargin: `${this.preloadDistance}px 0px`,
				threshold: 0.1
			}
		);
	}

	// 观察番剧卡片
	observe(card: Element) {
		this.observer.observe(card);
	}

	// 停止观察
	unobserve(card: Element) {
		this.observer.unobserve(card);
	}

	// 处理交叉观察事件
	private handleIntersection(entries: IntersectionObserverEntry[]) {
		entries.forEach(entry => {
			const card = entry.target as HTMLElement;

			if (entry.isIntersecting) {
				// 图片进入视口，标记为预加载
				this.preloadImage(card);
			}
		});
	}

	// 预加载图片
	private preloadImage(card: HTMLElement) {
		const img = card.querySelector('img');
		if (!img) return;

		const src = img.src;
		if (this.preloadedImages.has(src)) return;

		// 创建预加载图片
		const preloadImg = new Image();
		preloadImg.src = src;

		// 标记为已预加载
		this.preloadedImages.add(src);

		// 添加预加载标记
		card.setAttribute('data-preload', 'true');
	}

	// 销毁观察器
	destroy() {
		this.observer.disconnect();
		this.preloadedImages.clear();
	}
}

// 全局预加载管理器实例
let globalPreloader: AnimeImagePreloader | null = null;

// 初始化预加载器
export function initAnimeImagePreloader() {
	if (globalPreloader) return globalPreloader;

	globalPreloader = new AnimeImagePreloader();
	return globalPreloader;
}

// 获取预加载器实例
export function getAnimeImagePreloader() {
	return globalPreloader;
}

// 销毁预加载器
export function destroyAnimeImagePreloader() {
	if (globalPreloader) {
		globalPreloader.destroy();
		globalPreloader = null;
	}
}