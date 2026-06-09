import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const terserPath = require.resolve("terser", {
	paths: [path.dirname(require.resolve("@playform/compress/package.json"))],
});
const { minify } = await import(pathToFileURL(terserPath).href);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagefindDir = path.join(__dirname, "../dist/pagefind");

function collectFiles(dir, extension, files = []) {
	if (!fs.existsSync(dir)) return files;

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collectFiles(fullPath, extension, files);
		} else if (entry.name.endsWith(extension)) {
			files.push(fullPath);
		}
	}

	return files;
}

async function minifyJson(file) {
	const raw = fs.readFileSync(file, "utf8");
	const parsed = JSON.parse(raw);
	fs.writeFileSync(file, JSON.stringify(parsed));
}

async function main() {
	if (!fs.existsSync(pagefindDir)) {
		console.log("⚠ dist/pagefind not found, skipping pagefind compression");
		return;
	}

	for (const file of collectFiles(pagefindDir, ".js")) {
		const code = fs.readFileSync(file, "utf8");
		const result = await minify(code, {
			module: file.endsWith(".mjs"),
			format: { comments: false },
		});

		if (result.code) {
			fs.writeFileSync(file, result.code);
			console.log(`✓ minified ${path.relative(pagefindDir, file)}`);
		}
	}

	for (const file of collectFiles(pagefindDir, ".json")) {
		await minifyJson(file);
		console.log(`✓ minified ${path.relative(pagefindDir, file)}`);
	}
}

main().catch((error) => {
	console.error("❌ Pagefind compression failed:", error);
	process.exit(1);
});
