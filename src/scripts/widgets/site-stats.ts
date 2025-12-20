export interface SiteStatsConfig {
	siteStartDate: string;
	lastPostDate?: string | null;
}

export function initSiteStats(config: SiteStatsConfig): void {
	function updateDynamicStats(): void {
		const today = new Date();
		const startDate = new Date(config.siteStartDate);
		const diffTime = Math.abs(today.getTime() - startDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		const runningDaysElement = document.querySelector(
			'[data-stat-id="running-days"]',
		);
		if (runningDaysElement) {
			runningDaysElement.textContent = diffDays.toString();
		}

		if (config.lastPostDate) {
			const lastPost = new Date(config.lastPostDate);
			const timeSinceLastPost = Math.abs(
				today.getTime() - lastPost.getTime(),
			);
			const daysSinceLastUpdate = Math.floor(
				timeSinceLastPost / (1000 * 60 * 60 * 24),
			);

			const lastUpdateElement = document.querySelector(
				'[data-stat-id="last-update"]',
			);
			if (lastUpdateElement) {
				lastUpdateElement.textContent = daysSinceLastUpdate.toString();
			}
		}
	}

	updateDynamicStats();
	setInterval(updateDynamicStats, 60 * 60 * 1000);
}
