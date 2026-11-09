/**
 * Build-time helper: turn a file in `public/` into a data URI.
 *
 * Used for the banner, which is the one image the first paint depends on. A
 * separate request means the wrapper's blurred placeholder is what you see
 * until the webp lands, so a hard refresh reads as a flash. Inlined, the image
 * is parsed with the document and there is nothing to wait for.
 *
 * Build-time only - imports `node:fs`, so never import this from client code.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function inlinePublicAsset(
	pathFromPublic: string | null | undefined,
	mime = "image/webp",
): string | null {
	if (!pathFromPublic) return null;
	try {
		const file = join(process.cwd(), "public", pathFromPublic);
		return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
	} catch {
		return null;
	}
}
