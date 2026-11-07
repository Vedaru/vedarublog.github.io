import "./runtime/scroll-sync";
import "./runtime/shell-bootstrap";
import "./runtime/smooth-scroll";
import "./runtime/swup-transition-performance";
import { initThemeCriticalDeferred } from "./runtime/theme-critical-deferred";

initThemeCriticalDeferred();

document.addEventListener("DOMContentLoaded", () => {
	window.__bootstrapWallpaperBodyClasses?.();
});
