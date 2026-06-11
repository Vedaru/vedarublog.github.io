let loadPromise: Promise<void> | null = null;

const dynamicImport = new Function("specifier", "return import(specifier)") as (
	specifier: string,
) => Promise<{
	options: (opts: { excerptLength: number }) => Promise<void>;
	search: (query: string) => Promise<{
		results: Array<{ data: () => Promise<unknown> }>;
	}>;
}>;

export function loadPagefind(): Promise<void> {
	if (import.meta.env.DEV) {
		return Promise.resolve();
	}

	if (typeof window === "undefined") {
		return Promise.resolve();
	}

	if (window.pagefind && typeof window.pagefind.search === "function") {
		return Promise.resolve();
	}

	if (loadPromise) {
		return loadPromise;
	}

	loadPromise = (async () => {
		try {
			const pagefind = await dynamicImport("/pagefind/pagefind.js");
			await pagefind.options({ excerptLength: 20 });
			window.pagefind = pagefind as Window["pagefind"];
			document.dispatchEvent(new CustomEvent("pagefindready"));
		} catch {
			window.pagefind = {
				search: () => Promise.resolve({ results: [] }),
				options: () => Promise.resolve(),
			};
			document.dispatchEvent(new CustomEvent("pagefindloaderror"));
		}
	})();

	return loadPromise;
}
