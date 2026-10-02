import { clean } from "../html-metadata.ts";
import { IngestError, type SourceAdapter } from "../types.ts";
import { bareHost } from "../url.ts";
import { fetchPageMetadata } from "./web.ts";

const HOSTS = new Set(["instagram.com", "instagr.am"]);
const KINDS: Record<string, "post" | "video"> = { p: "post", reel: "video", reels: "video", tv: "video" };

/** Find the post shortcode in /p/ID, /reel/ID, /tv/ID, including the newer /username/p/ID form. */
export function instagramPost(url: URL): { kind: string; shortcode: string } | null {
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.findIndex((p) => p in KINDS);
  if (i === -1 || i > 1 || !parts[i + 1]) return null;
  return { kind: parts[i], shortcode: parts[i + 1] };
}

export const instagramAdapter: SourceAdapter = {
  id: "instagram",
  matches: (url) => HOSTS.has(bareHost(url)),

  canonicalize(url) {
    const post = instagramPost(url);
    if (!post) return new URL(`https://www.instagram.com${url.pathname}`);
    const kind = post.kind === "reels" ? "reel" : post.kind;
    return new URL(`https://www.instagram.com/${kind}/${post.shortcode}/`);
  },

  async fetchMetadata(url, fetcher) {
    // Instagram has no public API for this. We read the page's preview tags, which Instagram
    // often hides behind a login wall. When that happens the link is still saved; only the details are missing.
    const page = await fetchPageMetadata(fetcher, url);
    const loginWall = page.finalUrl.pathname.startsWith("/accounts/login") ||
      (!page.raw["og:description"] && !page.raw["og:image"]);
    if (loginWall) {
      throw new IngestError(
        "Instagram didn't share details for this post (it usually requires login). The link is saved.",
        "no_metadata",
      );
    }

    // og:title looks like: `Jane Doe on Instagram: "caption…"`
    // og:description looks like: `1,234 likes, 56 comments - janedoe on June 1, 2026: "caption…"`
    const ogTitle = page.raw["og:title"] ?? "";
    const ogDescription = page.raw["og:description"] ?? "";
    const displayName = ogTitle.match(/^(.*?) on Instagram/)?.[1];
    const username = ogDescription.match(/ - ([A-Za-z0-9._]+) on /)?.[1] ??
      ogDescription.match(/^([A-Za-z0-9._]+) on /)?.[1];
    const caption = ogDescription.match(/: [“"]([\s\S]*)[”"]\.?\s*$/)?.[1] ??
      ogTitle.match(/on Instagram: [“"]([\s\S]*)[”"]\s*$/)?.[1];
    const post = instagramPost(url);

    return {
      title: clean(caption, 300) ?? clean(ogTitle),
      description: clean(caption) ?? clean(ogDescription),
      thumbnail_url: page.thumbnail_url,
      author_name: clean(displayName) ?? (username ? `@${username}` : null),
      author_url: username ? `https://www.instagram.com/${username}/` : null,
      site_name: "Instagram",
      content_type: post ? KINDS[post.kind] : "unknown",
      source_metadata: { ...(post ?? {}), ...(username ? { username } : {}) },
    };
  },
};
