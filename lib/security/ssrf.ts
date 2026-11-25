/**
 * SSRF protections for website ingestion (customer-supplied URLs).
 *
 * Design: pure functions + injectable DNS. Route handlers pass the real
 * resolver (`node:dns/promises`); tests inject a stub. Never trust a
 * user-supplied URL — validate the protocol, then the hostname, then EVERY
 * redirect target before fetching.
 */

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const v = Number(part);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function inCidr(ip: string, base: string, bits: number): boolean {
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(base);
  if (a === null || b === null) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

/** True for loopback, private, link-local, CGNAT, and documentation ranges. */
export function isPrivateIPv4(ip: string): boolean {
  if (ip === "0.0.0.0") return true;
  return (
    inCidr(ip, "10.0.0.0", 8) ||
    inCidr(ip, "172.16.0.0", 12) ||
    inCidr(ip, "192.168.0.0", 16) ||
    inCidr(ip, "127.0.0.0", 8) ||
    inCidr(ip, "169.254.0.0", 16) ||
    inCidr(ip, "100.64.0.0", 10) ||
    inCidr(ip, "192.0.2.0", 24) ||
    inCidr(ip, "198.51.100.0", 24) ||
    inCidr(ip, "203.0.113.0", 24) ||
    inCidr(ip, "224.0.0.0", 4)
  );
}

/** True for loopback, link-local, unique-local, and documentation ranges. */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (lower === "::1" || lower === "::") return true;
  const first = lower.split(":")[0] ?? "";
  if (first === "") return lower.includes("::ffff:");
  if (first === "fe80") return true;
  if (first.startsWith("fc") || first.startsWith("fd")) return true;
  if (first === "2001" && lower.startsWith("2001:db8")) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice("::ffff:".length);
    if (v4.includes(".")) return isPrivateIPv4(v4);
  }
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim().replace(/^\[(.*)\]$/, "$1");
  if (trimmed.includes(":")) return isPrivateIPv6(trimmed);
  return isPrivateIPv4(trimmed);
}

/**
 * Parse + structural validation (no network). Throws on anything that
 * must never be fetched: bad URLs, non-http(s) protocols, credentials in
 * the URL, overly long input, localhost hostnames.
 */
export function parseOutboundUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL is empty.");
  if (trimmed.length > MAX_URL_LENGTH) throw new Error("URL is too long.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("URL is invalid.");
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error("Only http and https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Localhost targets are not allowed.");
  }
  return url;
}

export type DnsResolver = (host: string) => Promise<string[]>;

/**
 * Resolve a hostname and reject if EVERY address is private/loopback or
 * resolution yields nothing usable. Returns the public addresses.
 * Callers must re-run this for every redirect hop.
 */
export async function resolvePublicAddresses(
  hostname: string,
  resolve: DnsResolver,
): Promise<string[]> {
  let addresses: string[];
  try {
    addresses = await resolve(hostname);
  } catch {
    throw new Error("Hostname could not be resolved.");
  }
  const publicAddrs = addresses.filter((a) => !isPrivateIp(a));
  if (publicAddrs.length === 0) {
    throw new Error("Hostname resolves only to private addresses.");
  }
  return publicAddrs;
}

/**
 * Full validation for a customer-supplied URL: structure + DNS.
 * Redirect targets must be validated separately with the same function.
 */
export async function validateOutboundUrl(
  raw: string,
  resolve: DnsResolver,
): Promise<URL> {
  const url = parseOutboundUrl(raw);
  await resolvePublicAddresses(url.hostname, resolve);
  return url;
}
