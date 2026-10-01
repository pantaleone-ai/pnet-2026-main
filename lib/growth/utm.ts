/**
 * Growth UTM standard (pure, extractable).
 *
 * Campaign: `[APP]_[PLATFORM]_[OBJECTIVE]_[AUDIENCE]_[GEO]_[YYYYMM]`
 * Creative: `[APP]_[CONCEPT]_[FORMAT]_[VARIANT]`
 *
 * Extends the campaign-os idiom: never overwrite intentional params already
 * present on the URL; slugify segments; fail soft by returning the base URL.
 */

export type UtmCampaignParts = {
  app: string;
  platform: string;
  objective: string;
  audience: string;
  geo: string;
  yyyymm: string;
};

export type UtmCreativeParts = {
  app: string;
  concept: string;
  format: string;
  variant: string;
};

const SEGMENT = /^[A-Za-z0-9]+$/;
const YYYYMM = /^\d{6}$/;

export function slugifySegment(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "")
    .slice(0, 32);
}

export function buildCampaignName(parts: UtmCampaignParts): string {
  return [parts.app, parts.platform, parts.objective, parts.audience, parts.geo, parts.yyyymm]
    .map((segment) => slugifySegment(segment).toUpperCase())
    .join("_");
}

export function buildCreativeName(parts: UtmCreativeParts): string {
  return [parts.app, parts.concept, parts.format, parts.variant]
    .map((segment) => slugifySegment(segment).toUpperCase())
    .join("_");
}

export type UtmValidation = { valid: boolean; errors: string[] };

export function validateCampaignName(name: string): UtmValidation {
  const errors: string[] = [];
  const segments = name.split("_");
  if (segments.length !== 6) {
    errors.push(`expected 6 segments, found ${segments.length}`);
  }
  for (const segment of segments) {
    if (!SEGMENT.test(segment)) errors.push(`bad segment: ${segment}`);
  }
  const yyyymm = segments[5];
  if (yyyymm && !YYYYMM.test(yyyymm)) errors.push(`bad YYYYMM: ${yyyymm}`);
  return { valid: errors.length === 0, errors };
}

export function validateCreativeName(name: string): UtmValidation {
  const errors: string[] = [];
  const segments = name.split("_");
  if (segments.length !== 4) {
    errors.push(`expected 4 segments, found ${segments.length}`);
  }
  for (const segment of segments) {
    if (!SEGMENT.test(segment)) errors.push(`bad segment: ${segment}`);
  }
  return { valid: errors.length === 0, errors };
}

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;
};

/** Attach UTM params without overwriting intentional ones already set. */
export function buildUtmUrl(
  baseUrl: string,
  params: UtmParams,
  mediumFallback = "campaign",
): string {
  try {
    const url = new URL(baseUrl);
    if (params.utm_source && !url.searchParams.get("utm_source")) {
      url.searchParams.set("utm_source", params.utm_source);
    }
    if (!url.searchParams.get("utm_medium")) {
      url.searchParams.set("utm_medium", params.utm_medium ?? mediumFallback);
    }
    if (params.utm_campaign && !url.searchParams.get("utm_campaign")) {
      url.searchParams.set("utm_campaign", params.utm_campaign);
    }
    if (params.utm_content && !url.searchParams.get("utm_content")) {
      url.searchParams.set("utm_content", params.utm_content);
    }
    if (params.utm_term && !url.searchParams.get("utm_term")) {
      url.searchParams.set("utm_term", params.utm_term);
    }
    if (params.utm_id && !url.searchParams.get("utm_id")) {
      url.searchParams.set("utm_id", params.utm_id);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}
