/**
 * Growth attribution (pure, extractable).
 *
 * First/last-touch over a touch list plus landing-page capture and `utm_id`.
 * First-party cookie only, per-app scope — no cross-app identity. Cookie
 * serialization here is string-only; callers own `document.cookie` access.
 */

export type Touch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
  landing?: string;
  at: number;
};

export type Attribution = {
  first: Touch | null;
  last: Touch | null;
  landing: string | null;
  utm_id: string | null;
  touchCount: number;
};

export function attribute(touches: Touch[]): Attribution {
  if (touches.length === 0) {
    return { first: null, last: null, landing: null, utm_id: null, touchCount: 0 };
  }
  const sorted = [...touches].sort((a, b) => a.at - b.at);
  const first = sorted[0] ?? null;
  const last = sorted[sorted.length - 1] ?? null;
  return {
    first,
    last,
    landing: first?.landing ?? null,
    utm_id: last?.utm_id ?? first?.utm_id ?? null,
    touchCount: sorted.length,
  };
}

export const ATTRIBUTION_COOKIE = "pnet-attribution";

export function serializeTouches(touches: Touch[]): string {
  return encodeURIComponent(JSON.stringify(touches.slice(-10)));
}

export function parseTouches(raw: string | null | undefined): Touch[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (touch): touch is Touch =>
        typeof touch === "object" && touch !== null && typeof touch.at === "number",
    );
  } catch {
    return [];
  }
}
