import { getProductByFeedId } from "@/features/shop/data/shopSource";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export interface ParsedCartItem {
  sku: string;
  quantity: number;
}

export interface ValidatedCartItem {
  product: ShopProduct;
  quantity: number;
}

export interface CartValidationResult {
  success: boolean;
  items: ValidatedCartItem[];
  errors: string[];
}

export function parseProductsParam(productsParam: string): ParsedCartItem[] {
  if (!productsParam) return [];

  const items: ParsedCartItem[] = [];

  for (const item of productsParam.split(",")) {
    const [sku, qtyStr] = item.split(":");
    if (!sku) continue;

    const skuDecoded = decodeURIComponent(sku);
    const quantity = qtyStr ? parseInt(qtyStr, 10) : 1;

    if (quantity > 0 && isFinite(quantity)) {
      items.push({ sku: skuDecoded, quantity });
    }
  }

  return items;
}

export function validateCart(
  parsedItems: ParsedCartItem[],
): CartValidationResult {
  const items: ValidatedCartItem[] = [];
  const errors: string[] = [];

  if (parsedItems.length === 0) {
    return { success: false, items: [], errors: ["No valid products in cart"] };
  }

  const seenSkus = new Set<string>();

  for (const item of parsedItems) {
    if (seenSkus.has(item.sku)) {
      errors.push(`Duplicate product: ${item.sku}`);
      continue;
    }
    seenSkus.add(item.sku);

    const product = getProductByFeedId(item.sku);

    if (!product) {
      errors.push(`Product not found: ${item.sku}`);
      continue;
    }

    if (!product.stripePriceId) {
      errors.push(`Product not available for online purchase: ${item.sku}`);
      continue;
    }

    items.push({ product, quantity: item.quantity });
  }

  return {
    success: items.length > 0 && errors.length === 0,
    items,
    errors,
  };
}

export function getCartTotal(items: ValidatedCartItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
}

export function getCartMetadata(cartOrigin?: string, couponCode?: string) {
  return {
    cart_origin: cartOrigin || "",
    source: "meta_commerce",
    ...(couponCode && { coupon_applied: couponCode }),
  };
}
