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

import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

async function getFfmpegBinary() {
  // Try ffmpeg-static first
  try {
    const mod = await import('ffmpeg-static');
    const ff = mod?.default || mod;
    if (ff) return ff;
  } catch (e) {}

  // Fallback to system ffmpeg
  try {
    const r = spawnSync('ffmpeg', ['-version']);
    if (r.status === 0) return 'ffmpeg';
  } catch (e) {}

  return null;
}

async function safeFetch(url, opts = {}) {
  // Implement a simple timeout-aware fetch that prefers global fetch (Node 18+)
  const timeout = typeof opts.timeout === 'number' ? opts.timeout : 0;

  if (typeof globalThis.fetch === 'function') {
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
    const nf = await import('node-fetch');
    const { default: fetchFn, AbortController: NFAbortController } = nf;
    const controller = new NFAbortController();
    let timer;
    if (timeout > 0) timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetchFn(url, { ...opts, signal: controller.signal });
      return res;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (e) {
    throw new Error('No fetch available: ' + e.message);
  }
}

async function fetchWithRetry(url, { timeout = 0, headers = {}, retries = 2, backoff = 1000 } = {}) {
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
  throw lastErr || new Error('fetchWithRetry: unknown error');
}

(async function main() {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(__dirname, '..');
    const configPath = path.join(projectRoot, 'src', 'config.ts');
    const configContent = await fs.readFile(configPath, 'utf-8');

    // Extract music player config snippet (lightweight parsing similar to compress-fonts.js)
    const mpMatch = configContent.match(/musicPlayerConfig:\s*MusicPlayerConfig\s*=\s*\{([\s\S]*?)\}/);
    if (!mpMatch) {
      console.log('⚠ Could not locate musicPlayerConfig in src/config.ts, exiting');
      return;
    }
    const cfgStr = mpMatch[1];
    const modeMatch = cfgStr.match(/mode:\s*["']([^"']+)["']/);
    const mode = modeMatch ? modeMatch[1] : 'meting';
    if (mode !== 'meting' && process.env.FORCE_MUSIC_DOWNLOAD !== '1') {
      console.log('ℹ Music player mode is not "meting"; skipping download (set FORCE_MUSIC_DOWNLOAD=1 to override)');
      return;
    }

    const apiMatch = cfgStr.match(/meting_api:\s*["']([^"']+)["']/);
    const idMatch = cfgStr.match(/id:\s*["']([^"']+)["']/);
    const serverMatch = cfgStr.match(/server:\s*["']([^"']+)["']/);
    const typeMatch = cfgStr.match(/type:\s*["']([^"']+)["']/);

    let meting_api = apiMatch ? apiMatch[1] : '';
    const meting_id = idMatch ? idMatch[1] : '28364371';
    const meting_server = serverMatch ? serverMatch[1] : 'netease';
    const meting_type = typeMatch ? typeMatch[1] : 'playlist';

    const template = meting_api || 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id';

    // Build candidate list: meting_api_candidates (if present) -> meting_api -> default
    const candidates = [];
    const candMatch = cfgStr.match(/meting_api_candidates:\s*\[([\s\S]*?)\]/);
    if (candMatch) {
      const inner = candMatch[1];
      const urls = Array.from(inner.matchAll(/["']([^"']+)["']/g)).map((m) => m[1]).filter(Boolean);
      urls.forEach((u) => candidates.push(u));
    }
    if (meting_api) candidates.push(meting_api);
    const defaultTemplate = 'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id';
    if (candidates.length === 0) candidates.push(defaultTemplate);

    let response;
    let lastErr;
    for (const templateCandidate of candidates) {
      const candidateUrl = (templateCandidate.includes(':server') || templateCandidate.includes(':type') || templateCandidate.includes(':id'))
        ? templateCandidate.replace(':server', meting_server).replace(':type', meting_type).replace(':id', meting_id)
        : templateCandidate;

      console.log('ℹ Fetching playlist from', candidateUrl);
      try {
        response = await fetchWithRetry(candidateUrl, {
          timeout: 20000,
          retries: 2,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; VedaruMusicDownloader/1.0; +https://vedaru.cn)',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://vedaru.cn'
          }
        });
        if (response.ok) break;
        lastErr = new Error('Meting API request failed: ' + response.status);
        console.warn(`⚠ Meting API ${candidateUrl} returned ${response.status}`);
      } catch (e) {
        console.warn(`⚠ Error fetching ${candidateUrl}: ${e.message}`);
        lastErr = e;
      }
    }

    if (!response || !response.ok) throw lastErr || new Error('Meting API request failed');
    const playlist = await response.json();
    if (!Array.isArray(playlist) || playlist.length === 0) {
      console.log('⚠ Empty playlist, nothing to download');
      return;
    }

    const outDir = path.join(projectRoot, 'public', 'music');
    await fs.mkdir(outDir, { recursive: true });

    const ffmpegBinaryRaw = await getFfmpegBinary();
    // Verify the binary exists and is executable (some environments may return unrelated paths)
    let ffmpegBinary = null;
    try {
      if (ffmpegBinaryRaw) {
        const looksLikePath = path.isAbsolute(ffmpegBinaryRaw) || ffmpegBinaryRaw.includes(path.sep) || /^[A-Za-z]:\\/.test(ffmpegBinaryRaw);
        if (looksLikePath) {
          // Treat as file path: check existence and execute permission
          if (fssync.existsSync(ffmpegBinaryRaw)) {
            try {
              fssync.accessSync(ffmpegBinaryRaw, fssync.constants.X_OK);
              ffmpegBinary = ffmpegBinaryRaw;
            } catch (e) {
              console.warn('⚠ ffmpeg binary path found but not executable or access denied:', ffmpegBinaryRaw);
            }
          } else {
            // Try to rebuild ffmpeg-static (pnpm) to obtain binary if possible
            if (!process.env.SKIP_FFMPEG_STATIC_REBUILD) {
              try {
                console.log('ℹ ffmpeg-static path missing; attempting `pnpm rebuild ffmpeg-static` to restore binary...');
                const rebuild = spawnSync('pnpm', ['rebuild', 'ffmpeg-static'], { encoding: 'utf-8' });
                if (rebuild && rebuild.status === 0) {
                  if (fssync.existsSync(ffmpegBinaryRaw)) {
                    try { fssync.accessSync(ffmpegBinaryRaw, fssync.constants.X_OK); ffmpegBinary = ffmpegBinaryRaw; }
                    catch (e) { /* fallthrough */ }
                  }
                } else {
                  console.log(`ℹ pnpm rebuild ffmpeg-static failed or returned non-zero. stdout='${(rebuild && rebuild.stdout)||''}', stderr='${(rebuild && rebuild.stderr)||''}'`);
                }
              } catch (rebuildErr) {
                console.log('⚠ Failed to run pnpm rebuild ffmpeg-static:', rebuildErr && rebuildErr.message ? rebuildErr.message : rebuildErr);
              }
            }

            if (!ffmpegBinary) {
              if (!process.env.QUIET_FFMPEG_STATIC_WARN) {
                console.info('⚠ ffmpeg-static returned a non-existing path:', ffmpegBinaryRaw, '\nHint: run `pnpm approve-builds` and `pnpm rebuild ffmpeg-static` locally, or install system ffmpeg and set $env:FORCE_SYSTEM_FFMPEG=1 to use it instead.');
              } else {
                console.log('ℹ ffmpeg-static path missing (suppressed warning). Set $env:QUIET_FFMPEG_STATIC_WARN=0 to re-enable the hint.');
              }
            }
          }
        } else {
          // Treat as command name (e.g., 'ffmpeg'): validate by running it
          try {
            const check = spawnSync(ffmpegBinaryRaw, ['-version']);
            if (check && check.status === 0) {
              ffmpegBinary = ffmpegBinaryRaw; // command is usable
            } else {
              console.warn('⚠ ffmpeg command returned non-zero when checking version:', ffmpegBinaryRaw, check && check.stderr ? check.stderr.toString().slice(0,200) : null);
            }
          } catch (e) {
            console.warn('⚠ Error while checking ffmpeg command:', e && e.message ? e.message : e);
          }
        }
      }
    } catch (e) {
      console.warn('⚠ Error while validating ffmpeg binary:', e && e.message ? e.message : e);
    }

    const enableConvert = (ffmpegBinary || process.env.FORCE_SYSTEM_FFMPEG === '1') && process.env.SKIP_AUDIO_CONVERT !== '1';
    if (enableConvert) console.log('ℹ Audio conversion enabled; ffmpeg binary (validated):', ffmpegBinary || 'using system ffmpeg in PATH');
    else console.log('ℹ Audio conversion disabled or no ffmpeg available');

    const result = [];
    for (let i = 0; i < playlist.length; i++) {
      const song = playlist[i];
      const title = (song.name || song.title || `song-${i}`).toString();
      const id = song.id ? song.id.toString() : String(i);
      const ext = (song.url && song.url.split('.').pop() && song.url.split('?')[0].endsWith('.mp3')) ? '.mp3' : '.mp3';
      const safeTitle = title.replace(/[\\/:*?"<>|#%&]/g, '-').slice(0, 120);
      const filename = `${id}-${safeTitle}${ext}`;
      const filepath = path.join(outDir, filename);

      if (!song.url) {
        console.warn(`⚠ Song ${title} has no URL, skipping`);
        continue;
      }

      // Avoid re-downloading if already present
      if (!fssync.existsSync(filepath)) {
        try {
          console.log(`ℹ Downloading ${title} from ${song.url}`);
          const r = await fetchWithRetry(song.url, {
            timeout: 30000,
            retries: 2,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; VedaruMusicDownloader/1.0; +https://vedaru.cn)',
              'Accept': '*/*',
              'Referer': 'https://vedaru.cn'
            }
          });
          if (!r.ok) { console.warn(`⚠ Failed to download ${song.url}: ${r.status}`); continue; }
          const arrayBuf = await r.arrayBuffer();
          await fs.writeFile(filepath, Buffer.from(arrayBuf));
          console.log(`✓ Saved ${filename}`);
        } catch (e) {
          console.warn(`⚠ Error downloading ${song.url}: ${e.message}`);
          continue;
        }
      } else {
        console.log(`ℹ Skipping existing file ${filename}`);
      }

      // Convert to m4a if ffmpeg is available
      let usedFilename = filename;
      let targetUrl = `/music/${filename}`;
      if (enableConvert) {
        const m4aFilename = `${id}-${safeTitle}.m4a`;
        const m4aPath = path.join(outDir, m4aFilename);
        try {
          // Ensure input file exists and has reasonable size
          const stat = await fs.stat(filepath).catch(() => null);
          if (!stat || stat.size < 1024) {
            console.warn(`⚠ Skipping conversion for ${filename}: file missing or too small (${stat ? stat.size : 'n/a'} bytes)`);
          } else {
            const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', filepath, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', m4aPath];

            // Prefer ffmpegBinary if provided, otherwise directly try system ffmpeg
            let r = null;
            if (ffmpegBinary) {
              try {
                r = spawnSync(ffmpegBinary, args, { encoding: 'utf-8' });
              } catch (spawnErr) {
                r = { status: null, error: spawnErr, stderr: spawnErr && spawnErr.message };
              }

              if (r && r.status === 0) {
                console.log(`✓ Converted ${filename} -> ${m4aFilename} (via ffmpegBinary)`);
                try { await fs.unlink(filepath); } catch (e) {}
                usedFilename = m4aFilename;
                targetUrl = `/music/${m4aFilename}`;
                continue; // done
              }

              console.warn(`⚠ ffmpeg (preferred) failed to convert ${filename}. status=${r ? r.status : 'null'}, error=${r && r.error ? r.error.message : 'none'}, stderr='${(r && r.stderr ? r.stderr.toString() : '').slice(0,400)}'`);
            }

            // Try system ffmpeg in PATH
            try {
              let r2 = null;
              try {
                r2 = spawnSync('ffmpeg', args, { encoding: 'utf-8' });
              } catch (spawnErr2) {
                r2 = { status: null, error: spawnErr2, stderr: spawnErr2 && spawnErr2.message };
              }

              if (r2 && r2.status === 0) {
                console.log(`✓ Converted ${filename} -> ${m4aFilename} (via ffmpeg in PATH)`);
                try { await fs.unlink(filepath); } catch (e) {}
                usedFilename = m4aFilename;
                targetUrl = `/music/${m4aFilename}`;
              } else {
                console.warn(`⚠ ffmpeg (system) also failed for ${filename}. status=${r2 ? r2.status : 'null'}, error=${r2 && r2.error ? r2.error.message : 'none'}, stderr='${(r2 && r2.stderr ? r2.stderr.toString() : '').slice(0,400)}'`);
              }
            } catch (e2) {
              console.warn(`⚠ Conversion fallback error for ${filename}: ${e2.message}`);
            }
          }
        } catch (e) {
          console.warn(`⚠ Conversion error for ${filename}: ${e.message}`);
        }
      }

      result.push({
        name: title,
        artist: song.artist || song.author || '',
        url: targetUrl,
        cover: song.pic || '',
        lrc: song.lrc || '',
        id: song.id || ''
      });
    }

    const outJson = path.join(outDir, 'playlist.json');
    await fs.writeFile(outJson, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✓ Wrote ${outJson} with ${result.length} songs`);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
