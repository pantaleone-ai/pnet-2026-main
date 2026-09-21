/**
 * Outbound link policy: every link leaving pantaleone.net opens in a new
 * window and carries a utm_source GA can attribute back to this site.
 */

export const OUTBOUND_UTM_SOURCE = "pantaleone.net";

const INTERNAL_HOSTS = new Set(["pantaleone.net", "www.pantaleone.net"]);

/**
 * True for absolute http(s) URLs whose host is outside pantaleone.net.
 * Relative links, anchors, mailto:, and downloads are never external.
 */
export function isExternalHref(href: string): boolean {
  if (!href.startsWith("http://") && !href.startsWith("https://")) {
    return false;
  }
  try {
    return !INTERNAL_HOSTS.has(new URL(href).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Append ?utm_source=pantaleone.net (preserving query + hash) so GA on
 * our own properties attributes the visit. Idempotent — existing
 * utm_source is left untouched; non-external hrefs pass through.
 */
export function withOutboundUtm(href: string): string {
  if (!isExternalHref(href)) return href;
  try {
    const url = new URL(href);
    if (!url.searchParams.get("utm_source")) {
      url.searchParams.set("utm_source", OUTBOUND_UTM_SOURCE);
    }
    return url.toString();
  } catch {
    return href;
  }
}
