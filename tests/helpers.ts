import type { Fetcher } from "../supabase/functions/_shared/ingest/types.ts";

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;

/**
 * A fake network for tests. Routes are matched on the URL without its query string first,
 * then on the full URL. Unknown URLs fail like an unreachable host.
 */
export function fakeFetcher(routes: Record<string, Route>): Fetcher & { calls: string[] } {
  const calls: string[] = [];
  const fn = (input: string, init?: RequestInit) => {
    calls.push(input);
    const url = new URL(input);
    const route = routes[input] ?? routes[`${url.origin}${url.pathname}`];
    if (!route) return Promise.reject(new TypeError(`network error: ${input}`));
    return Promise.resolve(route(url, init));
  };
  return Object.assign(fn, { calls });
}

export const html = (body: string, status = 200) => () =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

export const jsonResponse = (body: unknown, status = 200) => () =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const redirect = (location: string, status = 302) => () => new Response(null, { status, headers: { location } });

export const hang: Route = (_url, init) =>
  new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)));
