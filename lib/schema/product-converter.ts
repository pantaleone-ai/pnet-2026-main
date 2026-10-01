import type { MerchantProduct } from "./merchant-types";
import type { ShopProduct } from "@/features/shop/types/ShopProduct";

export function convertShopProductToMerchantProduct(
  product: ShopProduct,
  canonicalUrl: string,
): MerchantProduct {
  const images: string[] = [];
  if (product.imageUrl) images.push(product.imageUrl);
  product.additionalImages?.forEach((img) => {
    if (!images.includes(img.url)) {
      images.push(img.url);
    }
  });
  if (images.length === 0) images.push("/summary_large_image.png");

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
  const images = [
    {
      url: product.imageUrl || "/summary_large_image.png",
      width: 1200,
      height: 630,
      alt: product.title,
    },
  ];

  product.additionalImages?.forEach((img) => {
    images.push({
      url: img.url,
      width: 1200,
      height: 630,
      alt: img.alt || product.title,
    });
  });

  return images;
}
