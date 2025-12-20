import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const outDir = join(root, "public", "assets", "js");

mkdirSync(outDir, { recursive: true });

const TWIKOO_RGBA = String.raw`rgba\(\s*64\s*,\s*158\s*,\s*255\s*,\s*`;

const TWIKOO_THEME_REPLACEMENTS = [
	[
		new RegExp(`${TWIKOO_RGBA}0\\.6\\s*\\)`, "gi"),
		"color-mix(in srgb,var(--primary) 55%,transparent)",
	],
	[
		new RegExp(`${TWIKOO_RGBA}0\\.13\\s*\\)`, "gi"),
		"color-mix(in srgb,var(--primary) 13%,transparent)",
	],
	[
		new RegExp(`${TWIKOO_RGBA}0\\.50\\s*\\)`, "gi"),
		"color-mix(in srgb,var(--primary) 50%,transparent)",
	],
	[
		new RegExp(`${TWIKOO_RGBA}0\\.063\\s*\\)`, "gi"),
		"color-mix(in srgb,var(--primary) 6%,transparent)",
	],
	[/#409[eE][fF]{2}/g, "var(--primary)"],
];

function patchTwikooTheme(source) {
	let output = source;
	let replacements = 0;
	const hadBlue = /409[eE][fF]{2}|64\s*,\s*158\s*,\s*255/i.test(source);

	for (const [pattern, replacement] of TWIKOO_THEME_REPLACEMENTS) {
		const before = output;
		output = output.replace(pattern, replacement);
		const matches = before.match(pattern);
		if (matches) replacements += matches.length;
	}

	if (hadBlue && replacements === 0) {
		console.warn(
			"[vendor] twikoo theme patch: source contains blue tokens but no replacements were made",
		);
	}

	return { output, replacements };
}

const copies = [
	{
		from: join(root, "node_modules", "iconify-icon", "dist", "iconify-icon.min.js"),
		to: join(outDir, "iconify-icon.min.js"),
	},
	{
		from: join(root, "node_modules", "twikoo", "dist", "twikoo.all.min.js"),
		to: join(outDir, "twikoo.all.min.js"),
		patchTheme: true,
	},
];

for (const { from, to, patchTheme } of copies) {
	if (patchTheme) {
		const source = readFileSync(from, "utf8");
		const { output, replacements } = patchTwikooTheme(source);
		writeFileSync(to, output);
		console.log(`[vendor] ${from} → ${to}`);
		console.log(`[vendor] twikoo theme patched: ${replacements} replacements`);
		continue;
	}

	copyFileSync(from, to);
	console.log(`[vendor] ${from} → ${to}`);
}
