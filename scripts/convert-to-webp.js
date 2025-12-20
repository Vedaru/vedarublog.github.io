#!/usr/bin/env node
/*
Convert all PNG and JPG images in the project to WebP format and delete originals.
Usage: node scripts/convert-to-webp.js
*/

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory of the project (assuming script is in scripts/)
const rootDir = path.resolve(__dirname, '..');

async function findImages(dir) {
  const images = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        images.push(...await findImages(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        images.push(fullPath);
      }
    }
  }

  return images;
}

async function convertToWebP(inputPath) {
  const parsedPath = path.parse(inputPath);
  const outputPath = path.join(parsedPath.dir, parsedPath.name + '.webp');

  try {
    await sharp(inputPath)
      .webp({ quality: 80 }) // Adjust quality as needed
      .toFile(outputPath);

    console.log(`Converted: ${inputPath} -> ${outputPath}`);

    // Delete original
    await fs.unlink(inputPath);
    console.log(`Deleted original: ${inputPath}`);
  } catch (error) {
    console.error(`Error converting ${inputPath}:`, error.message);
  }
}

async function main() {
  console.log('Finding PNG and JPG images...');
  const images = await findImages(rootDir);
  console.log(`Found ${images.length} images to convert.`);

  for (const image of images) {
    await convertToWebP(image);
  }

  console.log('Conversion complete.');
}

main().catch(console.error);