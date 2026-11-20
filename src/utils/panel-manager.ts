/**
 * Floating panel state.
 *
 * Animation lives in panel-animations.css: every panel has the same CSS
 * transition on transform/opacity, and `.float-panel-closed` is the only state
 * this module toggles. No forced reflow, no inline transition strings, no
 * per-panel timers.
 */
export type PanelId =
	| "language-panel"
	| "mobile-toc-panel"
	| "display-setting"
	| "nav-menu-panel"
	| "search-panel";

const PANELS: PanelId[] = [
	"language-panel",
	"mobile-toc-panel",
	"display-setting",
	"nav-menu-panel",
	"search-panel",
];

function getPanel(id: PanelId): HTMLElement | null {
	return document.getElementById(id);
}

class PanelManager {
	togglePanel(panelId: PanelId, forceState?: boolean): boolean {
		const panel = getPanel(panelId);
		if (!panel) {
			console.warn(`Panel ${panelId} not found`);
			return false;
		}

		const shouldOpen =
			forceState ??
			panel.classList.contains("float-panel-closed");
		if (!shouldOpen) {
			this.closePanel(panelId);
			return false;
		}

		this.closeAllPanelsExcept(panelId);
		panel.classList.remove("float-panel-closed");
		return true;
	}

	closePanel(panelId: PanelId): void {
		getPanel(panelId)?.classList.add("float-panel-closed");
	}

	closeAllPanelsExcept(exceptPanelId?: PanelId): void {
		for (const panelId of PANELS) {
			if (panelId !== exceptPanelId) this.closePanel(panelId);
		}
	}
}

export const panelManager = new PanelManager();

export function initPanelOutsideClick(
	configs: Array<{ panel: PanelId; ignores: string[] }>,
): void {
	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Node)) return;
		for (const { panel, ignores } of configs) {
			const inside = ignores.some((id) => {
				const el = document.getElementById(id);
				return el === target || !!el?.contains(target);
			});
			if (!inside) panelManager.closePanel(panel);
		}
	});
}
