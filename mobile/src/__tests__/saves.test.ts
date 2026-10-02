import { fetchSaves } from "@/lib/saves";

// Uses the real Supabase client with a fake network, to check the request the app sends.
jest.mock("@/lib/supabase", () => {
  const { createClient } = jest.requireActual("@supabase/supabase-js");
  return {
    isSupabaseConfigured: true,
    supabase: createClient("https://test-project.supabase.co", "sb_publishable_test", {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
});

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("asks the saves table for the newest 50 saves", async () => {
  const row = { id: "1", url: "https://example.com", source: "web", title: "Hi", description: null, status: "ready", created_at: "2026-10-01T09:00:00Z" };
  fetchMock.mockResolvedValue(jsonResponse([row]));

  await expect(fetchSaves()).resolves.toEqual([row]);

  const [url, init] = fetchMock.mock.calls[0];
  const requested = new URL(String(url));
  expect(requested.origin + requested.pathname).toBe("https://test-project.supabase.co/rest/v1/saves");
  expect(requested.searchParams.get("select")).toBe("id,url,source,title,description,status,created_at");
  expect(requested.searchParams.get("order")).toBe("created_at.desc");
  expect(requested.searchParams.get("limit")).toBe("50");
  expect(new Headers(init.headers).get("apikey")).toBe("sb_publishable_test");
});

test("turns a database error into a readable message", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({ code: "42501", message: "permission denied for table saves", details: null, hint: null }, 401),
  );

  await expect(fetchSaves()).rejects.toThrow("permission denied for table saves");
});
