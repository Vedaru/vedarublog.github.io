#!/usr/bin/env node
/**
 * Re-encode oversized Opus files in public/assets/music/url/ to 64kbps.
 * Usage: node scripts/reencode-music.mjs [--threshold-mb=4] [--dry-run]
 */

import { readdirSync, statSync, unlinkSync, renameSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const urlDir = join(root, "public", "assets", "music", "url");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const thresholdArg = args.find((a) => a.startsWith("--threshold-mb="));
const thresholdBytes =
	(thresholdArg ? Number.parseFloat(thresholdArg.split("=")[1]) : 4) *
	1024 *
	1024;

function ensureFfmpeg() {
	const probe = spawnSync("ffmpeg", ["-version"], { stdio: "pipe" });
	if (probe.error || probe.status !== 0) {
		console.error("❌ ffmpeg is required but not available in PATH");
		process.exit(1);
	}
}

function transcodeInPlace(inputPath) {
	const tempPath = `${inputPath}.reencode.tmp`;
	const ffArgs = [
		"-i",
		inputPath,
		"-c:a",
		"libopus",
		"-b:a",
		"64k",
		"-f",
		"ogg",
		"-y",
		tempPath,
	];

	if (dryRun) {
		console.log(`[dry-run] would reencode: ${inputPath}`);
		return { ok: true, skipped: true };
	}

	const result = spawnSync("ffmpeg", ffArgs, { stdio: "inherit" });
	if (result.error) {
		console.error(`❌ ffmpeg failed for ${inputPath}: ${result.error.message}`);
		try {
			unlinkSync(tempPath);
		} catch {
			/* ignore */
		}
		return { ok: false };
	}
	if (result.status !== 0) {
		console.error(`❌ ffmpeg exited ${result.status} for ${inputPath}`);
		try {
			unlinkSync(tempPath);
		} catch {
			/* ignore */
		}
		return { ok: false };
	}

	const before = statSync(inputPath).size;
	unlinkSync(inputPath);
	renameSync(tempPath, inputPath);
	const after = statSync(inputPath).size;
	return { ok: true, before, after };
}

function main() {
	if (!existsSync(urlDir)) {
		console.log(`ℹ Music url directory missing: ${urlDir}`);
		return;
	}

	ensureFfmpeg();

	const files = readdirSync(urlDir).filter((f) => f.endsWith(".opus"));
	let reencoded = 0;
	let totalBefore = 0;
	let totalAfter = 0;

	for (const file of files.sort()) {
		const filePath = join(urlDir, file);
		const size = statSync(filePath).size;
		if (size <= thresholdBytes) {
			console.log(
				`✓ skip ${file} (${(size / 1024 / 1024).toFixed(2)} MB ≤ threshold)`,
			);
			continue;
		}

		console.log(
			`ℹ reencoding ${file} (${(size / 1024 / 1024).toFixed(2)} MB)...`,
		);
		const result = transcodeInPlace(filePath);
		if (result.ok && !result.skipped) {
			reencoded++;
			totalBefore += result.before;
			totalAfter += result.after;
			console.log(
				`✓ ${file}: ${(result.before / 1024 / 1024).toFixed(2)} MB → ${(result.after / 1024 / 1024).toFixed(2)} MB`,
			);
		}
	}

	if (reencoded > 0) {
		const saved = totalBefore - totalAfter;
		console.log(
			`\n✓ Re-encoded ${reencoded} file(s); saved ${(saved / 1024 / 1024).toFixed(2)} MB`,
		);
	} else {
		console.log("\nℹ No files exceeded threshold; nothing re-encoded");
	}
}

main();
