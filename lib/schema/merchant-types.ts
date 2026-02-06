import type { MerchantReturnPolicy } from "schema-dts";

export interface MerchantOffer {
  price: number;
  priceCurrency: string;
  availability: "InStock" | "OutOfStock" | "PreOrder" | "BackOrder";
  itemCondition?: "NewCondition" | "UsedCondition" | "RefurbishedCondition";
  priceValidUntil?: string;
  url: string;
  hasMerchantReturnPolicy?: MerchantReturnPolicy;
  shippingDetails?: {
    shippingRate: number;
    shippingCurrency: string;
    deliveryTime: {
      businessDays: number;
      handlingTime: number;
    };
  };
}

export interface MerchantProduct {
  name: string;
  description: string;
  image: string[];
  offers: MerchantOffer;
  brand: {
    name: string;
    logo?: string;
  };
  sku?: string;
  mpn?: string;
  gtin?: string;
  gtin13?: string;
  color?: string;
  material?: string;
  pattern?: string;
  size?: string;
  weight?: number;
  weightUnit?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  inProductGroupWithID?: string;
  isVariantOf?: {
    name: string;
    productGroupID: string;
  };
}

export interface BreadcrumbItem {
  name: string;
  item: string;
}
