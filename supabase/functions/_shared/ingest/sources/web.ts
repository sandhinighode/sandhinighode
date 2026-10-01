import { safeFetch } from "../fetch.ts";
import { extractHtmlMetadata } from "../html-metadata.ts";
import { type Fetcher, IngestError, type Metadata, type SourceAdapter } from "../types.ts";

/**
 * Fetch a page and read its preview metadata. Used directly for ordinary websites,
 * and by the platform adapters as a fallback/extra source of detail.
 */
export async function fetchPageMetadata(
  fetcher: Fetcher,
  url: URL,
): Promise<Metadata & { finalUrl: URL; raw: Record<string, string> }> {
  const page = await safeFetch(fetcher, url);
  if (page.status >= 400) {
    throw new IngestError(`The site responded with an error (HTTP ${page.status}).`, "fetch_failed");
  }

  const fileName = decodeURIComponent(page.finalUrl.pathname.split("/").pop() ?? "") || null;
  if (page.contentType.startsWith("image/")) {
    return {
      finalUrl: page.finalUrl,
      raw: {},
      title: fileName,
      thumbnail_url: page.finalUrl.toString(),
      content_type: "image",
    };
  }
  if (page.contentType && !/html|xml/.test(page.contentType)) {
    // A PDF, video file, etc. We can't preview it, but the link itself is still worth keeping.
    return {
      finalUrl: page.finalUrl,
      raw: {},
      title: fileName,
      content_type: page.contentType.startsWith("video/") ? "video" : "unknown",
      source_metadata: { mime_type: page.contentType.split(";")[0] },
    };
  }

  return { finalUrl: page.finalUrl, ...extractHtmlMetadata(page.body, page.finalUrl) };
}

/** Fallback for any link that no platform-specific adapter claims. */
export const webAdapter: SourceAdapter = {
  id: "web",
  matches: () => true,
  async fetchMetadata(url, fetcher) {
    const { finalUrl: _finalUrl, raw: _raw, ...metadata } = await fetchPageMetadata(fetcher, url);
    return { ...metadata, site_name: metadata.site_name ?? url.hostname.replace(/^www\./, "") };
  },
};
