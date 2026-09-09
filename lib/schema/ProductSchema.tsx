import type { MerchantReview } from "./merchant-types";

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string[];
  price: number;
  priceCurrency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  itemCondition?: "NewCondition" | "UsedCondition" | "RefurbishedCondition";
  priceValidUntil?: string;
  url: string;
  sku?: string;
  mpn?: string;
  brandName?: string;
  brandLogo?: string;
  ratingValue?: number;
  reviewCount?: number;
  bestRating?: number;
  worstRating?: number;
  reviews?: MerchantReview[];
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  priceCurrency = "USD",
  availability = "InStock",
  itemCondition = "NewCondition",
  priceValidUntil,
  url,
  sku,
  mpn,
  brandName = "Pantaleone Digital Services",
  brandLogo,
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1,
  reviews,
}: ProductSchemaProps) {
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability: `https://schema.org/${availability}`,
      itemCondition: `https://schema.org/${itemCondition}`,
      url,
      ...(priceValidUntil && { priceValidUntil }),
    },
    brand: {
      "@type": "Brand",
      name: brandName,
      ...(brandLogo && { logo: brandLogo }),
    },
    ...(sku && { sku }),
    ...(mpn && { mpn }),
    ...(ratingValue && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        reviewCount: reviewCount || 0,
        bestRating,
        worstRating,
      },
    }),
    ...(reviews &&
      reviews.length > 0 && {
        review: reviews.map((review) => ({
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
        })),
      }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(productSchema),
      }}
    />
  );
}
