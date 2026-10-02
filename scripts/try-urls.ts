// Run the ingestion pipeline against real, live URLs and print what was stored.
// Uses an in-memory store, so nothing touches the database.
//
//   deno task try-urls                       # built-in sample list
//   deno task try-urls https://a.com/x ...   # your own URLs

import { ingestUrl } from "../supabase/functions/_shared/ingest/pipeline.ts";
import { InMemorySaveRepository } from "../supabase/functions/_shared/ingest/repository.ts";
import { IngestError } from "../supabase/functions/_shared/ingest/types.ts";

const SAMPLE_URLS = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=shareTracker",
  "https://youtu.be/jNQXAC9IVRw",
  "https://www.youtube.com/shorts/aqz-KE-bpKQ",
  "https://www.instagram.com/p/CwzKkRJsC7C/?igsh=abc123",
  "https://www.instagram.com/reel/C5Qp9ZsLm3T/",
  "https://www.pinterest.com/pin/99360735500167749/",
  "https://en.wikipedia.org/wiki/Bauhaus",
  "https://www.theverge.com/",
  "https://github.com/supabase/supabase",
  "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
  "https://example.com/this-page-does-not-exist-404",
  "not a url",
  "http://192.168.1.1/admin",
];

const urls = Deno.args.length ? Deno.args : SAMPLE_URLS;
const repo = new InMemorySaveRepository();

for (const url of urls) {
  const started = performance.now();
  try {
    const { save } = await ingestUrl({ url }, { repo });
    const ms = Math.round(performance.now() - started);
    console.log(`\n${save.status === "ready" ? "✅" : "⚠️ "} ${url}  (${ms} ms)`);
    console.log(`   source=${save.source}  type=${save.content_type}  status=${save.status}`);
    console.log(`   canonical:   ${save.canonical_url}`);
    console.log(`   title:       ${save.title ?? "—"}`);
    console.log(`   author:      ${save.author_name ?? "—"}`);
    console.log(`   description: ${save.description?.slice(0, 100) ?? "—"}`);
    console.log(`   thumbnail:   ${save.thumbnail_url ?? "—"}`);
    if (save.processing_error) console.log(`   error:       ${save.processing_error}`);
  } catch (err) {
    console.log(`\n❌ ${url}\n   rejected: ${err instanceof IngestError ? err.message : err}`);
  }
}
