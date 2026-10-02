/**
 * Server-only Stripe → catalog identity resolver.
 *
 * Stripe Checkout line items carry Stripe price/product IDs (`price_...`,
 * `prod_...`), which do NOT exist in the Meta catalog. Every catalog product
 * declares its `stripePriceId` / `stripeProductId` in MDX frontmatter, so we
 * resolve those back to the canonical catalog ID (`sku || product-${id}`)
 * before sending Meta CAPI / GA4 Measurement Protocol events.
 *
 * Unmatched Stripe products are dropped from `content_ids` (never sent as
 * Stripe IDs — wrong IDs actively harm the catalog match rate) and reported
 * via `unmatched` so callers can log them.
 */

import { getProducts } from "@/features/shop/data/shopSource";
import { getCatalogProductId } from "@/lib/commerce-identity";

export interface StripeLineItemInput {
  priceId?: string;
  productId?: string;
  quantity?: number;
  amountTotal?: number;
  fallbackName?: string;
}

export interface CatalogLineItem {
  catalogId: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  currency: string;
}

export interface CatalogResolution {
  items: CatalogLineItem[];
  unmatched: StripeLineItemInput[];
}

export function resolveStripeLineItems(
  lineItems: StripeLineItemInput[],
): CatalogResolution {
  const products = getProducts();
  const byPriceId = new Map(
    products
      .filter((p) => p.stripePriceId)
      .map((p) => [p.stripePriceId as string, p]),
  );
  const byProductId = new Map(
    products
      .filter((p) => p.stripeProductId)
      .map((p) => [p.stripeProductId as string, p]),
  );

  const items: CatalogLineItem[] = [];
  const unmatched: StripeLineItemInput[] = [];

  for (const line of lineItems) {
    const product =
      (line.priceId ? byPriceId.get(line.priceId) : undefined) ??
      (line.productId ? byProductId.get(line.productId) : undefined);
    if (!product) {
      unmatched.push(line);
      continue;
    }
    const quantity = line.quantity ?? 1;
    const unitPrice =
      typeof line.amountTotal === "number" && quantity > 0
        ? line.amountTotal / quantity
        : product.price;
    items.push({
      catalogId: getCatalogProductId(product),
      name: product.title,
      category: product.category,
      price: unitPrice,
      quantity,
      currency: product.currency || "USD",
    });
  }

  return { items, unmatched };
}
