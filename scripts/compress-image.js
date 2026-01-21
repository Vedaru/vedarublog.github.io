#!/usr/bin/env node
/*
Compress an image (WebP/other) to a target size using sharp.
Usage: node scripts/compress-image.js <inputPath> [--out <outPath>] [--targetKB 200]

The script will make a backup of the original as <file>.bak if it overwrites the file.
*/

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const argv = process.argv.slice(2);
if (!argv[0]) {
  console.error('Usage: node scripts/compress-image.js <inputPath> [--out <outPath>] [--targetKB 200]');
  process.exit(1);
}

const inputPath = argv[0];
let outPath = null;
let targetKB = 200;
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--out' && argv[i+1]) { outPath = argv[i+1]; i++; }
  else if (argv[i] === '--targetKB' && argv[i+1]) { targetKB = Number(argv[i+1]); i++; }
}
const targetBytes = targetKB * 1024;

async function main() {
  const stat = await fs.stat(inputPath);
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath);

  if (!outPath) {
    // we will write to a temporary file and then overwrite original after backup
    outPath = path.join(dir, base + '.compressed');
  }

  // backup
  const bakPath = inputPath + '.bak';
  await fs.copyFile(inputPath, bakPath);
  console.log(`Backup saved to ${bakPath}`);

  // read image and metadata
  let img = sharp(inputPath, { animated: false });
  const meta = await img.metadata();
  let width = meta.width || null;
  let height = meta.height || null;

  console.log(`Original size: ${stat.size} bytes; dimensions: ${width}x${height}`);

  // try lowering quality first
  let success = false;
  let bestBuffer = null;
  let bestInfo = null;

  const qualitySteps = [75, 65, 55, 45, 35, 25];

  for (const q of qualitySteps) {
    try {
      const buf = await img.webp({ quality: q }).toBuffer();
      console.log(`Tried quality=${q}, size=${buf.length}`);
      if (buf.length <= targetBytes) {
        await fs.writeFile(outPath, buf);
        success = true;
        console.log(`Success with quality=${q}, wrote to ${outPath}`);
        break;
      }
      if (!bestBuffer || buf.length < bestBuffer.length) {
        bestBuffer = buf;
      }
    } catch (e) {
      console.error('Error encoding at quality', q, e.message);
    }
  }

  // if not successful, try reducing dimensions gradually
  if (!success) {
    // start scaling factor
    let scale = 0.9;
    let currentWidth = width;
    while (scale >= 0.3) {
      const newW = currentWidth ? Math.round(currentWidth * scale) : null;
      if (!newW) break;
      try {
        const buf = await img.resize({ width: newW }).webp({ quality: 55 }).toBuffer();
        console.log(`Tried width=${newW}, size=${buf.length}`);
        if (buf.length <= targetBytes) {
          await fs.writeFile(outPath, buf);
          success = true;
          console.log(`Success with width=${newW}, wrote to ${outPath}`);
          break;
        }
        if (!bestBuffer || buf.length < bestBuffer.length) bestBuffer = buf;
      } catch (e) {
        console.error('Error re-encoding after resize', e.message);
      }
      scale -= 0.1;
    }
  }

  if (!success && bestBuffer) {
    // fallback: write the smallest we found
    await fs.writeFile(outPath, bestBuffer);
    console.log(`Could not reach target; wrote smallest result ${bestBuffer.length} bytes to ${outPath}`);
  }

  // if we wrote a .compressed file, replace original
  if (outPath.endsWith('.compressed')) {
    const finalStat = await fs.stat(outPath);
    console.log(`Final file size: ${finalStat.size} bytes`);
    // move to original
    await fs.rename(outPath, inputPath);
    console.log(`Replaced original ${inputPath} with compressed version (original backed up to ${bakPath})`);
  }
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
