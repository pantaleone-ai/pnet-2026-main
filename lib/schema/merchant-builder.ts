import type {
  Product,
  Organization,
  BreadcrumbList,
  WithContext,
  MerchantReturnPolicy,
  Offer,
} from "schema-dts";
import type {
  MerchantProduct,
  MerchantOffer,
  BreadcrumbItem,
} from "./merchant-types";

export function getAvailability(
  inventory?: number,
): "InStock" | "OutOfStock" | "PreOrder" {
  if (inventory === 0) return "OutOfStock";
  if (inventory !== undefined && inventory < 0) return "PreOrder";
  return "InStock";
}

export function buildMerchantReturnPolicy(): MerchantReturnPolicy {
  return {
    "@type": "MerchantReturnPolicy",
    name: "30-Day Return Policy",
    description: "Return within 30 days of receipt for digital products",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 30,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn",
    applicableCountry: "US",
  };
}

export function buildShippingDetails(offer: MerchantOffer) {
  if (!offer.shippingDetails) return undefined;

  const deliveryTime = offer.shippingDetails.deliveryTime;

  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: offer.shippingDetails.shippingRate ?? 0,
      currency: offer.shippingDetails.shippingRateCurrency ?? "USD",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry:
        offer.shippingDetails.shippingDestination?.addressCountry || "US",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: deliveryTime?.handlingTime ?? {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: deliveryTime?.transitTime ?? {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 2,
        unitCode: "DAY",
      },
    },
  } as any;
}

export function buildOffer(merchantOffer: MerchantOffer): Offer {
  const offer: Offer = {
    "@type": "Offer",
    price: merchantOffer.price,
    priceCurrency: merchantOffer.priceCurrency,
    availability: `https://schema.org/${merchantOffer.availability}`,
    url: merchantOffer.url,
  };

  if (merchantOffer.itemCondition) {
    (offer as any).itemCondition =
      `https://schema.org/${merchantOffer.itemCondition}`;
  }

  if (merchantOffer.priceValidUntil) {
    (offer as any).priceValidUntil = merchantOffer.priceValidUntil;
  }

  if (merchantOffer.hasMerchantReturnPolicy) {
    (offer as any).hasMerchantReturnPolicy =
      merchantOffer.hasMerchantReturnPolicy;
  }

  const shippingDetails = buildShippingDetails(merchantOffer);
  if (shippingDetails) {
    (offer as any).shippingDetails = shippingDetails;
  }

  return offer;
}

export function buildProductSchema(
  product: MerchantProduct,
): WithContext<Product> {
  const productSchema: Product = {
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    offers: buildOffer(product.offers),
    brand: {
      "@type": "Brand",
      name: product.brand.name,
      ...(product.brand.logo && { logo: product.brand.logo }),
    },
    category: "AI Products & Services",
  };

  if (product.sku) (productSchema as any).sku = product.sku;
  if (product.mpn) (productSchema as any).mpn = product.mpn;
  if (product.gtin) (productSchema as any).gtin = product.gtin;
  if (product.gtin13) (productSchema as any).gtin13 = product.gtin13;
  if (product.color) (productSchema as any).color = product.color;
  if (product.material) (productSchema as any).material = product.material;
  if (product.pattern) (productSchema as any).pattern = product.pattern;
  if (product.size) (productSchema as any).size = product.size;
  if (product.weight)
    (productSchema as any).weight = {
      "@type": "QuantitativeValue",
      value: product.weight,
      unitCode: product.weightUnit || "LBS",
    };
  if (product.aggregateRating) {
    (productSchema as any).aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.aggregateRating.ratingValue,
      reviewCount: product.aggregateRating.reviewCount,
      bestRating: product.aggregateRating.bestRating || 5,
      worstRating: product.aggregateRating.worstRating || 1,
    };
  }
  if (product.reviews && product.reviews.length > 0) {
    (productSchema as any).review = product.reviews.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author,
      },
      publisher: {
        "@type": "Organization",
        name: review.publisher,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.reviewRating.ratingValue,
        bestRating: review.reviewRating.bestRating,
      },
      ...(review.datePublished && { datePublished: review.datePublished }),
      ...(review.name && { name: review.name }),
      ...(review.reviewBody && { reviewBody: review.reviewBody }),
    }));
  }
  if (product.inProductGroupWithID)
    (productSchema as any).inProductGroupWithID = product.inProductGroupWithID;
  if (product.isVariantOf) {
    (productSchema as any).isVariantOf = {
      "@type": "ProductGroup",
      name: product.isVariantOf.name,
      productGroupID: product.isVariantOf.productGroupID,
    };
  }

  return {
    "@context": "https://schema.org",
    ...productSchema,
  };
}

export function buildOrganizationSchema(
  siteName: string,
  siteUrl: string,
): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/opengraph-image`,
    sameAs: [
      "https://twitter.com/m_pantaleone",
      "https://github.com/pantaleone-ai",
      "https://linkedin.com/in/m_pantaleone",
    ],
  };
}

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item,
    })),
  };
}
