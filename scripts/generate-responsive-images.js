/*
Generate responsive image variants using sharp.
- Scans `public/images` (excluding `_gen`) for images
- Generates resized WebP variants for widths: 320, 480, 768, 1024, 1600
- Writes files to `public/_gen/<originalname>-w<width>.webp` and a manifest

Run with: node scripts/generate-responsive-images.js
*/

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const publicImagesDir = path.resolve('public', 'images');
const outDir = path.resolve('public', '_gen');
const manifestPath = path.join(outDir, 'manifest.json');
const widths = [320, 480, 768, 1024, 1600];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generate() {
  await ensureDir(outDir);
  const files = await fs.readdir(publicImagesDir);
  const manifest = {};

  for (const file of files) {
    if (file.startsWith('.') || file === '_gen') continue;
    const srcPath = path.join(publicImagesDir, file);
    const stat = await fs.stat(srcPath);
    if (!stat.isFile()) continue;

    try {
      const img = sharp(srcPath);
      const metadata = await img.metadata();
      const basename = path.parse(file).name;

      manifest[`/images/${file}`] = {
        original: `/images/${file}`,
        variants: []
      };

      for (const w of widths) {
        if (metadata.width && w > metadata.width) break;
        const outName = `${basename}-w${w}.webp`;
        const outPath = path.join(outDir, outName);
        await img.resize({ width: w }).webp({ quality: 80 }).toFile(outPath);
        manifest[`/images/${file}`].variants.push({
          src: `/_gen/${outName}`,
          width: w,
        });
      }

      // also write a reasonably sized fallback (same format as original) at max 1600px
      const fallbackWidth = Math.min(metadata.width || 1600, 1600);
      const fallbackName = `${basename}-fallback.webp`;
      const fallbackPath = path.join(outDir, fallbackName);
      await img.resize({ width: fallbackWidth }).webp({ quality: 85 }).toFile(fallbackPath);
      manifest[`/images/${file}`].fallback = `/_gen/${fallbackName}`;

      console.log(`Processed ${file} -> ${manifest[`/images/${file}`].variants.length} variants`);
    } catch (e) {
      console.error(`Failed processing ${file}:`, e.message);
    }
  }

  // write manifest
  // note: we expose files under `/__gen/` (served from `public/_gen`)
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Written manifest to ${manifestPath}`);
}

generate().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
