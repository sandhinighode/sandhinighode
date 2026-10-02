import { fetchJson } from "../fetch.ts";
import { clean } from "../html-metadata.ts";
import { IngestError, type Metadata, type SourceAdapter } from "../types.ts";
import { bareHost } from "../url.ts";
import { fetchPageMetadata } from "./web.ts";

const HOSTS = new Set(["youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

interface OEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
}

/** Find the video ID in any YouTube link shape: watch?v=, youtu.be/, /shorts/, /live/, /embed/. */
export function youtubeVideoId(url: URL): { id: string; isShort: boolean } | null {
  const host = bareHost(url);
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else if (["shorts", "live", "embed", "v"].includes(parts[0])) id = parts[1] ?? null;
  return id && VIDEO_ID.test(id) ? { id, isShort: parts[0] === "shorts" } : null;
}

export const youtubeAdapter: SourceAdapter = {
  id: "youtube",
  matches: (url) => HOSTS.has(bareHost(url)),

  canonicalize(url) {
    const video = youtubeVideoId(url);
    if (!video) return url;
    if (video.isShort) return new URL(`https://www.youtube.com/shorts/${video.id}`);
    const canonical = new URL("https://www.youtube.com/watch");
    canonical.searchParams.set("v", video.id);
    const t = url.searchParams.get("t");
    if (t) canonical.searchParams.set("t", t); // keep "start at" timestamps, they're intentional
    return canonical;
  },

  async fetchMetadata(url, fetcher) {
    const video = youtubeVideoId(url);
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", url.toString());
    oembedUrl.searchParams.set("format", "json");

    // oEmbed is fast and reliable for title/author/thumbnail; the page adds the description.
    const [oembed, page] = await Promise.all([
      fetchJson<OEmbed>(fetcher, oembedUrl),
      fetchPageMetadata(fetcher, url).catch(() => null),
    ]);
    const pageTitle = page?.title && page.title !== "YouTube" ? page.title.replace(/ - YouTube$/, "") : null;
    if (!oembed && !pageTitle) {
      throw new IngestError(
        "YouTube didn't return details for this link (it may be private or deleted).",
        "no_metadata",
      );
    }

    const metadata: Metadata = {
      title: clean(oembed?.title) ?? pageTitle,
      description: page?.description ?? null,
      thumbnail_url: oembed?.thumbnail_url ??
        (video ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : page?.thumbnail_url ?? null),
      author_name: clean(oembed?.author_name) ?? page?.author_name ?? null,
      author_url: oembed?.author_url ?? null,
      site_name: "YouTube",
      content_type: video ? "video" : "unknown",
      source_metadata: video ? { video_id: video.id, is_short: video.isShort } : {},
    };
    return metadata;
  },
};
