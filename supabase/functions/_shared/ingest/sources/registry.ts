import type { SourceAdapter } from "../types.ts";
import { instagramAdapter } from "./instagram.ts";
import { pinterestAdapter } from "./pinterest.ts";
import { webAdapter } from "./web.ts";
import { youtubeAdapter } from "./youtube.ts";

/** Checked in order; the first adapter whose `matches` returns true handles the URL. `web` must stay last. */
export const SOURCE_ADAPTERS: SourceAdapter[] = [youtubeAdapter, instagramAdapter, pinterestAdapter, webAdapter];

export function identifySource(url: URL): SourceAdapter {
  return SOURCE_ADAPTERS.find((adapter) => adapter.matches(url)) ?? webAdapter;
}
