/**
 * Netlify build ignore hook
 *
 * 规则：仅当「代理层」文件相对上次 deploy 有变更时才构建。
 *   exit 0 → 跳过 deploy
 *   exit 1 → 执行 deploy
 *
 * 代理层文件（与 netlify.toml 中 command/publish/redirects 相关）：
 *   - netlify.toml
 *   - scripts/netlify-proxy-build.js
 *   - scripts/netlify-should-build.mjs
 */
import { execSync } from "node:child_process";

/** 与 Netlify 代理/回源相关的文件，增删请同步改 netlify.toml 注释 */
const PROXY_PATHS = [
	"netlify.toml",
	"scripts/netlify-proxy-build.js",
	"scripts/netlify-should-build.mjs",
];

function allowBuild(reason) {
	console.log(`[netlify] ✓ Deploy allowed: ${reason}`);
	process.exit(1);
}

function skipBuild(reason) {
	console.log(`[netlify] ✗ Deploy skipped: ${reason}`);
	console.log(
		"[netlify]   站点内容由 Cloudflare Pages 托管，代理层未变更则无需 rebuild。",
	);
	process.exit(0);
}

// Netlify Build Hook（手动触发）
if (process.env.INCOMING_HOOK_URL || process.env.INCOMING_HOOK_TITLE) {
	allowBuild("build hook");
}

// Netlify UI「Retry deploy / Clear cache and deploy」
if (
	process.env.CACHED_COMMIT_REF &&
	process.env.COMMIT_REF &&
	process.env.CACHED_COMMIT_REF === process.env.COMMIT_REF
) {
	allowBuild("manual rebuild from Netlify UI");
}

function hasProxyChanges() {
	const cached = process.env.CACHED_COMMIT_REF;
	const commit = process.env.COMMIT_REF;

	if (!cached || !commit) {
		console.warn(
			"[netlify] CACHED_COMMIT_REF or COMMIT_REF missing, cannot diff proxy paths.",
		);
		return false;
	}

	const pathArgs = PROXY_PATHS.map((p) => `"${p}"`).join(" ");

	try {
		// 只比较代理路径：exit 0 = 无变更，exit 1 = 有变更
		execSync(`git diff --quiet ${cached} ${commit} -- ${pathArgs}`, {
			stdio: "pipe",
		});
		return false;
	} catch {
		return true;
	}
}

function listProxyDiffFiles() {
	const cached = process.env.CACHED_COMMIT_REF;
	const commit = process.env.COMMIT_REF;
	const pathArgs = PROXY_PATHS.map((p) => `"${p}"`).join(" ");

	try {
		const output = execSync(
			`git diff --name-only ${cached} ${commit} -- ${pathArgs}`,
			{ encoding: "utf8" },
		);
		return output
			.trim()
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	} catch {
		return PROXY_PATHS;
	}
}

if (hasProxyChanges()) {
	const files = listProxyDiffFiles();
	allowBuild(`proxy files changed: ${files.join(", ")}`);
}

skipBuild("no changes in proxy files");
