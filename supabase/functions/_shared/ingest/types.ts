// The Save model shared by every source (Instagram, YouTube, Pinterest, plain web pages…).
// Mirrors the `saves` table in supabase/migrations.

export type SaveSource = "instagram" | "youtube" | "pinterest" | "web";
export type SaveStatus = "pending" | "ready" | "failed";
export type ContentType = "video" | "image" | "article" | "post" | "unknown";

export interface Save {
  id: string;
  user_id: string;
  url: string;
  canonical_url: string;
  shared_text: string | null;
  source: SaveSource;
  content_type: ContentType;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  author_url: string | null;
  site_name: string | null;
  source_metadata: Record<string, unknown>;
  status: SaveStatus;
  processing_error: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What an adapter found out about a URL. Every field is optional: sources differ in what they expose. */
export interface Metadata {
  title?: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  author_name?: string | null;
  author_url?: string | null;
  site_name?: string | null;
  content_type?: ContentType;
  source_metadata?: Record<string, unknown>;
}

/** Fetch function injected into adapters, so tests can replace the network. */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * One adapter per platform. To add a new source: write an adapter, add it to
 * sources/registry.ts and add its id to SaveSource + the `save_source` enum.
 */
export interface SourceAdapter {
  id: SaveSource;
  /** Does this adapter handle the URL? (Checked in registry order; `web` matches everything.) */
  matches(url: URL): boolean;
  /** Optional platform-specific cleanup, e.g. youtu.be/ID → youtube.com/watch?v=ID. */
  canonicalize?(url: URL): URL;
  /** Retrieve whatever metadata is available. Throw IngestError if nothing could be fetched. */
  fetchMetadata(url: URL, fetcher: Fetcher): Promise<Metadata>;
}

export class IngestError extends Error {
  constructor(message: string, readonly code: "invalid_url" | "blocked_url" | "fetch_failed" | "no_metadata") {
    super(message);
    this.name = "IngestError";
  }
}
