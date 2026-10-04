import { assertEquals } from "@std/assert";
import { createClient } from "@supabase/supabase-js";
import { bearerToken, userAuthHeaders } from "../supabase/functions/_shared/ingest/auth.ts";

Deno.test("bearerToken reads the token from an Authorization header", () => {
  assertEquals(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assertEquals(bearerToken("bearer abc"), "abc");
  assertEquals(bearerToken(null), null);
  assertEquals(bearerToken(""), null);
  assertEquals(bearerToken("Basic abc"), null);
});

// Regression test for the "Sign in required" bug: the login check (/auth/v1/user) and database queries
// must carry the user's token as the one and only Authorization value. (A lowercase "authorization" header
// used to be merged with the project key into "Bearer <key>, Bearer <token>", which Supabase rejects.)
Deno.test({
  name: "the login check and queries send exactly the user's token",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const seen: Record<string, string | null> = {};
    const token = "user-token";
    const db = createClient("https://example.supabase.co", "project-anon-key", {
      global: {
        headers: userAuthHeaders(token),
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          seen[new URL(String(input)).pathname] = new Headers(init?.headers).get("authorization");
          const body = String(input).includes("/auth/") ? { id: "u1", aud: "authenticated" } : [];
          return Promise.resolve(
            new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }),
          );
        },
      },
      auth: { persistSession: false },
    });

    const { data } = await db.auth.getUser(token);
    await db.from("saves").select("id");

    assertEquals(data.user?.id, "u1");
    assertEquals(seen["/auth/v1/user"], "Bearer user-token");
    assertEquals(seen["/rest/v1/saves"], "Bearer user-token");
  },
});
