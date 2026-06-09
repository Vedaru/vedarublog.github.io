/**
 * Netlify ↔ Cloudflare Pages DNS 自动切换
 *
 * 触发条件（auto 模式，满足任一即切到 CF 直连）：
 * - 本月 production deploy 估算 credits 剩余 ≤ NETLIFY_CREDITS_RESERVE
 * - Netlify 站点 paused / 不可用
 * - https://www 探测失败
 *
 * 恢复条件：
 * - 月初 credits 估算充足且当前在 CF 模式 → 切回 Netlify
 *
 * 所需 GitHub Secrets / 环境变量：
 * - CF_API_TOKEN        Cloudflare API Token（Zone DNS Edit）
 * - CF_ZONE_ID          vedaru.cn 的 Zone ID
 * - NETLIFY_AUTH_TOKEN  Netlify Personal Access Token
 * - NETLIFY_SITE_ID     Netlify Site ID
 * - NETLIFY_CNAME_TARGET  如 xxx.netlify.app
 *
 * 可选：
 * - SITE_DOMAIN=vedaru.cn
 * - CF_PAGES_CNAME=vedarublog-github-io.pages.dev
 * - NETLIFY_MONTHLY_CREDITS=300
 * - NETLIFY_DEPLOY_CREDIT_COST=15
 * - NETLIFY_CREDITS_RESERVE=45
 * - NETLIFY_TRAFFIC_MODE=auto|netlify|cloudflare
 * - DRY_RUN=1
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CF_API = "https://api.cloudflare.com/client/v4";
const NETLIFY_API = "https://api.netlify.com/api/v1";

function env(name, fallback = "") {
	return process.env[name]?.trim() || fallback;
}

function envInt(name, fallback) {
	const value = Number(process.env[name]);
	return Number.isFinite(value) ? value : fallback;
}

async function netlifyFetch(path, token) {
	const response = await fetch(`${NETLIFY_API}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!response.ok) {
		throw new Error(
			`Netlify API ${path}: ${response.status} ${await response.text()}`,
		);
	}

	return response.json();
}

async function cfRequest(method, path, token, body) {
	const response = await fetch(`${CF_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = await response.json();
	if (!data.success) {
		throw new Error(
			`Cloudflare API ${method} ${path}: ${JSON.stringify(data.errors)}`,
		);
	}

	return data;
}

function monthStartUtc() {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function estimateNetlifyCredits(siteId, token) {
	const monthlyCredits = envInt("NETLIFY_MONTHLY_CREDITS", 300);
	const deployCost = envInt("NETLIFY_DEPLOY_CREDIT_COST", 15);
	const start = monthStartUtc();

	let productionDeploys = 0;
	for (let page = 1; page <= 10; page++) {
		const deploys = await netlifyFetch(
			`/sites/${siteId}/deploys?page=${page}&per_page=100`,
			token,
		);

		if (!Array.isArray(deploys) || deploys.length === 0) break;

		let reachedOlder = false;
		for (const deploy of deploys) {
			if (new Date(deploy.created_at) < start) {
				reachedOlder = true;
				break;
			}
			if (deploy.context === "production") {
				productionDeploys += 1;
			}
		}

		if (reachedOlder) break;
	}

	const usedEstimate = productionDeploys * deployCost;
	return {
		productionDeploys,
		usedEstimate,
		remaining: monthlyCredits - usedEstimate,
		monthlyCredits,
	};
}

async function isNetlifySiteUnavailable(siteId, token, siteUrl) {
	try {
		const site = await netlifyFetch(`/sites/${siteId}`, token);
		if (site.state && site.state !== "current") {
			return { unavailable: true, reason: `site state=${site.state}` };
		}
	} catch (error) {
		return { unavailable: true, reason: `site api error: ${error.message}` };
	}

	if (!siteUrl) return { unavailable: false };

	try {
		const response = await fetch(siteUrl, {
			method: "GET",
			redirect: "follow",
			signal: AbortSignal.timeout(15000),
		});
		const text = await response.text();
		if (
			response.status >= 500 ||
			/site not available|account suspended|credit limit/i.test(text)
		) {
			return {
				unavailable: true,
				reason: `netlify url status=${response.status}`,
			};
		}
	} catch (error) {
		return { unavailable: true, reason: `netlify url probe: ${error.message}` };
	}

	return { unavailable: false };
}

async function probeHttps(url) {
	try {
		const response = await fetch(url, {
			method: "HEAD",
			redirect: "follow",
			signal: AbortSignal.timeout(20000),
		});
		return { ok: response.ok, status: response.status };
	} catch (error) {
		return { ok: false, error: error.message };
	}
}

function normalizeCname(value) {
	return value.toLowerCase().replace(/\.$/, "");
}

function inferMode(recordContent, netlifyTarget, cfTarget) {
	const content = normalizeCname(recordContent);
	if (
		content.includes("netlify") ||
		content === normalizeCname(netlifyTarget)
	) {
		return "netlify";
	}
	if (content.includes("pages.dev") || content === normalizeCname(cfTarget)) {
		return "cloudflare";
	}
	return "unknown";
}

async function getDnsRecord(zoneId, fqdn, token) {
	const data = await cfRequest(
		"GET",
		`/zones/${zoneId}/dns_records?type=CNAME&name=${encodeURIComponent(fqdn)}`,
		token,
	);
	return data.result[0] ?? null;
}

async function updateDnsCname(zoneId, record, content, token) {
	return cfRequest(
		"PATCH",
		`/zones/${zoneId}/dns_records/${record.id}`,
		token,
		{
			type: "CNAME",
			name: record.name,
			content,
			proxied: record.proxied ?? true,
			ttl: 1,
		},
	);
}

function writeState(state) {
	if (state.action === "none") {
		logSummary(state);
		return;
	}

	const path = join(process.cwd(), ".github/netlify-traffic-state.json");
	writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
	console.log(`State written to ${path}`);
	logSummary(state);
}

function logSummary(state) {
	const summaryPath = process.env.GITHUB_STEP_SUMMARY;
	if (!summaryPath) return;

	const lines = [
		"## Netlify Traffic Switch",
		"",
		`| 项 | 值 |`,
		`|---|---|`,
		`| 当前模式 | ${state.currentMode} |`,
		`| 目标模式 | ${state.targetMode} |`,
		`| 操作 | ${state.action ?? "none"} |`,
		`| 原因 | ${state.reason} |`,
		`| 检查时间 | ${state.checkedAt} |`,
	];

	appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

async function main() {
	const dryRun = ["1", "true", "yes"].includes(
		env("DRY_RUN", "").toLowerCase(),
	);
	const forceMode = env("NETLIFY_TRAFFIC_MODE", "auto").toLowerCase();

	const cfToken = env("CF_API_TOKEN");
	const zoneId = env("CF_ZONE_ID");
	const netlifyToken = env("NETLIFY_AUTH_TOKEN");
	const siteId = env("NETLIFY_SITE_ID");
	const netlifyTarget = env("NETLIFY_CNAME_TARGET");
	const cfTarget = env("CF_PAGES_CNAME", "vedarublog-github-io.pages.dev");
	const domain = env("SITE_DOMAIN", "vedaru.cn");
	const wwwFqdn = `${env("DNS_WWW_NAME", "www")}.${domain}`;
	const reserve = envInt("NETLIFY_CREDITS_RESERVE", 45);
	const restoreBuffer = envInt("NETLIFY_CREDITS_RESTORE_BUFFER", 60);

	if (!cfToken || !zoneId) {
		throw new Error("Missing CF_API_TOKEN or CF_ZONE_ID");
	}
	if (!netlifyTarget) {
		throw new Error("Missing NETLIFY_CNAME_TARGET (e.g. your-site.netlify.app)");
	}

	const record = await getDnsRecord(zoneId, wwwFqdn, cfToken);
	if (!record) {
		throw new Error(`CNAME record not found for ${wwwFqdn}`);
	}

	const currentMode = inferMode(record.content, netlifyTarget, cfTarget);
	console.log(`Current mode: ${currentMode} (${record.content})`);

	let targetMode = "netlify";
	let reason = "default netlify";

	if (forceMode === "cloudflare") {
		targetMode = "cloudflare";
		reason = "NETLIFY_TRAFFIC_MODE=cloudflare";
	} else if (forceMode === "netlify") {
		targetMode = "netlify";
		reason = "NETLIFY_TRAFFIC_MODE=netlify";
	} else {
		let switchToCloudflare = false;
		let credits = null;

		if (netlifyToken && siteId) {
			credits = await estimateNetlifyCredits(siteId, netlifyToken);
			console.log(
				`Credits estimate: deploys=${credits.productionDeploys}, used≈${credits.usedEstimate}, remaining≈${credits.remaining}/${credits.monthlyCredits}`,
			);

			if (credits.remaining <= reserve) {
				switchToCloudflare = true;
				reason = `credits low (remaining≈${credits.remaining} ≤ reserve ${reserve})`;
			}

			const siteMeta = await netlifyFetch(`/sites/${siteId}`, netlifyToken);
			const unavailable = await isNetlifySiteUnavailable(
				siteId,
				netlifyToken,
				siteMeta.ssl_url || siteMeta.url,
			);
			if (unavailable.unavailable) {
				switchToCloudflare = true;
				reason = unavailable.reason;
			}
		} else {
			console.warn("NETLIFY_AUTH_TOKEN or NETLIFY_SITE_ID missing — skip credit checks");
		}

		const probe = await probeHttps(`https://${wwwFqdn}`);
		console.log(`HTTPS probe https://${wwwFqdn}:`, probe);
		if (!probe.ok && currentMode === "netlify") {
			switchToCloudflare = true;
			reason = reason || `custom domain probe failed (${probe.error ?? probe.status})`;
		}

		if (switchToCloudflare) {
			targetMode = "cloudflare";
		} else if (
			currentMode === "cloudflare" &&
			credits &&
			credits.remaining > reserve + restoreBuffer
		) {
			targetMode = "netlify";
			reason = `credits restored (remaining≈${credits.remaining})`;
		}
	}

	const targetCname = targetMode === "cloudflare" ? cfTarget : netlifyTarget;
	const normalizedCurrent = normalizeCname(record.content);
	const normalizedTarget = normalizeCname(targetCname);

	const state = {
		checkedAt: new Date().toISOString(),
		currentMode,
		targetMode,
		reason,
		wwwFqdn,
		currentCname: record.content,
		targetCname,
		dryRun,
	};

	if (normalizedCurrent === normalizedTarget) {
		console.log(`No DNS change needed (already ${targetMode}).`);
		writeState({ ...state, action: "none" });
		return;
	}

	console.log(`Switching ${wwwFqdn}: ${record.content} → ${targetCname}`);
	console.log(`Reason: ${reason}`);

	if (dryRun) {
		console.log("[DRY_RUN] DNS update skipped.");
		writeState({ ...state, action: "dry-run" });
		return;
	}

	await updateDnsCname(zoneId, record, targetCname, cfToken);
	console.log(`✓ DNS switched to ${targetMode}`);
	writeState({ ...state, action: "switched", previousCname: record.content });
}

main().catch((error) => {
	console.error("❌ netlify-traffic-switch failed:", error);
	process.exit(1);
});
