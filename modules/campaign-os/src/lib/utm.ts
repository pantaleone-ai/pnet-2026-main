// UTM generation — configurable per brand, never overwrites intentional params.
import { UTMStrategy } from "../types";

export function buildUtmUrl(
  baseUrl: string,
  channel: string,
  campaignSlug: string,
  assetId: string,
  strategy?: UTMStrategy,
): string {
  const sourceMap = strategy?.utm_source_map ?? {};
  const mediumMap = strategy?.utm_medium_map ?? {
    linkedin: "social",
    x: "social",
    email: "email",
    website: "owned",
  };
  try {
    const u = new URL(baseUrl);
    if (!u.searchParams.get("utm_source"))
      u.searchParams.set("utm_source", sourceMap[channel] ?? channel);
    if (!u.searchParams.get("utm_medium"))
      u.searchParams.set("utm_medium", mediumMap[channel] ?? "campaign");
    if (!u.searchParams.get("utm_campaign"))
      u.searchParams.set("utm_campaign", campaignSlug);
    if (!u.searchParams.get("utm_content"))
      u.searchParams.set("utm_content", assetId);
    return u.toString();
  } catch {
    return baseUrl;
  }
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campaign"
  );
}
