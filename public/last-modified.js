/** 文章「距离上次编辑」实时计时（Swup 换页后重新初始化） */

if (window.__lastModifiedBootstrapped) {
	window.initLastModifiedPage?.();
} else {
	window.__lastModifiedBootstrapped = true;

	let tickTimer = null;

	function formatElapsed(dataEl) {
		const startDate = new Date(dataEl.dataset.lastModified);
		if (Number.isNaN(startDate.getTime())) return dataEl.dataset.prefix || "";

		const diff = Date.now() - startDate.getTime();
		const seconds = Math.floor(diff / 1000);
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		const years = Math.floor(days / 365);
		const months = Math.floor((days % 365) / 30);
		const remainingDays = days % 30;

		const prefix = dataEl.dataset.prefix || "";
		const yearKey = dataEl.dataset.year || "";
		const monthKey = dataEl.dataset.month || "";
		const dayKey = dataEl.dataset.day || "";
		const hourKey = dataEl.dataset.hour || "";
		const minuteKey = dataEl.dataset.minute || "";
		const secondKey = dataEl.dataset.second || "";

		let runtimeString = `${prefix} `;
		if (years > 0) runtimeString += `${years} ${yearKey} `;
		if (months > 0) runtimeString += `${months} ${monthKey} `;
		if (remainingDays > 0) runtimeString += `${remainingDays} ${dayKey} `;
		runtimeString += `${hours} ${hourKey} `;
		runtimeString += `${minutes < 10 ? "0" : ""}${minutes} ${minuteKey} `;
		runtimeString += `${secs < 10 ? "0" : ""}${secs} ${secondKey}`;

		return runtimeString;
	}

	function updateLastModifiedDisplay() {
		const dataEl = document.getElementById("last-modified");
		const displayEl = document.getElementById("modifiedtime");
		if (!dataEl || !displayEl) return;
		displayEl.textContent = formatElapsed(dataEl);
	}

	function startLastModifiedTimer() {
		if (!document.getElementById("last-modified")) return;
		clearInterval(tickTimer);
		updateLastModifiedDisplay();
		tickTimer = setInterval(updateLastModifiedDisplay, 1000);
	}

	let swupListenersRegistered = false;

	function registerLastModifiedSwupListeners() {
		if (swupListenersRegistered || !window.swup?.hooks) return;
		swupListenersRegistered = true;

		window.swup.hooks.on("content:replace", () => startLastModifiedTimer());
		window.swup.hooks.on("page:view", () => startLastModifiedTimer());
	}

	function bootstrapLastModified() {
		registerLastModifiedSwupListeners();
		startLastModifiedTimer();
	}

	window.initLastModifiedPage = startLastModifiedTimer;

	document.addEventListener("swup:enable", registerLastModifiedSwupListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapLastModified);
	} else {
		bootstrapLastModified();
	}
}
