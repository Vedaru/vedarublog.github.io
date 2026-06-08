import { fetch as undiciFetch, ProxyAgent } from "undici";

const DEFAULT_USER_AGENT = "vedarublog/8.0 (https://www.vedaru.cn)";

function getDispatcher() {
	const proxy = process.env.BANGUMI_PROXY;
	return proxy ? new ProxyAgent(proxy) : undefined;
}

export async function fetchBangumi(url, options = {}) {
	const token = process.env.BANGUMI_ACCESS_TOKEN;
	const headers = {
		"User-Agent": process.env.BANGUMI_USER_AGENT || DEFAULT_USER_AGENT,
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...options.headers,
	};

	const dispatcher = getDispatcher();
	return undiciFetch(url, {
		...options,
		headers,
		...(dispatcher ? { dispatcher } : {}),
	});
}
