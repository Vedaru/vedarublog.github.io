function runDeferred(): void {
	void import("./runtime/analytics-scheduler");
	// 始终加载以注册 Swup 钩子；从首页 SPA 进入文章页时首屏无 #tcomment
	void import("./runtime/comment-boot");

	if (document.getElementById("last-modified")) {
		void import("./runtime/last-modified");
	}

	// 非关键脚本：idle 后加载，Swup 换页仍依赖其钩子
	void import("./code-collapse.js");
	void import("./mermaid-init.js");
	void import("./theme-optimizer.js");
}

if ("requestIdleCallback" in window) {
	requestIdleCallback(runDeferred, { timeout: 2000 });
} else {
	setTimeout(runDeferred, 1);
}

// 只是一个注册钩子的模块：没有任何导出，显式标记为模块
export {};
