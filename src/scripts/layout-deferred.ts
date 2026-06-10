function runDeferred(): void {
	void import("./runtime/analytics-scheduler");
	// 始终加载以注册 Swup 钩子；从首页 SPA 进入文章页时首屏无 #tcomment
	void import("./runtime/comment-boot");

	if (document.getElementById("last-modified")) {
		void import("./runtime/last-modified");
	}
}

if ("requestIdleCallback" in window) {
	requestIdleCallback(runDeferred, { timeout: 2000 });
} else {
	setTimeout(runDeferred, 1);
}
