/**
 * Meta Pixel browser helpers — client-safe (no secrets).
 *
 * Canonical dataset: pantaleone.net-2026 (1764032770941978).
 * All browser events are gated on:
 *   1. marketing consent (`pnet-measurement-consent === "granted"`)
 *   2. production host allowlist (fixes preview-URL dataset pollution)
 * Every funnel event mints a unique eventID that is reused server-side
 * (CAPI relay / webhooks) so Meta dedups browser+server pairs.
 */

import {
  hasConsent as growthHasConsent,
  isProdHost as growthIsProdHost,
  newEventId as growthNewEventId,
} from "@/lib/growth/gates";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1764032770941978";

export const META_PROD_HOSTS = ["pantaleone.net", "www.pantaleone.net"];

const CONSENT_KEY = "pnet-measurement-consent";

export function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return growthHasConsent(window.localStorage.getItem(CONSENT_KEY));
  } catch {
    return false;
  }
}

/**
 * Production-host gate. Returns true ONLY for the prod allowlist.
 * Never localhost, never *.vercel.app / *.vercel.dev, never IPs.
 * NEXT_PUBLIC_VERCEL_ENV is defense-in-depth: a non-production build
 * fingerprint fails closed unless the hostname itself is allowlisted.
 */
export function isProdHostname(hostname: string): boolean {
  return growthIsProdHost(hostname, META_PROD_HOSTS);
}

export function isProdHost(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Fail closed on non-production builds when the build fingerprint
    // is available; the hostname allowlist below is authoritative.
    const buildEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (buildEnv && buildEnv !== "production") return false;
    return isProdHostname(window.location.hostname);
  } catch {
    return false;
  }
}

/** Server-side counterpart: gate API-route CAPI sends on prod origin. */
export function isProdRequestHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return growthIsProdHost(host, META_PROD_HOSTS);
}

/** True on Vercel preview / dev runtimes — CAPI must stay silent there. */
export function isNonProdRuntime(): boolean {
  const env =
    process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || "";
  return env === "preview" || env === "development";
}

export function newEventId(): string {
  return growthNewEventId();
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

export function getFbp(): string | undefined {
  return readCookie("_fbp");
}

export function getFbc(): string | undefined {
  return readCookie("_fbc");
}

export function isMetaBrowserReady(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasMarketingConsent()) return false;
  if (!isProdHost()) return false;
  return (
    typeof (window as unknown as { fbq?: unknown }).fbq === "function" &&
    META_PIXEL_ID.length > 0
  );
}

export interface RelayPayload {
  event_name: string;
  event_id: string;
  event_source_url?: string;
  custom_data?: Record<string, unknown>;
}

/**
 * Fire-and-forget relay to the server CAPI endpoint with the SAME eventID
 * the browser just used — Meta dedups the pair (Test Events shows
 * browser+server with matching deduplication ID).
 */
export function relayToCapi(payload: RelayPayload): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent() || !isProdHost()) return;
  try {
    const body = JSON.stringify({
      ...payload,
      consented: true,
      event_source_url:
        payload.event_source_url ?? window.location.href.slice(0, 1024),
      fbp: getFbp(),
      fbc: getFbc(),
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/meta/capi", blob);
    } else {
      void fetch("/api/meta/capi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // analytics must never break the shopping flow
  }
}

type Fbq = (
  action: "track" | "trackCustom" | "init",
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID: string },
) => void;

/**
 * Consent + domain gated fbq dispatch. Returns the eventID used
 * (or null when nothing was sent) so callers can reuse it server-side.
 */
export function metaTrack(
  event: string,
  params?: Record<string, unknown>,
  opts?: { eventID?: string; relay?: boolean; customAction?: boolean },
): string | null {
  if (!isMetaBrowserReady()) return null;
  const eventID = opts?.eventID ?? newEventId();
  try {
    const fbq = (window as unknown as { fbq: Fbq }).fbq;
    if (opts?.customAction) {
      fbq("trackCustom", event, params, { eventID });
    } else {
      fbq("track", event, params, { eventID });
    }
  } catch {
    return null;
  }
  if (opts?.relay) {
    relayToCapi({
      event_name: event,
      event_id: eventID,
      custom_data: params,
    });
  }
  return eventID;
}
