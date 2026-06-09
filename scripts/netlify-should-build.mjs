/**
 * Netlify build ignore hook.
 * Exit 0 → skip build (save 15 credits/deploy).
 * Exit 1 → run build.
 *
 * Proxy 站点只转发到 Cloudflare Pages，内容变更无需重新 deploy。
 * 仅当代理配置本身变更时才构建。
 */
import { execSync } from "node:child_process";

const PROXY_FILES = new Set([
	"netlify.toml",
	"scripts/netlify-proxy-build.js",
	"scripts/netlify-should-build.mjs",
]);

function getChangedFiles() {
	const cached = process.env.CACHED_COMMIT_REF;
	const commit = process.env.COMMIT_REF;

	if (!cached || !commit) {
		console.log("[netlify] First deploy or missing refs, building once.");
		return PROXY_FILES;
	}

	try {
		const output = execSync(`git diff --name-only ${cached} ${commit}`, {
			encoding: "utf8",
		});
		return output
			.trim()
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	} catch (error) {
		console.warn("[netlify] git diff failed, building to be safe:", error.message);
		return [...PROXY_FILES];
	}
}

const changed = getChangedFiles();
const shouldBuild = changed.some((file) => PROXY_FILES.has(file));

if (shouldBuild) {
	console.log("[netlify] Proxy config changed, running deploy.");
	console.log("[netlify] Changed:", changed.filter((f) => PROXY_FILES.has(f)).join(", ") || "(all)");
	process.exit(1);
}

console.log(
	"[netlify] No proxy config changes — skipping deploy (saves ~15 credits).",
);
console.log("[netlify] Content updates are served via Cloudflare Pages origin.");
process.exit(0);
