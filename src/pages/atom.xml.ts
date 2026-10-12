import type { APIContext } from "astro";
import { buildAtomFeed } from "@/utils/feed-utils";

export const GET = (context: APIContext) => buildAtomFeed(context);
