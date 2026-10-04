import { fetchSaves, saveLink } from "@/lib/saves";

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
  expect(requested.searchParams.get("select")).toBe("id,url,source,title,description,status,processing_error,created_at");
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

test("saveLink sends the link to the ingest-url server function", async () => {
  const save = { id: "1", url: "https://youtu.be/x", source: "youtube", title: "Video", status: "ready" };
  fetchMock.mockResolvedValue(jsonResponse({ save, created: true }, 201));

  await expect(saveLink("https://youtu.be/x")).resolves.toEqual({ save, created: true });

  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://test-project.supabase.co/functions/v1/ingest-url");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ url: "https://youtu.be/x" });
});

test("saveLink shows the server function's own error message", async () => {
  fetchMock.mockResolvedValue(jsonResponse({ error: "Only http and https links can be saved.", code: "invalid_url" }, 400));
  await expect(saveLink("ftp://x")).rejects.toThrow("Only http and https links can be saved.");
});

test("saveLink explains a rejected login", async () => {
  fetchMock.mockResolvedValue(jsonResponse({ code: 401, message: "Invalid JWT" }, 401));
  await expect(saveLink("https://x.com")).rejects.toThrow("Invalid JWT");
});
