import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const origin =
	process.env.CLOUDFLARE_ORIGIN?.replace(/\/$/, "") ||
	"https://vedarublog-github-io.pages.dev";

const distDir = join(process.cwd(), "dist");
mkdirSync(distDir, { recursive: true });

writeFileSync(
	join(distDir, "_redirects"),
	`/*  ${origin}/:splat  200!\n`,
	"utf8",
);

console.log(`[netlify-proxy] CDN 回源地址: ${origin}`);
