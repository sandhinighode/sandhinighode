import { DuplicateSaveError, type SaveRepository } from "./repository.ts";
import { identifySource } from "./sources/registry.ts";
import { type Fetcher, IngestError, type Save } from "./types.ts";
import { canonicalizeUrl, parseUserUrl } from "./url.ts";

export interface IngestInput {
  url: string;
  shared_text?: string | null;
}

export interface IngestDeps {
  repo: SaveRepository;
  fetcher?: Fetcher;
  /** Upper bound for the whole metadata step, so a slow site never blocks the request for long. */
  timeoutMs?: number;
}

export interface IngestResult {
  save: Save;
  /** false when this URL was already in the library. */
  created: boolean;
}

/**
 * URL → identify source → (dedupe) → store as `pending` → retrieve metadata → store result → return the Save.
 *
 * The save is written *before* any network call, so the user's link is never lost even if the
 * site is slow, blocked or down. Re-submitting a link whose details failed retries the lookup.
 * Throws IngestError only when the input itself can't be accepted (invalid or private URL).
 */
export async function ingestUrl(input: IngestInput, deps: IngestDeps): Promise<IngestResult> {
  const { repo, fetcher = fetch, timeoutMs = 12_000 } = deps;

  const parsed = parseUserUrl(input.url);
  const adapter = identifySource(parsed);
  const canonical = canonicalizeUrl(adapter.canonicalize?.(parsed) ?? parsed);
  const sharedText = input.shared_text?.trim() || null;

  let save = await repo.findByCanonicalUrl(canonical.toString());
  let created = false;
  if (save && save.status !== "failed") return { save, created: false };

  if (!save) {
    try {
      save = await repo.insertPending({
        url: input.url.trim(),
        canonical_url: canonical.toString(),
        source: adapter.id,
        shared_text: sharedText,
      });
      created = true;
    } catch (err) {
      // Another request saved the same link a moment ago.
      if (!(err instanceof DuplicateSaveError)) throw err;
      const existing = await repo.findByCanonicalUrl(canonical.toString());
      if (!existing) throw err;
      return { save: existing, created: false };
    }
  }

  try {
    const metadata = await withTimeout(adapter.fetchMetadata(canonical, fetcher), timeoutMs);
    save = await repo.update(save.id, {
      title: metadata.title ?? null,
      description: metadata.description ?? null,
      thumbnail_url: metadata.thumbnail_url ?? null,
      author_name: metadata.author_name ?? null,
      author_url: metadata.author_url ?? null,
      site_name: metadata.site_name ?? null,
      content_type: metadata.content_type ?? "unknown",
      source_metadata: metadata.source_metadata ?? {},
      status: "ready",
      processing_error: null,
      processed_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof IngestError ? err.message : "Something went wrong while reading this link.";
    if (!(err instanceof IngestError)) console.error("ingest: unexpected metadata error", err);
    save = await repo.update(save.id, {
      status: "failed",
      processing_error: message,
      processed_at: new Date().toISOString(),
    });
  }
  return { save, created };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new IngestError("The site took too long to respond.", "fetch_failed")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
