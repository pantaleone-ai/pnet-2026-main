/**
 * DNS-over-HTTPS resolver for the ingest worker (no node:dns in Workers).
 * Uses Cloudflare's resolver; every fetched hostname is resolved through
 * this and rejected when all addresses are private (SSRF defense).
 */
import { resolvePublicAddresses } from "../../../lib/security/ssrf";

export async function dohResolve(hostname: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH lookup failed for ${hostname}`);
  const body = (await res.json()) as {
    Answer?: { type: number; data: string }[];
  };
  const addrs = (body.Answer ?? [])
    .filter((a) => a.type === 1 && typeof a.data === "string")
    .map((a) => a.data);
  if (addrs.length === 0) throw new Error(`No A records for ${hostname}`);
  return addrs;
}

export async function resolvePublic(hostname: string): Promise<string[]> {
  return resolvePublicAddresses(hostname, dohResolve);
}
