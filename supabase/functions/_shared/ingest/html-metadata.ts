import type { ContentType, Metadata } from "./types.ts";

/**
 * Pull preview metadata out of an HTML page: Open Graph, Twitter cards, standard
 * <meta>/<title> tags and JSON-LD. Dependency-free so it runs the same in tests and on Supabase.
 */
export function extractHtmlMetadata(html: string, pageUrl: URL): Metadata & { raw: Record<string, string> } {
  const head = html.slice(0, 600_000);
  const raw: Record<string, string> = {};

  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    const content = attrs.content;
    if (key && content !== undefined && !(key in raw)) raw[key] = decodeEntities(content).trim();
  }
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag);
    const rel = attrs.rel?.toLowerCase();
    if (rel && attrs.href && !(`link:${rel}` in raw)) raw[`link:${rel}`] = decodeEntities(attrs.href).trim();
  }
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const jsonLd = extractJsonLd(head);

  const pick = (...keys: string[]) => keys.map((k) => raw[k]).find((v) => v) ?? null;
  const image = pick(
    "og:image:secure_url",
    "og:image",
    "og:image:url",
    "twitter:image",
    "twitter:image:src",
    "link:image_src",
  );
  const metaAuthor = pick("author", "article:author", "parsely-author", "sailthru.author");

  return {
    title: clean(pick("og:title", "twitter:title") ?? (titleTag ? decodeEntities(titleTag) : null) ?? jsonLd.headline),
    description: clean(pick("og:description", "twitter:description", "description") ?? jsonLd.description),
    thumbnail_url: absolute(image ?? jsonLd.image, pageUrl),
    author_name: clean(
      (metaAuthor && !/^https?:\/\//.test(metaAuthor) ? metaAuthor : null) ?? jsonLd.author ?? pick("twitter:creator"),
    ),
    site_name: clean(pick("og:site_name", "application-name")),
    content_type: contentTypeFromOg(raw["og:type"]),
    source_metadata: compact({
      og_type: raw["og:type"],
      canonical: absolute(pick("og:url", "link:canonical"), pageUrl),
      published_at: pick("article:published_time", "datepublished") ?? jsonLd.datePublished,
    }),
    raw,
  };
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const m of tag.matchAll(re)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

interface JsonLdFields {
  headline?: string;
  description?: string;
  image?: string;
  author?: string;
  datePublished?: string;
}

function extractJsonLd(html: string): JsonLdFields {
  const out: JsonLdFields = {};
  const blocks = html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const nodes = flattenJsonLd(data);
    for (const node of nodes) {
      out.headline ??= str(node.headline) ?? str(node.name);
      out.description ??= str(node.description);
      out.image ??= imageFrom(node.image);
      out.author ??= personName(node.author) ?? personName(node.creator);
      out.datePublished ??= str(node.datePublished) ?? str(node.uploadDate);
    }
  }
  return out;
}

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

function flattenJsonLd(data: unknown): Json[] {
  if (Array.isArray(data)) return data.flatMap(flattenJsonLd);
  if (data && typeof data === "object") {
    const node = data as Json;
    return [node, ...(node["@graph"] ? flattenJsonLd(node["@graph"]) : [])];
  }
  return [];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function personName(v: unknown): string | undefined {
  if (Array.isArray(v)) return v.map(personName).filter(Boolean).join(", ") || undefined;
  if (v && typeof v === "object") return str((v as Json).name);
  return str(v);
}

function imageFrom(v: unknown): string | undefined {
  if (Array.isArray(v)) return imageFrom(v[0]);
  if (v && typeof v === "object") return str((v as Json).url) ?? str((v as Json).contentUrl);
  return str(v);
}

function contentTypeFromOg(ogType: string | undefined): ContentType {
  if (!ogType) return "unknown";
  if (ogType.startsWith("video")) return "video";
  if (ogType === "article" || ogType.startsWith("article")) return "article";
  return "unknown";
}

export function absolute(href: string | null | undefined, base: URL): string | null {
  if (!href) return null;
  try {
    const u = new URL(href, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function clean(v: string | null | undefined, max = 2000): string | null {
  if (!v) return null;
  const text = v.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  middot: "·",
  bull: "•",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}
