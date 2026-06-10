export interface SidebarManagerConfig {
	breakpoints: { mobile: number; tablet: number };
	mobileShowSidebar: boolean;
	tabletShowSidebar: boolean;
	desktopShowSidebar: boolean;
	hasMobileComponents: boolean;
	hasTabletComponents: boolean;
}

export function initSidebarManager(config: SidebarManagerConfig): void {
	class SidebarManager {
		pendingUpdate = 0;

		constructor() {
			this.init();
		}

		registerSwupIdleUpdate(): void {
			const schedule = (): void => {
				if (window.__onSwupPageIdlePhase) {
					window.__onSwupPageIdlePhase(() => {
						requestAnimationFrame(() => {
							requestAnimationFrame(() => this.scheduleUpdate());
						});
					});
				} else {
					document.addEventListener("swup:transition-ready", () => {
						this.scheduleUpdate();
					});
				}
			};
			if (window.__onSwupPageIdlePhase) {
				schedule();
			} else {
				document.addEventListener("DOMContentLoaded", schedule, {
					once: true,
				});
			}
		}

		init(): void {
			this.scheduleUpdate();
			window.addEventListener("resize", () => this.scheduleUpdate());
			this.registerSwupIdleUpdate();
		}

		scheduleUpdate(): void {
			if (this.pendingUpdate) cancelAnimationFrame(this.pendingUpdate);
			this.pendingUpdate = requestAnimationFrame(() => {
				this.pendingUpdate = 0;
				this.updateResponsiveDisplay();
			});
		}

		updateResponsiveDisplay(): void {
			const width = window.innerWidth;
			const { breakpoints } = config;

			let deviceType: "mobile" | "tablet" | "desktop";
			let hasComponents = false;
			let showConfig = false;

			if (width < breakpoints.mobile) {
				deviceType = "mobile";
				hasComponents = config.hasMobileComponents;
				showConfig = config.mobileShowSidebar;
			} else if (width < breakpoints.tablet) {
				deviceType = "tablet";
				hasComponents = config.hasTabletComponents;
				showConfig = config.tabletShowSidebar;
			} else {
				deviceType = "desktop";
				hasComponents = config.hasTabletComponents;
				showConfig = config.desktopShowSidebar;
			}

			const shouldShow = showConfig && hasComponents;
			const sidebar = document.getElementById("sidebar");

			if (sidebar) {
				sidebar.style.setProperty(
					`--sidebar-${deviceType}-display`,
					shouldShow ? "block" : "none",
				);
			}
		}
	}

	new SidebarManager();
}
