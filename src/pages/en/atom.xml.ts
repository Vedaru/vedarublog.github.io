/**
 * 英文 Atom feed（/en/atom.xml）。
 * 与中文 feed 共用 feed-utils 里的构建逻辑，只是文章集合与 self 链接不同。
 */
import type { APIContext } from "astro";
import { buildAtomFeed } from "@/utils/feed-utils";

export const GET = (context: APIContext) =>
	buildAtomFeed(context, "en", "en/atom.xml");
