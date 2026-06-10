/**
 * 构建时从 @iconify-json 提取 Svelte 组件用到的图标，生成小子集文件供 Vite 打包。
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { icons as fa6Solid } from "@iconify-json/fa6-solid";
import { icons as materialSymbols } from "@iconify-json/material-symbols";
import { icons as mdi } from "@iconify-json/mdi";
import { getIcons } from "@iconify/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MATERIAL_SYMBOLS_ICONS = [
	"search",
	"format-list-bulleted",
	"close",
	"article-outline",
	"error",
	"progress-activity",
	"music-note",
	"pause",
	"play-arrow",
	"visibility-off",
	"expand-less",
	"queue-music",
	"shuffle",
	"skip-previous",
	"skip-next",
	"repeat-one",
	"repeat",
	"volume-off",
	"volume-down",
	"volume-up",
	"expand-more",
	"graphic-eq",
	"wb-sunny-outline-rounded",
	"dark-mode-outline-rounded",
	"image-outline",
	"wallpaper",
	"hide-image-outline",
	"check",
	"link",
	"download",
];

const MDI_ICONS = ["pin"];
const FA6_SOLID_ICONS = ["chevron-right", "arrow-rotate-left"];

const subset = {
	materialSymbols: getIcons(materialSymbols, MATERIAL_SYMBOLS_ICONS),
	mdi: getIcons(mdi, MDI_ICONS),
	fa6Solid: getIcons(fa6Solid, FA6_SOLID_ICONS),
};

const outPath = join(root, "src/lib/iconify-subset.json");
writeFileSync(outPath, `${JSON.stringify(subset, null, 2)}\n`, "utf8");
console.log(`Generated ${outPath}`);

