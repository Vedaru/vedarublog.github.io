import { join } from "node:path";
import sharp from "sharp";

const cache = new Map<string, Promise<string | undefined>>();

/**
 * Build a tiny inline preview of the banner. Force reloads bypass the image
 * cache, so the banner area would otherwise show the page background until
 * the full bitmap arrives.
 */
export function getBannerPlaceholder(
	src: string | null | undefined,
): Promise<string | undefined> {
	if (!src || /^(?:https?:)?\/\//i.test(src)) {
		return Promise.resolve(undefined);
	}

	const file = join(process.cwd(), "public", src.replace(/^\/+/, ""));
	const cached = cache.get(file);
	if (cached) return cached;

	const promise = sharp(file)
		.resize(32, 20, { fit: "inside" })
		.blur(3)
		.webp({ quality: 50 })
		.toBuffer()
		.then((buffer) => `data:image/webp;base64,${buffer.toString("base64")}`)
		.catch(() => undefined);

	cache.set(file, promise);
	return promise;
}
