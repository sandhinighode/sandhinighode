// POST /functions/v1/ingest-url
// Body: { "url": "https://…", "shared_text"?: "…" }   Header: Authorization: Bearer <user access token>
// 201 { save, created: true } for a new save · 200 { save, created: false } if already saved
// 400 for an invalid or private URL · 401 if not signed in
//
// A link whose details couldn't be fetched is still saved and returned with status "failed".

import { createClient } from "@supabase/supabase-js";
import { bearerToken, userAuthHeaders } from "../_shared/ingest/auth.ts";
import { ingestUrl } from "../_shared/ingest/pipeline.ts";
import { SupabaseSaveRepository } from "../_shared/ingest/supabase-repository.ts";
import { IngestError } from "../_shared/ingest/types.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const token = bearerToken(req.headers.get("authorization"));
  if (!token) return json({ error: "Sign in required." }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: userAuthHeaders(token) },
    auth: { persistSession: false },
  });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "Sign in required." }, 401);

  let body: { url?: unknown; shared_text?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  if (typeof body.url !== "string") return json({ error: "`url` is required." }, 400);
  const sharedText = typeof body.shared_text === "string" ? body.shared_text : null;

  try {
    const result = await ingestUrl({ url: body.url, shared_text: sharedText }, {
      repo: new SupabaseSaveRepository(db),
    });
    return json(result, result.created ? 201 : 200);
  } catch (err) {
    if (err instanceof IngestError) return json({ error: err.message, code: err.code }, 400);
    console.error("ingest-url failed", err);
    return json({ error: "Couldn't save this link. Please try again." }, 500);
  }
});
