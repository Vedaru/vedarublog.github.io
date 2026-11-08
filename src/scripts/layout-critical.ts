import "./runtime/scroll-sync";
import "./runtime/shell-bootstrap";
import "./runtime/swup-idle";
import { initThemeCriticalDeferred } from "./runtime/theme-critical-deferred";

initThemeCriticalDeferred();

document.addEventListener("DOMContentLoaded", () => {
	window.__bootstrapWallpaperBodyClasses?.();
});
