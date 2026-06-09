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
 * - NETLIFY_A_IPS         Netlify A 记录 IP，逗号分隔，默认 75.2.60.5
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

function normalizeDns(value) {
	return value.toLowerCase().replace(/\.$/, "");
}

function parseNetlifyIps() {
	const raw = env("NETLIFY_A_IPS", "75.2.60.5");
	return new Set(
		raw
			.split(",")
			.map((ip) => ip.trim())
			.filter(Boolean),
	);
}

function inferModeFromRecord(record, netlifyTarget, cfTarget, netlifyIps) {
	if (!record) return "unknown";

	const content = normalizeDns(record.content);

	if (record.type === "A" && netlifyIps.has(content)) {
		return "netlify";
	}

	if (record.type === "CNAME") {
		if (
			content.includes("netlify") ||
			content === normalizeDns(netlifyTarget)
		) {
			return "netlify";
		}
		if (content.includes("pages.dev") || content === normalizeDns(cfTarget)) {
			return "cloudflare";
		}
	}

	return "unknown";
}

async function listDnsRecordsByName(zoneId, name, token) {
	const data = await cfRequest(
		"GET",
		`/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`,
		token,
	);
	return data.result ?? [];
}

async function getWwwDnsRecord(zoneId, wwwFqdn, domain, token) {
	const candidates = [wwwFqdn, `www.${domain}`, "www"];
	const seen = new Set();
	const records = [];

	for (const name of candidates) {
		if (seen.has(name)) continue;
		seen.add(name);
		const found = await listDnsRecordsByName(zoneId, name, token);
		records.push(...found);
	}

	const preferred = records.find(
		(record) =>
			record.type === "CNAME" ||
			record.type === "A" ||
			record.type === "AAAA",
	);

	if (preferred) return preferred;

	if (records.length > 0) return records[0];

	// 列出 zone 内含 www 的记录，便于排查
	const all = await cfRequest(
		"GET",
		`/zones/${zoneId}/dns_records?per_page=100`,
		token,
	);
	const hints = (all.result ?? [])
		.filter((record) => /www/i.test(record.name))
		.map((record) => `${record.type} ${record.name} → ${record.content}`)
		.slice(0, 8);

	const hintText =
		hints.length > 0
			? `\nZone 内与 www 相关的记录:\n${hints.join("\n")}`
			: "\nZone 内未找到任何 www 相关 DNS 记录。请确认域名 DNS 托管在 Cloudflare。";

	throw new Error(`DNS record not found for ${wwwFqdn}.${hintText}`);
}

async function replaceDnsRecord(zoneId, record, next, token) {
	if (
		record.type === next.type &&
		normalizeDns(record.content) === normalizeDns(next.content) &&
		(record.proxied ?? false) === (next.proxied ?? false)
	) {
		return record;
	}

	// Cloudflare 不允许 PATCH 改类型，A ↔ CNAME 需删后重建
	if (record.type !== next.type) {
		await cfRequest(
			"DELETE",
			`/zones/${zoneId}/dns_records/${record.id}`,
			token,
		);
		const created = await cfRequest(
			"POST",
			`/zones/${zoneId}/dns_records`,
			token,
			next,
		);
		return created.result;
	}

	const updated = await cfRequest(
		"PATCH",
		`/zones/${zoneId}/dns_records/${record.id}`,
		token,
		next,
	);
	return updated.result;
}

function recordNameForApi(record, wwwFqdn) {
	// 创建/更新时沿用 Cloudflare 已有记录的 name 格式（www 或 FQDN）
	return record.name.includes(".") ? record.name : wwwFqdn.split(".")[0];
}

async function applyWwwTarget(
	zoneId,
	record,
	wwwFqdn,
	targetMode,
	token,
	{ netlifyTarget, cfTarget, netlifyIps },
) {
	const name = recordNameForApi(record, wwwFqdn);
	const proxied = record.proxied ?? true;

	if (targetMode === "cloudflare") {
		return replaceDnsRecord(
			zoneId,
			record,
			{
				type: "CNAME",
				name,
				content: cfTarget,
				proxied,
				ttl: 1,
			},
			token,
		);
	}

	// netlify：优先 CNAME 到 netlify.app；若原本是 A 记录且无 CNAME target 则回退 A
	if (netlifyTarget) {
		return replaceDnsRecord(
			zoneId,
			record,
			{
				type: "CNAME",
				name,
				content: netlifyTarget,
				proxied,
				ttl: 1,
			},
			token,
		);
	}

	const netlifyIp = [...netlifyIps][0];
	return replaceDnsRecord(
		zoneId,
		record,
		{
			type: "A",
			name,
			content: netlifyIp,
			proxied,
			ttl: 1,
		},
		token,
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
	console.log(`[traffic] DRY_RUN=${dryRun ? "yes (no DNS changes)" : "no (will update DNS if needed)"}`);
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
	const netlifyIps = parseNetlifyIps();

	if (!cfToken || !zoneId) {
		throw new Error("Missing CF_API_TOKEN or CF_ZONE_ID");
	}

	const record = await getWwwDnsRecord(zoneId, wwwFqdn, domain, cfToken);
	console.log(
		`Found DNS: ${record.type} ${record.name} → ${record.content} (proxied=${record.proxied ?? false})`,
	);

	const currentMode = inferModeFromRecord(
		record,
		netlifyTarget,
		cfTarget,
		netlifyIps,
	);
	console.log(`Current mode: ${currentMode}`);

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

	const targetCname =
		targetMode === "cloudflare" ? cfTarget : netlifyTarget || [...netlifyIps][0];
	const targetType =
		targetMode === "cloudflare" || netlifyTarget ? "CNAME" : "A";
	const alreadyOnTarget =
		record.type === targetType &&
		normalizeDns(record.content) === normalizeDns(targetCname);

	const state = {
		checkedAt: new Date().toISOString(),
		currentMode,
		targetMode,
		reason,
		wwwFqdn,
		currentRecord: `${record.type} ${record.content}`,
		targetRecord: `${targetType} ${targetCname}`,
		dryRun,
	};

	if (alreadyOnTarget) {
		console.log(`No DNS change needed (already ${targetMode}).`);
		writeState({ ...state, action: "none" });
		return;
	}

	console.log(
		`Switching ${wwwFqdn}: ${record.type} ${record.content} → ${targetType} ${targetCname}`,
	);
	console.log(`Reason: ${reason}`);

	if (dryRun) {
		console.log("[DRY_RUN] DNS update skipped.");
		writeState({ ...state, action: "dry-run" });
		return;
	}

	await applyWwwTarget(zoneId, record, wwwFqdn, targetMode, cfToken, {
		netlifyTarget,
		cfTarget,
		netlifyIps,
	});
	console.log(`✓ DNS switched to ${targetMode}`);
	writeState({
		...state,
		action: "switched",
		previousRecord: `${record.type} ${record.content}`,
	});
}

main().catch((error) => {
	console.error("❌ netlify-traffic-switch failed:", error);
	process.exit(1);
});
