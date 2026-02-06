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

  return {
    name: product.title,
    description: product.description,
    image: images,
    offers: {
      price: product.price,
      priceCurrency: product.currency || "USD",
      availability: product.inventory === 0 ? "OutOfStock" : "InStock",
      itemCondition: product.itemCondition || "NewCondition",
      priceValidUntil: product.priceValidUntil,
      url: canonicalUrl,
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        name: product.isDigital
          ? "30-Day Return Policy"
          : "30-Day Return Policy",
        description: product.isDigital
          ? "Return within 30 days of receipt for digital products"
          : "Return within 30 days of receipt for physical products",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: !product.isDigital
        ? {
            shippingRate: 0,
            shippingCurrency: product.currency || "USD",
            deliveryTime: {
              businessDays: 7,
              handlingTime: 1,
            },
          }
        : undefined,
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
    aggregateRating: undefined,
    inProductGroupWithID: undefined,
    isVariantOf: undefined,
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
