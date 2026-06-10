import "./runtime/shell-bootstrap";
import "./runtime/smooth-scroll";
import "./runtime/swup-transition-performance";
import "./runtime/home-pre-scroll";
import "./runtime/banner-drift";
import { initThemeCriticalDeferred } from "./runtime/theme-critical-deferred";

initThemeCriticalDeferred();

document.addEventListener("DOMContentLoaded", () => {
	window.__bootstrapWallpaperBodyClasses?.();
});
