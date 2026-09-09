# Google Merchant Listing & Product SEO Implementation

## Overview

This implementation adds comprehensive Google Merchant Listing structured data, Open Graph tags, and SEO optimization for all product pages in the shop.

## What Was Implemented

### 1. TypeScript Type Definitions (`lib/schema/merchant-types.ts`)

Complete TypeScript interfaces for merchant listing structured data:
- `MerchantOffer` - Offer details with pricing, availability, shipping
- `MerchantProduct` - Full product schema including all required and recommended fields
- `BreadcrumbItem` - Breadcrumb list schema

### 2. Schema Builders (`lib/schema/merchant-builder.ts`)

Functions to generate Google-compliant structured data:
- `buildProductSchema()` - Full Product schema with all required/recommended fields
- `buildOffer()` - Offer schema with shipping, returns, pricing
- `buildMerchantReturnPolicy()` - 30-day return policy schema
- `buildShippingDetails()` - Shipping information schema
- `buildOrganizationSchema()` - Organization schema for site-wide SEO
- `buildBreadcrumbSchema()` - BreadcrumbList schema

### 3. JSON-LD Components (`lib/schema/json-ld.tsx`)

React components for server-rendered structured data:
- `JsonLd` - Base component for any schema.org data
- `ProductJsonLd` - Product structured data component
- `OrganizationJsonLd` - Organization structured data component
- `BreadcrumbJsonLd` - Breadcrumb list component

### 4. Product Converters (`lib/schema/product-converter.ts`)

Utilities to convert ShopProduct to MerchantProduct:
- `convertShopProductToMerchantProduct()` - Maps product data to merchant schema
- `buildBreadcrumbItems()` - Generates breadcrumb navigation
- `getOpenGraphImages()` - Generates OG image array with multiple formats

### 5. Product Page Integration (`app/(app)/(root)/shop/[category]/[slug]/page.tsx`)

Enhanced product page with:
- Complete `generateMetadata()` function with all Open Graph tags
- Product JSON-LD schema (Google Merchant Listing)
- Breadcrumb JSON-LD schema
- Organization JSON-LD schema
- Dynamic meta tags for price, availability, currency

## Features

### Google Merchant Listing Compliance

All **Required** properties:
- ✅ `name` - Product title
- ✅ `image` - Multiple high-res images (1:1, 4:3, 16:9)
- ✅ `offers` - Single Offer object with:
  - ✅ `price` > 0
  - ✅ `priceCurrency` (ISO 4217)

All **Recommended** properties:
- ✅ `description` - Product description
- ✅ `sku` - Stock Keeping Unit
- ✅ `mpn` - Manufacturer Part Number
- ✅ `gtin` - Global Trade Item Number
- ✅ `brand.name` - Brand information
- ✅ `availability` - InStock/OutOfStock/PreOrder
- ✅ `itemCondition` - NewCondition/UsedCondition/RefurbishedCondition
- ✅ `url` - Product page URL
- ✅ `hasMerchantReturnPolicy` - Full return policy object
- ✅ `shippingDetails` - Shipping rate, destination, delivery time
- ✅ `priceValidUntil` - Sale expiration date

### Open Graph & Social Media Optimization

Meta/Facebook/Instagram/LinkedIn/Pinterest:
- ✅ `og:type = "product"`
- ✅ `og:title` - Product title
- ✅ `og:description` - Product description
- ✅ `og:image` - 1200×630 images (multiple)
- ✅ `og:url` - Product URL
- ✅ `product:price:amount` + `product:price:currency`
- ✅ `product:availability`

Twitter Cards:
- ✅ `twitter:card = "summary_large_image"`
- ✅ `twitter:title`
- ✅ `twitter:description`
- ✅ `twitter:image`

### Additional SEO Enhancements

- ✅ BreadcrumbList schema on all product pages
- ✅ Organization schema on all product pages
- ✅ MerchantReturnPolicy schema on all product pages
- ✅ Shipping details for physical products
- ✅ Canonical URLs
- ✅ Dynamic keywords based on product data

## Database Schema Recommendations

### Product Frontmatter Fields (Already Implemented)

Your MDX files already support these fields:

```yaml
---
title: Product Name
description: Product description
price: 100
currency: USD
sku: PROD-001
mpn: MPN-123
gtin: 1234567890123
inventory: 10
itemCondition: NewCondition
priceValidUntil: 2026-12-31
brandLogo: https://example.com/logo.png
isDigital: true
category: Apps
featured: false
imageUrl: https://example.com/image.jpg
imageAlt: Product image
additionalImages:
  - url: https://example.com/image2.jpg
    alt: Additional view
---
```

### Recommended Additions for Future

If you want to add these fields to your MDX frontmatter:

1. **Product Reviews/Ratings** (add to `base-schemas.ts`):
```typescript
rating?: {
  ratingValue: number;
  reviewCount: number;
}
```

2. **Product Variants** (for product groups):
```typescript
productGroupId?: string;
variants?: Array<{
  name: string;
  sku: string;
  price: number;
  color?: string;
  size?: string;
}>
```

3. **Shipping Information** (per product):
```typescript
shipping?: {
  rate: number;
  handlingDays: number;
  transitDays: number;
}
```

## Testing Checklist

### Google Rich Results Test
1. Go to https://search.google.com/test/rich-results
2. Enter a product URL (e.g., `https://pantaleone.net/shop/ai-apps/profitsignals-app`)
3. Verify:
   - Product schema is detected
   - All required fields are present
   - No errors or warnings

### Google Search Console
1. Go to Google Search Console
2. Use URL Inspection tool on a product page
3. Click "Request Indexing"
4. Check for any errors in Coverage report

### Facebook Sharing Debugger
1. Go to https://developers.facebook.com/tools/debug/
2. Enter a product URL
3. Verify:
   - og:type is "product"
   - Price and availability are shown
   - Images are correct size (1200×630)

### Twitter Card Validator
1. Go to https://cards-dev.twitter.com/validator
2. Enter a product URL
3. Verify summary_large_image card appears

### Lighthouse SEO Audit
1. Open Chrome DevTools on a product page
2. Run Lighthouse > SEO
3. Check:
   - Document has a meta description
   - Links have descriptive text
   - Structured data is valid
   - Score is 90+

### Manual Testing

1. View page source on a product page
2. Search for `application/ld+json`
3. Verify all three schemas are present:
   - Product schema
   - BreadcrumbList schema
   - Organization schema

## Next Steps

1. **Update Product MDX Files**
   - Add missing fields (sku, mpn, gtin) where applicable
   - Ensure all products have high-res images (min 1200×630)
   - Add priceValidUntil for sales

2. **Set Up Google Merchant Center**
   - Create account at https://www.google.com/retail/solutions/merchant-center/
   - Connect your domain via DNS verification
   - Submit product feed via API or XML sitemap

3. **Submit to Search Engines**
   - Submit updated sitemap to Google Search Console
   - Request indexing for all product pages
   - Monitor for any errors in Coverage report

4. **Monitor Analytics**
   - Track CTR improvements from rich snippets
   - Monitor conversion rates from product pages
   - Check Facebook/Twitter share counts

5. **Future Enhancements** (Optional):
   - Add product reviews/ratings system
   - Implement product variants with ProductGroup schema
   - Add Review schema for customer testimonials
   - Set up dynamic OG image generation

## Files Modified

- `lib/schema/merchant-types.ts` (NEW)
- `lib/schema/merchant-builder.ts` (NEW)
- `lib/schema/json-ld.tsx` (NEW)
- `lib/schema/product-converter.ts` (NEW)
- `lib/schema/product-metadata.ts` (NEW)
- `app/(app)/(root)/shop/[category]/[slug]/page.tsx` (UPDATED)
- `.env.local` (UPDATED - added RESEND_API_KEY)

## Technical Notes

- All structured data is server-rendered (no client-side JS)
- Schema-dts library ensures type safety
- Follows Google's exact property naming conventions
- Supports both digital and physical products
- Handles availability states (InStock, OutOfStock, PreOrder)
- Includes comprehensive shipping details for physical products
- 30-day return policy configured for all products
- Organization schema includes social media links
- Breadcrumb schema for navigation hierarchy

## Google Merchant Listing Schema Reference

https://developers.google.com/search/docs/appearance/structured-data/merchant-listing

## Product Schema Reference

https://developers.google.com/search/docs/appearance/structured-data/product
