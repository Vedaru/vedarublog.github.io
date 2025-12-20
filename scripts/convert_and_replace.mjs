import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const root = process.cwd();
const skipDirs = new Set(["node_modules", ".git"]);
const imageExts = [".jpg", ".jpeg"];
const textFileExts = new Set([
  ".md",
  ".mdx",
  ".astro",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".html",
  ".svelte",
  ".json",
  ".jsonc",
  ".css",
  ".scss",
  ".yml",
  ".yaml",
]);

async function walk(dir, cb) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, cb);
    } else if (ent.isFile()) {
      await cb(full);
    }
  }
}

async function convertImages() {
  const converted = [];
  await walk(root, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!imageExts.includes(ext)) return;
    // skip files in .git or node_modules (already skipped)
    const out = file.slice(0, -ext.length) + ".webp";
    try {
      // create dir if needed
      await fs.mkdir(path.dirname(out), { recursive: true });
      await sharp(file).webp({ quality: 80 }).toFile(out);
      converted.push({ src: file, out });
      console.log(`Converted: ${path.relative(root, file)} -> ${path.relative(root, out)}`);
    } catch (e) {
      console.error(`Failed to convert ${file}:`, e.message);
    }
  });
  return converted;
}

function replaceJpgWithWebpInText(content) {
  // Replace .jpg or .jpeg preceding optional querystring or punctuation
  // Use a regex that avoids touching words that aren't filenames (best-effort)
  return content.replace(/\.jpe?g/gi, ".webp");
}

async function replaceReferences() {
  let changedFiles = 0;
  await walk(root, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!textFileExts.has(ext)) return;
    // skip this script
    if (file.includes("scripts" + path.sep + "convert_and_replace.mjs")) return;
    try {
      const raw = await fs.readFile(file, "utf8");
      const replaced = replaceJpgWithWebpInText(raw);
      if (replaced !== raw) {
        await fs.writeFile(file, replaced, "utf8");
        changedFiles++;
        console.log(`Updated refs in: ${path.relative(root, file)}`);
      }
    } catch (e) {
      console.error(`Failed to process ${file}:`, e.message);
    }
  });
  return changedFiles;
}

async function main() {
  console.log(`Starting JPG -> WebP conversion in ${root}`);
  const conv = await convertImages();
  console.log(`Converted ${conv.length} images.`);
  console.log(`Replacing references in text files...`);
  const changed = await replaceReferences();
  console.log(`Updated references in ${changed} files.`);
  console.log("Done. Note: original JPG/JPEG files are kept alongside new WebP files.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
