export interface LastModifiedLabels {
	prefix: string;
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
}

export function formatLastModifiedElapsed(
	startDateIso: string,
	labels: LastModifiedLabels,
	now: Date = new Date(),
): string {
	const startDate = new Date(startDateIso);
	if (Number.isNaN(startDate.getTime())) {
		return labels.prefix;
	}

	const diff = now.getTime() - startDate.getTime();
	const seconds = Math.floor(diff / 1000);
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const years = Math.floor(days / 365);
	const months = Math.floor((days % 365) / 30);
	const remainingDays = days % 30;

	let runtimeString = `${labels.prefix} `;
	if (years > 0) {
		runtimeString += `${years} ${labels.year} `;
	}
	if (months > 0) {
		runtimeString += `${months} ${labels.month} `;
	}
	if (remainingDays > 0) {
		runtimeString += `${remainingDays} ${labels.day} `;
	}
	runtimeString += `${hours} ${labels.hour} `;
	runtimeString += `${minutes < 10 ? "0" : ""}${minutes} ${labels.minute} `;
	runtimeString += `${secs < 10 ? "0" : ""}${secs} ${labels.second}`;

	return runtimeString;
}
