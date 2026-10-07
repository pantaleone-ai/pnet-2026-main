// eBay Browse API: market-demand signal for the content engine
// (opportunity detection per docs/SOCIAL_GROWTH_OS.md roadmap step 1).
// App-token calls only — no seller account needed. Read-only.
import { ebayApiHost, type EbayAppCreds } from "./config";
import { getAppToken } from "./auth";

export interface BrowseItem {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  estimatedAvailabilities?: Array<{ estimatedAvailabilityStatus?: string }>;
}

async function browseGet<T>(creds: EbayAppCreds, token: string, path: string, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams(params);
  const res = await fetch(`${ebayApiHost(creds.env)}/buy/browse/v1/${path}?${q.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": creds.marketplace,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { errors?: unknown };
  if (!res.ok) throw new Error(`ebay browse ${path} failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

/** Demand snapshot: total results + top items for a keyword query. */
export async function searchDemand(
  creds: EbayAppCreds,
  query: string,
  limit = 10,
): Promise<{ total: number; items: BrowseItem[] }> {
  const { accessToken } = await getAppToken(creds, "https://api.ebay.com/oauth/api_scope");
  const res = await browseGet<{ total?: number; itemSummaries?: BrowseItem[] }>(
    creds,
    accessToken,
    "item_summary/search",
    { q: query, limit: String(limit) },
  );
  return { total: res.total ?? 0, items: res.itemSummaries ?? [] };
}

export async function getItem(creds: EbayAppCreds, itemId: string): Promise<BrowseItem> {
  const { accessToken } = await getAppToken(creds, "https://api.ebay.com/oauth/api_scope");
  return browseGet<BrowseItem>(creds, accessToken, `item/${encodeURIComponent(itemId)}`, {});
}
