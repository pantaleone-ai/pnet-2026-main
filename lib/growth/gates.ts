/**
 * Growth consent + host gates (pure, extractable).
 *
 * Generalizes the `lib/meta-pixel.ts` pattern without any `@/` imports or
 * browser globals: callers pass explicit values so this module stays usable
 * on client, server, and edge. Absent consent or non-prod host = disabled.
 */

export const MEASUREMENT_CONSENT_VALUE = "granted";

export function hasConsent(storedValue: string | null | undefined): boolean {
  return storedValue === MEASUREMENT_CONSENT_VALUE;
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().split(":")[0] ?? "";
}

export function isProdHost(hostname: string, prodHosts: readonly string[]): boolean {
  return prodHosts.includes(normalizeHostname(hostname));
}

export function newEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to Math.random fallback
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
