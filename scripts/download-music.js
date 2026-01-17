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

const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');

async function safeFetch(url, opts) {
  if (global.fetch) {
    return global.fetch(url, opts);
  }
  // Fallback to node-fetch if running on older Node
  try {
    const nf = await import('node-fetch');
    return nf.default(url, opts);
  } catch (e) {
    throw new Error('No fetch available: ' + e.message);
  }
}

(async function main() {
  try {
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
    if (mode !== 'meting') {
      console.log('ℹ Music player mode is not "meting"; skipping download');
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
    const apiUrl = (template.includes(':server') || template.includes(':type') || template.includes(':id'))
      ? template.replace(':server', meting_server).replace(':type', meting_type).replace(':id', meting_id)
      : template;

    console.log('ℹ Fetching playlist from', apiUrl);
    const response = await safeFetch(apiUrl, { timeout: 20000 });
    if (!response.ok) throw new Error('Meting API request failed: ' + response.status);
    const playlist = await response.json();
    if (!Array.isArray(playlist) || playlist.length === 0) {
      console.log('⚠ Empty playlist, nothing to download');
      return;
    }

    const outDir = path.join(projectRoot, 'public', 'music');
    await fs.mkdir(outDir, { recursive: true });

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
          const r = await safeFetch(song.url);
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

      result.push({
        name: title,
        artist: song.artist || song.author || '',
        url: `/music/${filename}`,
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
