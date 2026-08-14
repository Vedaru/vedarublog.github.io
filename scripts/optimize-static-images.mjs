import { existsSync, mkdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function logSize(label, filePath) {
	if (!existsSync(filePath)) {
		console.warn(`[images] skip missing: ${filePath}`);
		return;
	}
	const bytes = statSync(filePath).size;
	console.log(
		`[images] ${label}: ${(bytes / 1024).toFixed(1)} KB → ${filePath}`,
	);
}

async function writeWebp(input, output, { width, height, quality = 80 }) {
	mkdirSync(dirname(output), { recursive: true });
	let pipeline = sharp(input, { animated: false }).resize(width, height, {
		fit: "cover",
		position: "centre",
	});
	await pipeline.webp({ quality, effort: 4 }).toFile(output);
	logSize(`webp ${width ?? "?"}x${height ?? "?"}`, output);
}

function pngToIco(pngBuffer, size) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(1, 4);

	const entry = Buffer.alloc(16);
	entry[0] = size >= 256 ? 0 : size;
	entry[1] = size >= 256 ? 0 : size;
	entry[2] = 0;
	entry[3] = 0;
	entry.writeUInt16LE(1, 4);
	entry.writeUInt16LE(32, 6);
	entry.writeUInt32LE(pngBuffer.length, 8);
	entry.writeUInt32LE(22, 12);

	return Buffer.concat([header, entry, pngBuffer]);
}

async function writeFaviconIco(input, output) {
	mkdirSync(dirname(output), { recursive: true });
	const png32 = await sharp(input)
		.resize(32, 32, { fit: "cover", position: "centre" })
		.png({ compressionLevel: 9 })
		.toBuffer();

	writeFileSync(output, pngToIco(png32, 32));
	logSize("favicon", output);
}

async function optimizeBanner(baseName) {
	const bannerDir = join(root, "public", "assets", "desktop-banner");
	const source = join(bannerDir, `${baseName}.webp`);
	if (!existsSync(source)) {
		console.warn(`[images] banner source missing: ${source}`);
		return;
	}

	const meta = await sharp(source).metadata();
	const aspect = (meta.width || 16) / (meta.height || 9);

	for (const width of [768, 1280]) {
		const height = Math.round(width / aspect);
		const out = join(bannerDir, `${baseName}-${width}.webp`);
		await writeWebp(source, out, { width, height, quality: 78 });
	}

	// Recompress master (cap width 1920)
	const masterOut = join(bannerDir, `${baseName}.webp`);
	const masterWidth = Math.min(meta.width || 1920, 1920);
	const masterHeight = Math.round(masterWidth / aspect);
	try {
		const masterBuffer = await sharp(source, { animated: false })
			.resize(masterWidth, masterHeight, {
				fit: "cover",
				position: "centre",
			})
			.webp({ quality: 82, effort: 4 })
			.toBuffer();
		writeFileSync(masterOut, masterBuffer);
		logSize("banner master", masterOut);
	} catch (error) {
		console.warn(
			`[images] could not overwrite ${masterOut}, keeping existing file:`,
			error.message,
		);
	}
}

async function main() {
	const homePng = join(root, "public", "assets", "home", "home.png");
	const homeWebp = join(root, "public", "assets", "home", "home-48.webp");
	const faviconSrc = join(root, "public", "favicon", "favicon.ico");
	const faviconOut = join(root, "public", "favicon", "favicon.ico");
	const avatarSrc = join(root, "src", "assets", "images", "avatar.webp");
	const avatarOut = join(root, "src", "assets", "images", "avatar-384.webp");

	const sourceForIcons = existsSync(homePng)
		? homePng
		: existsSync(avatarSrc)
			? avatarSrc
			: null;

	if (sourceForIcons) {
		await writeWebp(sourceForIcons, homeWebp, {
			width: 48,
			height: 48,
			quality: 85,
		});
		await writeFaviconIco(sourceForIcons, faviconOut);
	}

	if (existsSync(avatarSrc)) {
		await writeWebp(avatarSrc, avatarOut, {
			width: 384,
			height: 384,
			quality: 82,
		});
	}

	await optimizeBanner("138800451_p0");

	for (const image of [
		{ name: "jambuddy.webp", maxWidth: 1200, quality: 75 },
		{ name: "miku_live.webp", maxWidth: 960, quality: 78 },
	]) {
		const source = join(root, "public", "images", image.name);
		if (!existsSync(source)) continue;
		const meta = await sharp(source).metadata();
		const width = Math.min(meta.width || image.maxWidth, image.maxWidth);
		const height = meta.height
			? Math.round((width / (meta.width || width)) * meta.height)
			: undefined;
		const buffer = await sharp(source, { animated: false })
			.resize(width, height, { fit: "inside", withoutEnlargement: true })
			.webp({ quality: image.quality, effort: 4 })
			.toBuffer();
		const tempPath = `${source}.opt.tmp`;
		writeFileSync(tempPath, buffer);
		try {
			unlinkSync(source);
		} catch {
			/* ignore */
		}
		renameSync(tempPath, source);
		logSize(`content ${image.name}`, source);
	}

	console.log("[images] static image optimization complete");
}

main().catch((error) => {
	console.error("[images] optimization failed:", error);
	process.exit(1);
});

