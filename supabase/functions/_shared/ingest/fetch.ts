import { assertPublicHost } from "./url.ts";
import { type Fetcher, IngestError } from "./types.ts";

export const USER_AGENT = "Mozilla/5.0 (compatible; InspirationLibraryBot/0.1; link preview)";

export interface FetchedPage {
  finalUrl: URL;
  status: number;
  contentType: string;
  body: string;
}

interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

/**
 * Fetch a public URL with guard rails: a timeout, a size cap, and a re-check of
 * every redirect hop so a public link can't bounce us onto a private address.
 * Only reads text; binary bodies (images, PDFs) are skipped after the headers.
 */
export async function safeFetch(fetcher: Fetcher, url: URL, options: SafeFetchOptions = {}): Promise<FetchedPage> {
  const { timeoutMs = 8000, maxBytes = 1_500_000, accept = "text/html,application/xhtml+xml,*/*;q=0.8" } = options;
  const signal = AbortSignal.timeout(timeoutMs);
  let current = url;

  try {
    for (let hop = 0; hop <= 5; hop++) {
      assertPublicHost(current);
      const res = await fetcher(current.toString(), {
        redirect: "manual",
        signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "en" },
      });

      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        await res.body?.cancel();
        current = new URL(location, current);
        continue;
      }

      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      const isText = contentType === "" || /text\/|json|xml/.test(contentType);
      const body = isText ? await readCapped(res, maxBytes) : (await res.body?.cancel(), "");
      return { finalUrl: current, status: res.status, contentType, body };
    }
  } catch (err) {
    if (err instanceof IngestError) throw err;
    const name = (err as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new IngestError("The site took too long to respond.", "fetch_failed");
    }
    throw new IngestError(`Couldn't reach ${current.hostname}.`, "fetch_failed");
  }
  throw new IngestError("Too many redirects.", "fetch_failed");
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    if (received >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  return text + decoder.decode();
}

/** Fetch and parse a JSON endpoint (oEmbed). Returns null instead of throwing, since it's always optional. */
export async function fetchJson<T>(fetcher: Fetcher, url: URL, timeoutMs = 6000): Promise<T | null> {
  try {
    const page = await safeFetch(fetcher, url, { timeoutMs, maxBytes: 200_000, accept: "application/json" });
    if (page.status !== 200) return null;
    return JSON.parse(page.body) as T;
  } catch {
    return null;
  }
}
