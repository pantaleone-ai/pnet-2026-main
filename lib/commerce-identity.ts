/**
 * Canonical commerce product identity — client-safe (no secrets, no Node deps).
 *
 * Rule: the identifier sent to Meta (`content_ids` / `contents[].id`) and to
 * GA4 (`item_id`) MUST equal the product `id` used by the catalog feeds
 * (`/api/products/feed`, `/api/feeds/products`), which is:
 *
 *   sku || `product-${id}`
 *
 * Every product in `features/shop/content` currently has a `sku`, so in
 * practice the canonical ID is the SKU. The `product-${id}` fallback keeps
 * parity with the feeds for any future product without a SKU.
 *
 * Do not send array indexes, slugs, Stripe IDs, or product names here —
 * none of those exist in the Meta catalog, which is exactly what produced
 * the 0% catalog match rate.
 */

export interface CatalogProductRef {
  id: number | string;
  sku?: string;
}

export function getCatalogProductId(product: CatalogProductRef): string {
  const sku = product.sku?.trim();
  if (sku) return sku;
  return `product-${product.id}`;
}

export interface MetaContentItem {
  id: string;
  quantity: number;
}

/** Build Meta `contents` (`[{ id, quantity }]`) from tracking products. */
export function toMetaContents(
  items: Array<{ id: string; quantity?: number }>,
): MetaContentItem[] {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity ?? 1,
  }));
}
