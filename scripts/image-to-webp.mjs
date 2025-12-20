import sharp from "sharp";

export const COVER_WEBP_QUALITY = 80;

export async function saveBufferAsWebp(buffer, outputPath, quality = COVER_WEBP_QUALITY) {
	await sharp(buffer).webp({ quality }).toFile(outputPath);
}

export async function convertFileToWebp(inputPath, outputPath, quality = COVER_WEBP_QUALITY) {
	await sharp(inputPath).webp({ quality }).toFile(outputPath);
}
