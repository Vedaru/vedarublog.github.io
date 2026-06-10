export interface IconifyLoaderConfig {
	preloadIcons: string[];
	timeout: number;
	retryCount: number;
}

class IconifyLoader {
	isLoaded = false;
	isLoading = false;
	loadPromise: Promise<void> | null = null;
	observers = new Set<() => void>();
	preloadQueue = new Set<string>();
	config: IconifyLoaderConfig;

	constructor(config: IconifyLoaderConfig) {
		this.config = config;
	}

	async load(options: { timeout?: number; retryCount?: number } = {}) {
		const loadTimeout = options.timeout ?? this.config.timeout;
		const maxRetries = options.retryCount ?? this.config.retryCount;

		if (this.isLoaded) return;
		if (this.isLoading && this.loadPromise) return this.loadPromise;

		this.isLoading = true;
		this.loadPromise = this.loadWithRetry(loadTimeout, maxRetries);

		try {
			await this.loadPromise;
			this.isLoaded = true;
			this.notifyObservers();
			await this.processPreloadQueue();
		} catch (error) {
			console.error("Failed to load Iconify:", error);
			throw error;
		} finally {
			this.isLoading = false;
		}
	}

	async loadWithRetry(timeout: number, retryCount: number) {
		for (let attempt = 1; attempt <= retryCount; attempt++) {
			try {
				await this.loadScript(timeout);
				return;
			} catch (error) {
				console.warn(`Iconify load attempt ${attempt} failed:`, error);
				if (attempt === retryCount) {
					throw new Error(
						`Failed to load Iconify after ${retryCount} attempts`,
					);
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}
	}

	loadScript(timeout: number): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.isIconifyReady()) {
				resolve();
				return;
			}

			const existingScript = document.querySelector(
				'script[src*="iconify-icon"]',
			);
			if (existingScript) {
				this.waitForIconifyReady().then(resolve).catch(reject);
				return;
			}

			const script = document.createElement("script");
			script.src = "/assets/js/iconify-icon.min.js";
			script.async = true;
			script.crossOrigin = "anonymous";

			const timeoutId = setTimeout(() => {
				script.remove();
				reject(new Error("Script load timeout"));
			}, timeout);

			script.onload = () => {
				clearTimeout(timeoutId);
				this.waitForIconifyReady().then(resolve).catch(reject);
			};

			script.onerror = () => {
				clearTimeout(timeoutId);
				script.remove();
				reject(new Error("Script load error"));
			};

			document.head.appendChild(script);
		});
	}

	waitForIconifyReady(maxWait = 5000): Promise<void> {
		return new Promise((resolve, reject) => {
			const startTime = Date.now();

			const checkReady = (): void => {
				if (this.isIconifyReady()) {
					resolve();
					return;
				}
				if (Date.now() - startTime > maxWait) {
					reject(new Error("Iconify initialization timeout"));
					return;
				}
				setTimeout(checkReady, 50);
			};

			checkReady();
		});
	}

	isIconifyReady(): boolean {
		return (
			typeof window !== "undefined" &&
			"customElements" in window &&
			customElements.get("iconify-icon") !== undefined
		);
	}

	onLoad(callback: () => void): void {
		if (this.isLoaded) callback();
		else this.observers.add(callback);
	}

	notifyObservers(): void {
		this.observers.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				console.error("Error in icon load observer:", error);
			}
		});
		this.observers.clear();
	}

	addToPreloadQueue(icons: string | string[]): void {
		if (Array.isArray(icons)) icons.forEach((icon) => this.preloadQueue.add(icon));
		else this.preloadQueue.add(icons);

		if (this.isLoaded) void this.processPreloadQueue();
	}

	async processPreloadQueue(): Promise<void> {
		if (this.preloadQueue.size === 0) return;
		const iconsToLoad = Array.from(this.preloadQueue);
		this.preloadQueue.clear();
		await this.preloadIcons(iconsToLoad);
	}

	async preloadIcons(icons: string[]): Promise<void> {
		if (!this.isLoaded || icons.length === 0) return;

		return new Promise((resolve) => {
			let loadedCount = 0;
			const totalIcons = icons.length;
			const tempElements: HTMLElement[] = [];

			const cleanup = (): void => {
				tempElements.forEach((el) => el.parentNode?.removeChild(el));
			};

			const checkComplete = (): void => {
				loadedCount++;
				if (loadedCount >= totalIcons) {
					cleanup();
					resolve();
				}
			};

			icons.forEach((icon) => {
				const tempIcon = document.createElement("iconify-icon");
				tempIcon.setAttribute("icon", icon);
				tempIcon.style.cssText =
					"position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
				tempIcon.addEventListener("load", checkComplete);
				tempIcon.addEventListener("error", checkComplete);
				tempElements.push(tempIcon);
				document.body.appendChild(tempIcon);
			});

			setTimeout(() => {
				cleanup();
				resolve();
			}, 3000);
		});
	}
}

export function initIconifyLoader(config: IconifyLoaderConfig): void {
	if (window.__iconifyLoaderInitialized) return;
	window.__iconifyLoaderInitialized = true;

	const loader = new IconifyLoader(config);
	window.__iconifyLoader = loader;

	window.loadIconify = () => loader.load();
	window.preloadIcons = (icons: string | string[]) =>
		loader.addToPreloadQueue(icons);
	window.onIconifyReady = (callback: () => void) => loader.onLoad(callback);

	let scheduled = false;
	const scheduleLoad = (): void => {
		if (scheduled) return;
		scheduled = true;
		void loader.load().catch(console.error);
		if (config.preloadIcons?.length) {
			loader.addToPreloadQueue(config.preloadIcons);
		}
	};

	if ("requestIdleCallback" in window) {
		requestIdleCallback(scheduleLoad, { timeout: 4000 });
	} else {
		setTimeout(scheduleLoad, 2000);
	}

	(["scroll", "click", "touchstart"] as const).forEach((evt) => {
		window.addEventListener(evt, scheduleLoad, { once: true, passive: true });
	});

	document.addEventListener("visibilitychange", () => {
		if (!document.hidden && !loader.isLoaded) {
			void loader.load().catch(console.error);
		}
	});
}
