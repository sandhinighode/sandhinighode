import { fetchJson } from "../fetch.ts";
import { clean } from "../html-metadata.ts";
import { IngestError, type SourceAdapter } from "../types.ts";
import { bareHost } from "../url.ts";
import { fetchPageMetadata } from "./web.ts";

interface OEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
}

const isPinterestHost = (host: string) => host === "pin.it" || /^([a-z]{2}\.)?pinterest\.[a-z.]+$/.test(host);

export function pinterestPinId(url: URL): string | null {
  return url.pathname.match(/^\/pin\/(?:[^/]*--)?(\d+)/)?.[1] ?? null;
}

export const pinterestAdapter: SourceAdapter = {
  id: "pinterest",
  matches: (url) => isPinterestHost(bareHost(url)),

  canonicalize(url) {
    // Country domains (pinterest.co.uk, fr.pinterest.com…) all point to the same pin.
    const pinId = pinterestPinId(url);
    return pinId ? new URL(`https://www.pinterest.com/pin/${pinId}/`) : url;
  },

  async fetchMetadata(url, fetcher) {
    const oembedUrl = new URL("https://www.pinterest.com/oembed.json");
    oembedUrl.searchParams.set("url", url.toString());

    const [oembed, page] = await Promise.all([
      fetchJson<OEmbed>(fetcher, oembedUrl),
      fetchPageMetadata(fetcher, url).catch(() => null),
    ]);
    if (!oembed && !page?.title && !page?.thumbnail_url) {
      throw new IngestError("Pinterest didn't return details for this link.", "no_metadata");
    }

    const pinId = pinterestPinId(page?.finalUrl ?? url);
    return {
      title: clean(oembed?.title) ?? page?.title ?? null,
      description: page?.description ?? null,
      thumbnail_url: page?.thumbnail_url ?? oembed?.thumbnail_url ?? null,
      author_name: clean(oembed?.author_name) ?? page?.author_name ?? null,
      author_url: oembed?.author_url ?? null,
      site_name: "Pinterest",
      content_type: pinId ? "image" : "unknown",
      source_metadata: {
        ...(pinId ? { pin_id: pinId } : {}),
        ...(page && page.finalUrl.toString() !== url.toString() ? { resolved_url: page.finalUrl.toString() } : {}),
      },
    };
  },
};
