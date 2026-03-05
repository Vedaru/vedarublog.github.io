#!/usr/bin/env node
/**
 * scripts/download-music.js
 *
 * Usage:
 *   node scripts/download-music.js
 *
 * Runs a Meting API request (based on src/config.ts) and downloads audio files
 * into public/music/, writes public/music/playlist.json with local URLs.
 * Intended to be run in CI (GitHub Actions) before build/deploy. It skips if
 * musicPlayerConfig.mode !== 'meting'.
 */

import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

async function clearDirectory(dirPath) {
	try {
		const files = await fs.readdir(dirPath);
		for (const file of files) {
			const filePath = path.join(dirPath, file);
			await fs.unlink(filePath);
		}
	} catch (e) {
		// ignore if directory doesn't exist or other errors
	}
}

async function transcodeAudio(
	inputPath,
	outputPath,
	codec = "libopus",
	bitrate = "64k",
) {
	// 使用ffmpeg转码音频到指定的编码和码率
	const args = [
		"-i",
		inputPath,
		"-c:a",
		codec,
		"-b:a",
		bitrate,
		"-y", // 覆盖输出文件
		outputPath,
	];

	try {
		const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
		if (result.error) {
			throw result.error;
		}
		if (result.status !== 0) {
			throw new Error(`ffmpeg exited with code ${result.status}`);
		}
		return true;
	} catch (e) {
		console.warn(`⚠ ffmpeg not available or failed: ${e.message}`);
		// 如果ffmpeg不可用，直接复制文件
		await fs.copyFile(inputPath, outputPath);
		return false;
	}
}

/**
 * Append auth cookie to a Meting API URL for VIP song access.
 * @param {string} url - The API URL
 * @param {string} cookie - The auth cookie string (e.g. "MUSIC_U=xxx")
 * @returns {string} URL with cookie parameter appended
 */
function appendAuthCookie(url, cookie) {
	if (!cookie) return url;
	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}cookie=${encodeURIComponent(cookie)}`;
}

/**
 * Resolve a single song's full URL via Meting API type=url endpoint.
 * Used as fallback when playlist API returns trial/preview URLs for VIP songs.
 * @param {string} songId - The song ID
 * @param {string[]} apiCandidates - API template candidates
 * @param {string} server - Music server (e.g. "netease")
 * @param {string} authCookie - Auth cookie string
 * @returns {Promise<string|null>} The resolved URL or null
 */
async function resolveVipSongUrl(songId, apiCandidates, server, authCookie) {
	if (!songId || !authCookie) return null;

	for (const template of apiCandidates) {
		try {
			let apiUrl;
			if (
				template.includes(":server") ||
				template.includes(":type") ||
				template.includes(":id")
			) {
				apiUrl = template
					.replace(":server", server)
					.replace(":type", "url")
					.replace(":id", songId);
			} else {
				// Direct URL format — replace type and id in query string
				const u = new URL(template);
				u.searchParams.set("type", "url");
				u.searchParams.set("id", songId);
				apiUrl = u.toString();
			}
			apiUrl = appendAuthCookie(apiUrl, authCookie);

			console.log(`  ℹ Trying to resolve VIP URL via ${apiUrl}`);
			const res = await fetchWithRetry(apiUrl, {
				timeout: 15000,
				retries: 1,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					Accept: "*/*",
					Referer: "https://music.163.com/",
				},
			});
			if (!res.ok) continue;

			const contentType = res.headers.get("content-type") || "";
			// If the response is JSON, extract the URL from it
			if (contentType.includes("json") || contentType.includes("text")) {
				const text = await res.text();
				try {
					const data = JSON.parse(text);
					// Meting type=url returns either a JSON array with {url} or a direct URL string
					if (Array.isArray(data) && data.length > 0 && data[0].url) {
						return data[0].url;
					} else if (data.url) {
						return data.url;
					}
				} catch {
					// The response might be the URL directly as plain text
					const trimmed = text.trim();
					if (trimmed.startsWith("http")) return trimmed;
				}
			} else {
				// Binary response — the API might have redirected to the actual audio
				// Return the final URL
				return res.url || null;
			}
		} catch (e) {
			console.warn(
				`  ⚠ resolveVipSongUrl failed for template: ${e.message}`,
			);
		}
	}
	return null;
}

async function safeFetch(url, opts = {}) {
	// Implement a simple timeout-aware fetch that prefers global fetch (Node 18+)
	const timeout = typeof opts.timeout === "number" ? opts.timeout : 0;

	if (typeof globalThis.fetch === "function") {
		const controller = new AbortController();
		let timer;
		if (timeout > 0) timer = setTimeout(() => controller.abort(), timeout);
		try {
			return await fetch(url, { ...opts, signal: controller.signal });
		} finally {
			if (timer) clearTimeout(timer);
		}
	}

	// Fallback to node-fetch ESM
	try {
		const nf = await import("node-fetch");
		const { default: fetchFn, AbortController: NFAbortController } = nf;
		const controller = new NFAbortController();
		let timer;
		if (timeout > 0) timer = setTimeout(() => controller.abort(), timeout);
		try {
			const res = await fetchFn(url, {
				...opts,
				signal: controller.signal,
			});
			return res;
		} finally {
			if (timer) clearTimeout(timer);
		}
	} catch (e) {
		throw new Error("No fetch available: " + e.message);
	}
}

async function fetchWithRetry(
	url,
	{ timeout = 0, headers = {}, retries = 2, backoff = 1000 } = {},
) {
	// Simple exponential-backoff retry wrapper around safeFetch
	let attempt = 0;
	let lastErr;
	while (attempt <= retries) {
		try {
			const res = await safeFetch(url, { timeout, headers });
			return res;
		} catch (e) {
			lastErr = e;
			if (attempt === retries) break;
		}
		const wait = backoff * Math.pow(2, attempt);
		await new Promise((r) => setTimeout(r, wait));
		attempt++;
	}
	throw lastErr || new Error("fetchWithRetry: unknown error");
}

(async function main() {
	try {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const projectRoot = path.resolve(__dirname, "..");
		const configPath = path.join(projectRoot, "src", "config.ts");
		const configContent = await fs.readFile(configPath, "utf-8");

		// Extract music player config snippet (lightweight parsing similar to compress-fonts.js)
		const mpMatch = configContent.match(
			/musicPlayerConfig:\s*MusicPlayerConfig\s*=\s*\{([\s\S]*?)\}/,
		);
		if (!mpMatch) {
			console.log(
				"⚠ Could not locate musicPlayerConfig in src/config.ts, exiting",
			);
			return;
		}
		const cfgStr = mpMatch[1];
		const modeMatch = cfgStr.match(/mode:\s*["']([^"']+)["']/);
		const mode = modeMatch ? modeMatch[1] : "local";
		// Allow download when mode is either 'meting' (legacy) or 'local' (preferred).
		if (
			!(mode === "meting" || mode === "local") &&
			process.env.FORCE_MUSIC_DOWNLOAD !== "1"
		) {
			console.log(
				'ℹ Music player mode is not "meting" or "local"; skipping download (set FORCE_MUSIC_DOWNLOAD=1 to override)',
			);
			return;
		}

		const authMatch = cfgStr.match(/auth:\s*["']([^"']*?)["']/);
		const meting_auth = authMatch ? authMatch[1] : "";
		if (meting_auth) {
			console.log(
				"ℹ Auth cookie configured — will pass to Meting API for VIP song access",
			);
		} else {
			console.log(
				"ℹ No auth cookie configured (config.auth is empty) — VIP songs may only download trial/preview versions",
			);
			console.log(
				"  Tip: Set auth to your MUSIC_U cookie value in src/config.ts to download full VIP songs",
			);
		}

		const apiMatch = cfgStr.match(/meting_api:\s*["']([^"']+)["']/);
		const idMatch = cfgStr.match(/id:\s*["']([^"']+)["']/);
		const serverMatch = cfgStr.match(/server:\s*["']([^"']+)["']/);
		const typeMatch = cfgStr.match(/type:\s*["']([^"']+)["']/);

		let meting_api = apiMatch ? apiMatch[1] : "";
		const meting_id = idMatch ? idMatch[1] : "28364371";
		const meting_server = serverMatch ? serverMatch[1] : "netease";
		const meting_type = typeMatch ? typeMatch[1] : "playlist";

		const template =
			meting_api ||
			"https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id";

		// Build candidate list: meting_api_candidates (if present) -> meting_api -> default
		const candidates = [];
		const candMatch = cfgStr.match(
			/meting_api_candidates:\s*\[([\s\S]*?)\]/,
		);
		if (candMatch) {
			const inner = candMatch[1];
			const urls = Array.from(inner.matchAll(/["']([^"']+)["']/g))
				.map((m) => m[1])
				.filter(Boolean);
			urls.forEach((u) => candidates.push(u));
		}
		if (meting_api) candidates.push(meting_api);
		const defaultTemplate =
			"https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id";
		if (candidates.length === 0) candidates.push(defaultTemplate);

		let response;
		let lastErr;
		for (const templateCandidate of candidates) {
			let candidateUrl =
				templateCandidate.includes(":server") ||
				templateCandidate.includes(":type") ||
				templateCandidate.includes(":id")
					? templateCandidate
							.replace(":server", meting_server)
							.replace(":type", meting_type)
							.replace(":id", meting_id)
					: templateCandidate;

			// Append auth cookie to API URL for VIP song access
			candidateUrl = appendAuthCookie(candidateUrl, meting_auth);

			console.log(
				"ℹ Fetching playlist from",
				candidateUrl.replace(/cookie=[^&]+/, "cookie=***"),
			);
			try {
				response = await fetchWithRetry(candidateUrl, {
					timeout: 20000,
					retries: 2,
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
						Accept: "application/json, text/plain, */*",
						Referer: "https://music.163.com/",
					},
				});
				if (response.ok) break;
				lastErr = new Error(
					"Meting API request failed: " + response.status,
				);
				console.warn(
					`⚠ Meting API ${candidateUrl} returned ${response.status}`,
				);
			} catch (e) {
				console.warn(`⚠ Error fetching ${candidateUrl}: ${e.message}`);
				lastErr = e;
			}
		}

		if (!response || !response.ok)
			throw lastErr || new Error("Meting API request failed");
		const playlist = await response.json();
		if (!Array.isArray(playlist) || playlist.length === 0) {
			console.log("⚠ Empty playlist, nothing to download");
			return;
		}

		const outDir = path.join(projectRoot, "public", "assets", "music");
		const urlDir = path.join(outDir, "url");
		const coverDir = path.join(outDir, "cover");
		await fs.mkdir(urlDir, { recursive: true });
		await fs.mkdir(coverDir, { recursive: true });

		// Clear existing files in url and cover directories, and remove playlist.json
		await clearDirectory(urlDir);
		await clearDirectory(coverDir);
		const playlistPath = path.join(outDir, "playlist.json");
		try {
			await fs.unlink(playlistPath);
		} catch (e) {} // ignore if not exists

		// Try to load a transliteration helper to convert Unicode titles into ASCII-friendly text.
		// If unavailable, fall back to a simple NFKD decomposition to strip diacritics.
		let transliterateFn = (s) => (s && s.toString ? s.toString() : "");
		try {
			const mod = await import("transliteration");
			if (mod && typeof mod.transliterate === "function")
				transliterateFn = mod.transliterate;
		} catch (e) {
			transliterateFn = (s) =>
				s && s.toString
					? s
							.toString()
							.normalize("NFKD")
							.replace(/[\u0300-\u036f]/g, "")
					: "";
		}

		const result = [];
		for (let i = 0; i < playlist.length; i++) {
			const song = playlist[i];
			const title = (song.name || song.title || `song-${i}`).toString();
			const id = song.id ? song.id.toString() : String(i);
			const ext = ".opus"; // 转码后统一使用Opus格式
			// Decode percent-encoded titles first
			let decodedTitle = title;
			try {
				decodedTitle = decodeURIComponent(title);
			} catch (e) {
				// ignore if title is not percent-encoded
			}

			// Transliterate unicode to ASCII where possible
			let asciiTitle = transliterateFn(decodedTitle);

			// Remove remaining non-ASCII and unsafe characters
			let safeTitle = asciiTitle
				.replace(/[^\\x00-\\x7F]/g, "")
				.replace(/[\\/:*?"<>|#%&]/g, "-");
			// Normalize dashes and trim
			safeTitle = safeTitle
				.replace(/-+/g, "-")
				.replace(/^-|-$/g, "")
				.slice(0, 120);

			// If still empty, try deriving a filename-safe name from the source URL
			if (!safeTitle) {
				try {
					const urlPath = new URL(song.url).pathname;
					const base = path.basename(urlPath);
					const nameFromUrl = base.replace(/\.[^/.]+$/, "");
					let decName = decodeURIComponent(nameFromUrl || "");
					decName = transliterateFn(decName);
					safeTitle = decName
						.replace(/[\\/:*?"<>|#%&]/g, "-")
						.replace(/-+/g, "-")
						.replace(/^-|-$/g, "")
						.slice(0, 120);
				} catch (e) {
					// ignore
				}
			}

			if (!safeTitle) safeTitle = "untitled";
			const namePart = safeTitle ? `-${safeTitle}` : "";
			const filename = `${id}${namePart}${ext}`;
			const filepath = path.join(urlDir, filename);

			if (!song.url) {
				console.warn(`⚠ Song ${title} has no URL, skipping`);
				continue;
			}

			// Avoid re-downloading if already present
			if (!fssync.existsSync(filepath)) {
				let downloadUrl = song.url;
				try {
					console.log(`ℹ Downloading ${title} from ${downloadUrl}`);
					const r = await fetchWithRetry(downloadUrl, {
						timeout: 30000,
						retries: 2,
						headers: {
							"User-Agent":
								"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
							Accept: "*/*",
							Referer: "https://music.163.com/",
						},
					});
					if (!r.ok) {
						console.warn(
							`⚠ Failed to download ${downloadUrl}: ${r.status}`,
						);
						continue;
					}
					const arrayBuf = await r.arrayBuffer();
					const buf = Buffer.from(arrayBuf);
					await fs.writeFile(filepath, buf);

					// === File size validation: detect trial/preview VIP songs ===
					const sizeKB = buf.length / 1024;
					if (sizeKB < 500) {
						// Files under 500KB are very likely trial versions (30s preview)
						console.warn(
							`⚠ ${filename} is only ${sizeKB.toFixed(1)}KB — likely a trial/preview version`,
						);
						if (meting_auth && song.id) {
							console.log(
								`  ℹ Attempting to resolve full VIP URL via type=url endpoint...`,
							);
							const fullUrl = await resolveVipSongUrl(
								song.id.toString(),
								candidates,
								meting_server,
								meting_auth,
							);
							if (fullUrl && fullUrl !== downloadUrl) {
								console.log(
									`  ℹ Re-downloading from resolved URL: ${fullUrl}`,
								);
								const r2 = await fetchWithRetry(fullUrl, {
									timeout: 30000,
									retries: 2,
									headers: {
										"User-Agent":
											"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
										Accept: "*/*",
										Referer: "https://music.163.com/",
									},
								});
								if (r2.ok) {
									const buf2 = Buffer.from(
										await r2.arrayBuffer(),
									);
									if (buf2.length > buf.length) {
										await fs.writeFile(filepath, buf2);
										console.log(
											`  ✓ Re-downloaded full version: ${(buf2.length / 1024).toFixed(1)}KB`,
										);
									} else {
										console.warn(
											`  ⚠ Resolved URL did not yield a larger file, keeping original`,
										);
									}
								} else {
									console.warn(
										`  ⚠ Failed to re-download from resolved URL: ${r2.status}`,
									);
								}
							} else {
								console.warn(
									`  ⚠ Could not resolve a different full URL for this VIP song`,
								);
								if (!meting_auth) {
									console.warn(
										`  Tip: Configure auth cookie in src/config.ts to access full VIP songs`,
									);
								}
							}
						} else if (!meting_auth) {
							console.warn(
								`  Tip: Configure auth cookie (MUSIC_U) in src/config.ts to download full VIP songs`,
							);
						}
					} else {
						console.log(
							`✓ Saved ${filename} (${sizeKB.toFixed(1)}KB)`,
						);
					}
				} catch (e) {
					console.warn(
						`⚠ Error downloading ${downloadUrl}: ${e.message}`,
					);
					continue;
				}
			} else {
				console.log(`ℹ Skipping existing file ${filename}`);
			}

			// 转码音频文件到Opus编码，64kbps码率
			const tempFile = filepath + ".temp";
			const transcodeSuccess = await transcodeAudio(
				filepath,
				tempFile,
				"libopus",
				"64k",
			);
			if (transcodeSuccess) {
				// 转码成功，使用转码后的文件
				await fs.rename(tempFile, filepath);
				console.log(`✓ Transcoded ${filename} to Opus 64kbps`);
			} else {
				// 转码失败，删除临时文件
				try {
					await fs.unlink(tempFile);
				} catch (e) {}
			}

			// 直接使用转码后的文件，无需额外处理
			let usedFilename = filename;
			let targetUrl = `/assets/music/url/${filename}`;

			// Download cover image if available
			let coverUrl = "";
			if (song.pic) {
				const coverFilename = `${id}-${safeTitle}.jpg`; // Assume jpg for covers
				const coverPath = path.join(coverDir, coverFilename);
				if (!fssync.existsSync(coverPath)) {
					try {
						console.log(
							`ℹ Downloading cover for ${title} from ${song.pic}`,
						);
						const r = await fetchWithRetry(song.pic, {
							timeout: 30000,
							retries: 2,
							headers: {
								"User-Agent":
									"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
								Accept: "image/*",
								Referer: "https://music.163.com/",
							},
						});
						if (r.ok) {
							const arrayBuf = await r.arrayBuffer();
							await fs.writeFile(
								coverPath,
								Buffer.from(arrayBuf),
							);
							console.log(`✓ Saved cover ${coverFilename}`);
							coverUrl = `/assets/music/cover/${coverFilename}`;
						} else {
							console.warn(
								`⚠ Failed to download cover ${song.pic}: ${r.status}`,
							);
							coverUrl = song.pic; // fallback to original URL
						}
					} catch (e) {
						console.warn(
							`⚠ Error downloading cover ${song.pic}: ${e.message}`,
						);
						coverUrl = song.pic; // fallback to original URL
					}
				} else {
					console.log(`ℹ Skipping existing cover ${coverFilename}`);
					coverUrl = `/assets/music/cover/${coverFilename}`;
				}
			}

			result.push({
				name: title,
				artist: song.artist || song.author || "",
				url: targetUrl,
				cover: coverUrl,
				lrc: song.lrc || "",
				id: song.id || "",
			});
		}

		const outJson = path.join(outDir, "playlist.json");
		await fs.writeFile(outJson, JSON.stringify(result, null, 2), "utf-8");
		console.log(`✓ Wrote ${outJson} with ${result.length} songs`);
		// Also write a compatibility copy to /public/music/playlist.json so themes that
		// expect the classic location (Mizuki) can find it via /music/playlist.json
		const legacyMusicDir = path.join(projectRoot, "public", "music");
		await fs.mkdir(legacyMusicDir, { recursive: true });
		const legacyOut = path.join(legacyMusicDir, "playlist.json");
		await fs.writeFile(legacyOut, JSON.stringify(result, null, 2), "utf-8");
		console.log(`✓ Wrote compatibility copy ${legacyOut}`);
	} catch (e) {
		console.error("Error:", e && e.message ? e.message : e);
		process.exit(1);
	}
})();

