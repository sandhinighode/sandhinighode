import { IngestError } from "./types.ts";

// Query parameters that only track who shared what. Removing them lets the same link,
// shared twice from different places, be recognised as a duplicate.
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igsh",
  "igshid",
  "si",
  "feature",
  "_hsenc",
  "_hsmi",
  "ref_src",
  "ref_url",
]);
const TRACKING_PREFIXES = ["utm_"];

/**
 * Turn user input into a URL we are willing to fetch.
 * Accepts bare domains ("example.com/page") and rejects anything that isn't public http(s).
 */
export function parseUserUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new IngestError("Please provide a URL.", "invalid_url");

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new IngestError(`"${trimmed}" is not a valid URL.`, "invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IngestError("Only http and https links can be saved.", "invalid_url");
  }
  assertPublicHost(url);
  if (!url.hostname.includes(".") && !isIpLiteral(url.hostname)) {
    throw new IngestError(`"${trimmed}" is not a valid URL.`, "invalid_url");
  }
  return url;
}

/** Refuse to fetch addresses on private networks (protects our servers from being used to probe them). */
export function assertPublicHost(url: URL): void {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blockedName = host === "localhost" || host.endsWith(".localhost") ||
    host.endsWith(".local") || host.endsWith(".internal");
  if (blockedName || isPrivateIp(host)) {
    throw new IngestError("Links to private or local network addresses can't be saved.", "blocked_url");
  }
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
}

function isPrivateIp(host: string): boolean {
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (host.includes(":")) {
    const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    // URL() writes IPv4-mapped IPv6 in hex form, e.g. ::ffff:7f00:1
    const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16);
      return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return host === "::" || host === "::1" || /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
  }
  return false;
}

/** Generic cleanup applied to every URL before duplicate detection. */
export function canonicalizeUrl(url: URL): URL {
  const out = new URL(url.toString());
  out.hostname = out.hostname.toLowerCase();
  out.hash = "";
  if ((out.protocol === "https:" && out.port === "443") || (out.protocol === "http:" && out.port === "80")) {
    out.port = "";
  }
  const kept = [...out.searchParams.entries()]
    .filter(([key]) => {
      const k = key.toLowerCase();
      return !TRACKING_PARAMS.has(k) && !TRACKING_PREFIXES.some((p) => k.startsWith(p));
    })
    .sort(([a], [b]) => a.localeCompare(b));
  out.search = new URLSearchParams(kept).toString();
  if (out.pathname.length > 1 && out.pathname.endsWith("/")) {
    out.pathname = out.pathname.replace(/\/+$/, "");
  }
  return out;
}

/** Strip a leading "www." / "m." so adapters can match hosts simply. */
export function bareHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
}
