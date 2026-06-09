/** 归档页 URL 筛选（Swup 换页后重新应用） */

if (window.__archiveFilterBootstrapped) {
	window.initArchiveFilter?.();
} else {
	window.__archiveFilterBootstrapped = true;

	let swupListenersRegistered = false;

	function applyArchiveFilters() {
		const panel = document.getElementById("archive-panel");
		if (!panel) return;

		const params = new URLSearchParams(window.location.search);
		const tags = params.getAll("tag");
		const categories = params.getAll("category");
		const uncategorized = params.has("uncategorized");

		panel.querySelectorAll("[data-archive-post]").forEach((row) => {
			const postTags = (row.dataset.tags || "")
				.split(",")
				.filter(Boolean);
			const category = row.dataset.category || "";

			let visible = true;
			if (tags.length > 0) {
				visible = tags.some((tag) => postTags.includes(tag));
			}
			if (visible && categories.length > 0) {
				visible = categories.includes(category);
			}
			if (visible && uncategorized) {
				visible = !category;
			}

			row.classList.toggle("hidden", !visible);
		});

		panel.querySelectorAll("[data-archive-year]").forEach((yearBlock) => {
			const visiblePosts = yearBlock.querySelectorAll(
				"[data-archive-post]:not(.hidden)",
			);
			yearBlock.classList.toggle("hidden", visiblePosts.length === 0);
		});
	}

	function registerArchiveSwupListeners() {
		if (swupListenersRegistered || !window.swup?.hooks) return;
		swupListenersRegistered = true;

		window.swup.hooks.on("content:replace", () => applyArchiveFilters());
		window.swup.hooks.on("page:view", () => applyArchiveFilters());
	}

	function bootstrapArchiveFilter() {
		registerArchiveSwupListeners();
		applyArchiveFilters();
	}

	window.initArchiveFilter = applyArchiveFilters;

	document.addEventListener("swup:enable", registerArchiveSwupListeners);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootstrapArchiveFilter);
	} else {
		bootstrapArchiveFilter();
	}
}
