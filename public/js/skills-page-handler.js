// Skills page category filter tabs.
//
// Loaded as a global plain script (`<script is:inline src>`) so it survives
// Swup navigations: inline/bundled scripts do not re-run when Swup replaces
// the page content, so the handler re-binds itself on content replaced /
// page view and keeps a single state object on `window`.

(function () {
	"use strict";

	if (window.skillsPageState && window.skillsPageState.initialized) {
		return;
	}

	const state = {
		initialized: false,
		observer: null,
	};

	window.skillsPageState = state;

	const CARDS_SELECTOR = ".skill-card";
	const TABS_SELECTOR = ".skill-filter-tab";

	function getGrid() {
		return document.getElementById("skills-grid");
	}

	function getTabs() {
		return Array.from(document.querySelectorAll(TABS_SELECTOR));
	}

	function applyFilter(category) {
		const grid = getGrid();
		if (!grid) return;

		grid.querySelectorAll(CARDS_SELECTOR).forEach((card) => {
			const match = category === "all" || card.dataset.category === category;
			card.classList.toggle("filtered-out", !match);
		});

		getTabs().forEach((tab) => {
			const active = tab.dataset.category === category;
			tab.classList.toggle("is-active", active);
			tab.setAttribute("aria-pressed", active ? "true" : "false");
		});
	}

	function bindTabs() {
		getTabs().forEach((tab) => {
			if (tab.dataset.skillsFilterBound === "true") return;
			tab.dataset.skillsFilterBound = "true";
			tab.addEventListener("click", () => {
				applyFilter(tab.dataset.category || "all");
			});
		});
	}

	function initSkillsPage() {
		if (!getGrid() || getTabs().length === 0) return false;

		bindTabs();

		// Restore the initial state: the "all" tab is pre-marked active in the
		// markup, so re-asserting it here keeps cards and tabs consistent after
		// a client-side navigation.
		const active = getTabs().find((tab) =>
			tab.classList.contains("is-active"),
		);
		applyFilter(active?.dataset.category || "all");

		if (!state.initialized) {
			state.initialized = true;
			observeDom();
		}
		return true;
	}

	function observeDom() {
		if (state.observer || typeof MutationObserver === "undefined") return;
		state.observer = new MutationObserver(() => {
			if (getGrid() && getTabs().length > 0) {
				bindTabs();
			}
		});
		state.observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	// Retry: the script may load before the page markup is in the DOM.
	let attempts = 0;
	const retry = setInterval(() => {
		attempts += 1;
		if (initSkillsPage() || attempts > 40) clearInterval(retry);
	}, 100);

	["swup:contentReplaced", "swup:pageView", "astro:page-load", "astro:after-swap"].forEach(
		(eventName) => {
			document.addEventListener(eventName, () => {
				initSkillsPage();
			});
		},
	);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initSkillsPage);
	} else {
		initSkillsPage();
	}
})();
