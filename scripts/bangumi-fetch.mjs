const DEFAULT_USER_AGENT = "vedarublog/8.0 (https://www.vedaru.cn)";

export async function fetchBangumi(url, options = {}) {
	const token = process.env.BANGUMI_ACCESS_TOKEN;
	const headers = {
		"User-Agent": process.env.BANGUMI_USER_AGENT || DEFAULT_USER_AGENT,
		...(token ? { Authorization: `Bearer ${token}` } : {}),
		...options.headers,
	};

	const proxy = process.env.BANGUMI_PROXY;
	if (proxy) {
		const { fetch: undiciFetch, ProxyAgent } = await import("undici");
		return undiciFetch(url, {
			...options,
			headers,
			dispatcher: new ProxyAgent(proxy),
		});
	}

	return fetch(url, { ...options, headers });
}
