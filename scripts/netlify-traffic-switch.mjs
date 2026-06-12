/**
 * Netlify ↔ Cloudflare Pages 全自动切换（DNS + Pages 自定义域名）
 *
 * 切到 Cloudflare 时会：
 * 1. 在 Pages 项目注册 www（及 apex）自定义域名
 * 2. www CNAME → pages.dev，强制 proxied（橙云）
 * 3. apex A/CNAME → Netlify IP 或 pages.dev
 *
 * Secrets:
 * - CF_API_TOKEN（Zone DNS Edit + Account Cloudflare Pages Edit）
 * - CF_ZONE_ID
 * - CF_PAGES_PROJECT（默认 vedarublog-github-io）
 * - CF_ACCOUNT_ID（可选，可从 Zone 自动读取）
 * - NETLIFY_*（auto 模式检测 credits 用）
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CF_API = "https://api.cloudflare.com/client/v4";
const NETLIFY_API = "https://api.netlify.com/api/v1";

const PAGES_TOKEN_HELP = `
[pages] CF_API_TOKEN 无法访问 Cloudflare Pages API（Authentication error）。

请在 Cloudflare → My Profile → API Tokens → 编辑/重建 Token，添加：

  Account → Cloudflare Pages → Edit
  Account Resources → Include → 你的 Cloudflare 账号

  Zone → DNS → Edit（已有，用于改 DNS）
  Zone Resources → Include → vedaru.cn

或单独创建 Pages Token 填入 GitHub Secret：CF_PAGES_API_TOKEN

创建后更新仓库 Settings → Secrets → Actions 中的 CF_API_TOKEN（或新增 CF_PAGES_API_TOKEN），再重新运行 workflow。
`.trim();

function env(name, fallback = "") {
	return process.env[name]?.trim() || fallback;
}

function cfDnsToken() {
	return env("CF_API_TOKEN");
}

/** Pages 域名注册可用独立 Token，否则复用 CF_API_TOKEN */
function cfPagesToken() {
	return env("CF_PAGES_API_TOKEN") || env("CF_API_TOKEN");
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

function isCfAuthError(errors) {
	return (errors ?? []).some(
		(e) =>
			e.code === 10000 ||
			/authentication error|unauthorized|permission/i.test(
				String(e.message),
			),
	);
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
		const errors = data.errors ?? [];
		const base = `Cloudflare API ${method} ${path}: ${JSON.stringify(errors)}`;
		if (isCfAuthError(errors) && path.includes("/pages/")) {
			const err = new Error(`${base}\n\n${PAGES_TOKEN_HELP}`);
			err.pagesAuth = true;
			throw err;
		}
		throw new Error(base);
	}
	return data;
}

async function getNetlifyCredits(siteId, token) {
	const site = await netlifyFetch(`/sites/${siteId}`, token);
	const accountSlug = site.account_slug;

	if (!accountSlug) {
		throw new Error("Could not find account_slug from Netlify site");
	}

	const status = await netlifyFetch(`/${accountSlug}/builds/status`, token);

	const usedMinutes = status.minutes?.current || 0;
	const monthlyCredits = status.minutes?.included_minutes || envInt("NETLIFY_MONTHLY_CREDITS", 300);
	const totalDeploys = status.build_count || 0;

	return {
		totalDeploys,
		usedEstimate: usedMinutes,
		remaining: monthlyCredits - usedMinutes,
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
		return {
			unavailable: true,
			reason: `site api error: ${error.message}`,
		};
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
		return {
			unavailable: true,
			reason: `netlify url probe: ${error.message}`,
		};
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

	if (record.type === "A" && netlifyIps.has(content)) return "netlify";

	if (record.type === "CNAME") {
		if (
			content.includes("netlify") ||
			content === normalizeDns(netlifyTarget)
		) {
			return "netlify";
		}
		if (
			content.includes("pages.dev") ||
			content === normalizeDns(cfTarget)
		) {
			return "cloudflare";
		}
	}

	return "unknown";
}

async function getAccountId(zoneId, token) {
	const configured = env("CF_ACCOUNT_ID");
	if (configured) return configured;
	const data = await cfRequest("GET", `/zones/${zoneId}`, token);
	return data.result.account.id;
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
		records.push(...(await listDnsRecordsByName(zoneId, name, token)));
	}

	const preferred = records.find((r) =>
		["CNAME", "A", "AAAA"].includes(r.type),
	);
	if (preferred) return preferred;
	if (records.length > 0) return records[0];

	const all = await cfRequest(
		"GET",
		`/zones/${zoneId}/dns_records?per_page=100`,
		token,
	);
	const hints = (all.result ?? [])
		.filter((r) => /www/i.test(r.name))
		.map((r) => `${r.type} ${r.name} → ${r.content} (proxied=${r.proxied})`)
		.slice(0, 8);

	throw new Error(
		`DNS record not found for ${wwwFqdn}.${hints.length ? `\n${hints.join("\n")}` : ""}`,
	);
}

async function getApexDnsRecord(zoneId, domain, token) {
	const records = await listDnsRecordsByName(zoneId, domain, token);
	return records.find((r) => r.type === "A" || r.type === "CNAME") ?? null;
}

async function replaceDnsRecord(zoneId, record, next, token) {
	if (
		record.type === next.type &&
		normalizeDns(record.content) === normalizeDns(next.content) &&
		(record.proxied ?? false) === (next.proxied ?? false)
	) {
		return { record, changed: false };
	}

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
		return { record: created.result, changed: true };
	}

	const updated = await cfRequest(
		"PATCH",
		`/zones/${zoneId}/dns_records/${record.id}`,
		token,
		next,
	);
	return { record: updated.result, changed: true };
}

async function listPagesDomainNames(accountId, project, token) {
	const list = await cfRequest(
		"GET",
		`/accounts/${accountId}/pages/projects/${project}/domains`,
		token,
	);
	return (list.result ?? []).map((d) => d.name || d.domain).filter(Boolean);
}

async function missingPagesHostnames(accountId, project, hostnames, token) {
	const registered = new Set(
		(await listPagesDomainNames(accountId, project, token)).map((h) =>
			h.toLowerCase(),
		),
	);
	return hostnames.filter((h) => !registered.has(h.toLowerCase()));
}

/** Pages API 鉴权失败时不阻断 DNS 切换，返回待注册列表 */
async function safeMissingPagesHostnames(accountId, project, hostnames, token) {
	try {
		return {
			missing: await missingPagesHostnames(
				accountId,
				project,
				hostnames,
				token,
			),
			pagesAuthOk: true,
		};
	} catch (error) {
		if (error.pagesAuth) {
			console.error(error.message);
			return { missing: hostnames, pagesAuthOk: false };
		}
		throw error;
	}
}

async function ensurePagesDomains(
	accountId,
	project,
	hostnames,
	token,
	dryRun,
) {
	const results = [];
	let registered;

	try {
		registered = new Set(
			(await listPagesDomainNames(accountId, project, token)).map((h) =>
				h.toLowerCase(),
			),
		);
	} catch (error) {
		if (error.pagesAuth) {
			console.error(error.message);
			for (const hostname of hostnames) {
				results.push({
					hostname,
					status: "error",
					error: "Pages API authentication failed — update CF token permissions",
				});
			}
			return { results, pagesAuthOk: false };
		}
		throw error;
	}

	for (const hostname of hostnames) {
		try {
			if (registered.has(hostname.toLowerCase())) {
				console.log(`[pages] Domain already registered: ${hostname}`);
				results.push({ hostname, status: "exists" });
				continue;
			}

			if (dryRun) {
				console.log(
					`[DRY_RUN] Would register Pages domain: ${hostname}`,
				);
				results.push({ hostname, status: "dry-run" });
				continue;
			}

			await cfRequest(
				"POST",
				`/accounts/${accountId}/pages/projects/${project}/domains`,
				token,
				{ name: hostname },
			);
			console.log(`[pages] ✓ Registered domain: ${hostname}`);
			results.push({ hostname, status: "registered" });
		} catch (error) {
			console.warn(
				`[pages] Register ${hostname} failed: ${error.message}`,
			);
			results.push({ hostname, status: "error", error: error.message });
		}
	}

	return { results, pagesAuthOk: true };
}

async function applyCloudflareMode(ctx) {
	const { zoneId, token, wwwRecord, cfTarget, apexRecord } = ctx;
	const changes = [];

	const wwwResult = await replaceDnsRecord(
		zoneId,
		wwwRecord,
		{
			type: "CNAME",
			name: wwwRecord.name,
			content: cfTarget,
			proxied: true,
			ttl: 1,
		},
		token,
	);
	if (wwwResult.changed) {
		changes.push(
			`www: ${wwwRecord.type} ${wwwRecord.content} → CNAME ${cfTarget} (proxied)`,
		);
	}

	if (apexRecord) {
		const apexResult = await replaceDnsRecord(
			zoneId,
			apexRecord,
			{
				type: "CNAME",
				name: apexRecord.name,
				content: cfTarget,
				proxied: true,
				ttl: 1,
			},
			token,
		);
		if (apexResult.changed) {
			changes.push(
				`apex: ${apexRecord.type} ${apexRecord.content} → CNAME ${cfTarget} (proxied)`,
			);
		}
	}

	return changes;
}

async function applyNetlifyMode(ctx) {
	const { zoneId, token, wwwRecord, netlifyTarget, netlifyIps, apexRecord } =
		ctx;
	const changes = [];
	const netlifyIp = [...netlifyIps][0];

	if (netlifyTarget) {
		const wwwResult = await replaceDnsRecord(
			zoneId,
			wwwRecord,
			{
				type: "CNAME",
				name: wwwRecord.name,
				content: netlifyTarget,
				proxied: false,
				ttl: 1,
			},
			token,
		);
		if (wwwResult.changed) {
			changes.push(`www: → CNAME ${netlifyTarget} (dns-only)`);
		}
	} else {
		const wwwResult = await replaceDnsRecord(
			zoneId,
			wwwRecord,
			{
				type: "A",
				name: wwwRecord.name,
				content: netlifyIp,
				proxied: false,
				ttl: 1,
			},
			token,
		);
		if (wwwResult.changed) changes.push(`www: → A ${netlifyIp}`);
	}

	if (apexRecord) {
		const apexResult = await replaceDnsRecord(
			zoneId,
			apexRecord,
			{
				type: "A",
				name: apexRecord.name,
				content: netlifyIp,
				proxied: false,
				ttl: 1,
			},
			token,
		);
		if (apexResult.changed) {
			changes.push(`apex: → A ${netlifyIp} (dns-only)`);
		}
	}

	return changes;
}

function needsSwitch(
	record,
	targetMode,
	targetContent,
	targetType,
	netlifyIps,
) {
	const contentMatch =
		normalizeDns(record.content) === normalizeDns(targetContent);
	const typeMatch = record.type === targetType;
	const proxiedMatch =
		targetMode === "cloudflare" ? record.proxied === true : true;

	if (targetMode === "netlify" && record.type === "A") {
		return !netlifyIps.has(normalizeDns(record.content));
	}

	return !(typeMatch && contentMatch && proxiedMatch);
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

	if (state.changes?.length) {
		lines.push("", "**变更：**", ...state.changes.map((c) => `- ${c}`));
	}
	if (state.pagesDomains?.length) {
		lines.push(
			"",
			"**Pages 域名：**",
			...state.pagesDomains.map((d) => `- ${d.hostname}: ${d.status}`),
		);
	}
	if (state.probe) {
		lines.push(
			"",
			`**探测 https://${state.wwwFqdn}:** ${state.probe.status ?? state.probe.error}`,
		);
	}

	appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

async function main() {
	const dryRun = ["1", "true", "yes"].includes(
		env("DRY_RUN", "").toLowerCase(),
	);
	console.log(
		`[traffic] DRY_RUN=${dryRun ? "yes" : "no (will update DNS + Pages domains)"}`,
	);

	const forceMode = env("NETLIFY_TRAFFIC_MODE", "auto").toLowerCase();
	const cfToken = cfDnsToken();
	const pagesToken = cfPagesToken();
	const zoneId = env("CF_ZONE_ID");
	const netlifyToken = env("NETLIFY_AUTH_TOKEN");
	const siteId = env("NETLIFY_SITE_ID");
	const netlifyTarget = env("NETLIFY_CNAME_TARGET");
	const cfTarget = env("CF_PAGES_CNAME", "vedarublog-github-io.pages.dev");
	const cfProject = env("CF_PAGES_PROJECT", "vedarublog-github-io");
	const domain = env("SITE_DOMAIN", "vedaru.cn");
	const wwwFqdn = `${env("DNS_WWW_NAME", "www")}.${domain}`;
	const reserve = envInt("NETLIFY_CREDITS_RESERVE", 45);
	const restoreBuffer = envInt("NETLIFY_CREDITS_RESTORE_BUFFER", 60);
	const netlifyIps = parseNetlifyIps();
	const registerApex = env("CF_PAGES_REGISTER_APEX", "true") !== "false";

	if (!cfToken || !zoneId) {
		throw new Error("Missing CF_API_TOKEN or CF_ZONE_ID");
	}

	const accountId = await getAccountId(zoneId, cfToken);
	console.log(`[traffic] CF account=${accountId}, project=${cfProject}`);

	const wwwRecord = await getWwwDnsRecord(zoneId, wwwFqdn, domain, cfToken);
	const apexRecord = await getApexDnsRecord(zoneId, domain, cfToken);

	console.log(
		`[dns] www: ${wwwRecord.type} ${wwwRecord.content} proxied=${wwwRecord.proxied ?? false}`,
	);
	if (apexRecord) {
		console.log(
			`[dns] apex: ${apexRecord.type} ${apexRecord.content} proxied=${apexRecord.proxied ?? false}`,
		);
	}

	const currentMode = inferModeFromRecord(
		wwwRecord,
		netlifyTarget,
		cfTarget,
		netlifyIps,
	);
	console.log(`[traffic] Current mode: ${currentMode}`);

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
			credits = await getNetlifyCredits(siteId, netlifyToken);
			console.log(
				`[netlify] deploys=${credits.totalDeploys}, credits=${credits.usedEstimate}/${credits.monthlyCredits}, remaining=${credits.remaining}`,
			);
			if (credits.remaining <= reserve) {
				switchToCloudflare = true;
				reason = `credits low (remaining=${credits.remaining} ≤ ${reserve})`;
			}

			const siteMeta = await netlifyFetch(
				`/sites/${siteId}`,
				netlifyToken,
			);
			const unavailable = await isNetlifySiteUnavailable(
				siteId,
				netlifyToken,
				siteMeta.ssl_url || siteMeta.url,
			);
			if (unavailable.unavailable) {
				switchToCloudflare = true;
				reason = unavailable.reason;
			}
		}

		const probe = await probeHttps(`https://${wwwFqdn}`);
		console.log(`[probe] https://${wwwFqdn}:`, probe);
		if (!probe.ok && currentMode === "netlify") {
			switchToCloudflare = true;
			reason =
				reason || `www probe failed (${probe.error ?? probe.status})`;
		}

		if (switchToCloudflare) {
			targetMode = "cloudflare";
		} else if (
			currentMode === "cloudflare" &&
			credits &&
			credits.remaining > reserve + restoreBuffer
		) {
			targetMode = "netlify";
			reason = `credits restored (remaining=${credits.remaining})`;
		}
	}

	const targetContent =
		targetMode === "cloudflare"
			? cfTarget
			: netlifyTarget || [...netlifyIps][0];
	const targetType =
		targetMode === "cloudflare" || netlifyTarget ? "CNAME" : "A";

	const wwwNeedsUpdate = needsSwitch(
		wwwRecord,
		targetMode,
		targetContent,
		targetType,
		netlifyIps,
	);

	const apexTargetContent =
		targetMode === "cloudflare" ? cfTarget : [...netlifyIps][0];
	const apexTargetType = targetMode === "cloudflare" ? "CNAME" : "A";

	const apexNeedsUpdate =
		!!apexRecord &&
		needsSwitch(
			apexRecord,
			targetMode,
			apexTargetContent,
			apexTargetType,
			netlifyIps,
		);

	const cloudflareHostnames =
		targetMode === "cloudflare"
			? [wwwFqdn, ...(registerApex ? [domain] : [])]
			: [];

	let pagesToRegister = [];
	let pagesAuthOk = true;
	if (targetMode === "cloudflare" && cloudflareHostnames.length) {
		const pagesCheck = await safeMissingPagesHostnames(
			accountId,
			cfProject,
			cloudflareHostnames,
			pagesToken,
		);
		pagesToRegister = pagesCheck.missing;
		pagesAuthOk = pagesCheck.pagesAuthOk;
		if (pagesToRegister.length) {
			console.log(
				`[pages] Missing custom domains: ${pagesToRegister.join(", ")}`,
			);
		}
	}

	const state = {
		checkedAt: new Date().toISOString(),
		currentMode,
		targetMode,
		reason,
		wwwFqdn,
		dryRun,
		changes: [],
		pagesDomains: [],
	};

	const needsWork =
		wwwNeedsUpdate ||
		apexNeedsUpdate ||
		pagesToRegister.length > 0 ||
		targetMode !== currentMode;

	if (!needsWork) {
		console.log(`[traffic] Already on ${targetMode}, no changes needed.`);
		writeState({
			...state,
			action: "none",
			probe: await probeHttps(`https://${wwwFqdn}`),
		});
		return;
	}

	console.log(`[traffic] Switching to ${targetMode}: ${reason}`);

	if (dryRun) {
		console.log("[DRY_RUN] Skipping DNS/Pages updates.");
		writeState({ ...state, action: "dry-run" });
		return;
	}

	if (targetMode === "cloudflare") {
		// 先改 DNS（开橙云），Pages 域名注册失败也不应阻断
		state.changes = await applyCloudflareMode({
			zoneId,
			token: cfToken,
			wwwRecord,
			cfTarget,
			apexRecord,
		});

		const pagesResult = await ensurePagesDomains(
			accountId,
			cfProject,
			cloudflareHostnames,
			pagesToken,
			false,
		);
		state.pagesDomains = pagesResult.results;
		pagesAuthOk = pagesAuthOk && pagesResult.pagesAuthOk;
	} else {
		if (!netlifyTarget) {
			console.warn(
				"[traffic] NETLIFY_CNAME_TARGET missing, using A record for www",
			);
		}
		state.changes = await applyNetlifyMode({
			zoneId,
			token: cfToken,
			wwwRecord,
			netlifyTarget,
			netlifyIps,
			apexRecord,
		});
	}

	// Pages 证书/DNS 传播需要一点时间
	await new Promise((r) => setTimeout(r, 5000));
	state.probe = await probeHttps(`https://${wwwFqdn}`);

	console.log(`[traffic] ✓ Switched to ${targetMode}`);
	if (state.changes.length) {
		for (const c of state.changes) console.log(`  - ${c}`);
	}
	console.log(`[probe] after switch:`, state.probe);

	writeState({
		...state,
		action: "switched",
		pagesAuthOk,
	});

	if (targetMode === "cloudflare" && !pagesAuthOk) {
		console.error(
			"\n❌ DNS 已更新，但 Pages 自定义域名未能通过 API 注册，站点可能仍返回 522。",
		);
		console.error(PAGES_TOKEN_HELP);
		process.exit(1);
	}

	if (targetMode === "cloudflare" && !state.probe.ok) {
		console.warn(
			"[traffic] 切换后探测仍未成功，Pages 证书激活可能需要 5～15 分钟，稍后会自动重试。",
		);
	}
}

main().catch((error) => {
	console.error("❌ netlify-traffic-switch failed:", error.message ?? error);
	process.exit(1);
});

