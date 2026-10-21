import type { MerchantProduct } from "./merchant-types";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";
import { toAbsoluteImageUrl } from "@/lib/helpers";

export function convertShopProductToMerchantProduct(
  product: ShopProduct,
  canonicalUrl: string,
): MerchantProduct {
  // Derive site root from the canonical product URL so JSON-LD `image`
  // is always absolute https (Google Merchant Listings + Meta OG both
  // reject relative paths). Falls back to production domain.
  let siteRoot = "https://www.pantaleone.net";
  try {
    siteRoot = new URL(canonicalUrl).origin;
  } catch {
    // keep production fallback
  }
  const primaryImage = toAbsoluteImageUrl(product.imageUrl, siteRoot);
  const images: string[] = [primaryImage];
  product.additionalImages?.forEach((img) => {
    const absolute = toAbsoluteImageUrl(img.url, siteRoot);
    if (!images.includes(absolute)) {
      images.push(absolute);
    }
  });
  if (images.length === 0)
    images.push(toAbsoluteImageUrl("/summary_large_image.png", siteRoot));

  const isDigital = product.isDigital !== false;

  // priceValidUntil default preserves the documented Google Merchant
  // validation behavior (see GOOGLE_MERCHANT_VALIDATION_PLAN.md); it can
  // be overridden per product via frontmatter.
  const defaultPriceValidUntil = "2026-12-31";

  // Digital products: no shipping, no physical-return claims. Physical
  // products: only real shipping/return data — never fabricated.
  // Reviews/ratings are emitted only when real review data exists on the
  // product; nothing is invented to satisfy schema.
  return {
    name: product.title,
    description: product.description,
    image: images,
    isDigital,
    offers: {
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: product.inventory === 0 ? "OutOfStock" : "InStock",
      itemCondition: product.itemCondition || "NewCondition",
      priceValidUntil: product.priceValidUntil || defaultPriceValidUntil,
      url: canonicalUrl,
      ...(isDigital
        ? {}
        : {
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              name: "30-Day Return Policy",
              description:
                "Return within 30 days of receipt for physical products",
              returnPolicyCategory:
                "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 30,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/FreeReturn",
              applicableCountry: "US",
            },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: 0,
              shippingRateCurrency: product.currency || "USD",
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "US",
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                businessDays: 5,
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 0,
                  maxValue: 1,
                  unitCode: "DAY",
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 0,
                  maxValue: 2,
                  unitCode: "DAY",
                },
              },
            },
          }),
    },
    brand: {
      name: "Pantaleone Digital Services",
      logo: product.brandLogo,
    },
    sku: product.sku,
    mpn: product.mpn,
    gtin: product.gtin,
    weight: product.weight,
    weightUnit: "LBS",
  };
}

export function buildBreadcrumbItems(
  category: string,
  slug: string,
  baseUrl: string,
): Array<{ name: string; item: string }> {
  const normalizedCategory = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return [
    { name: "Home", item: baseUrl },
    { name: "Shop", item: `${baseUrl}/shop` },
    { name: normalizedCategory, item: `${baseUrl}/shop/${category}` },
    { name: slug, item: `${baseUrl}/shop/${category}/${slug}` },
  ];
}

export function getOpenGraphImages(product: ShopProduct) {
  const siteRoot =
    process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") ||
    "https://www.pantaleone.net";
  const images = [
    {
      url: toAbsoluteImageUrl(
        product.imageUrl || "/summary_large_image.png",
        siteRoot,
      ),
      width: 1200,
      height: 630,
      alt: product.title,
    },
  ];

  product.additionalImages?.forEach((img) => {
    images.push({
      url: toAbsoluteImageUrl(img.url, siteRoot),
      width: 1200,
      height: 630,
      alt: img.alt || product.title,
    });
  });

  return images;
}
