/**
 * Analytics Utilities
 * Centralized e-commerce and conversion tracking for Google Analytics, PostHog, and Meta Pixel
 */

import { posthog } from "posthog-js";

export interface ProductEvent {
  id: string;
  name: string;
  category: string;
  price: number;
  currency?: string;
  brand?: string;
  index?: number;
  coupon?: string;
  discount?: number;
  affiliation?: string;
  itemVariant?: string;
  itemCategory2?: string;
  itemCategory3?: string;
  itemCategory4?: string;
  itemCategory5?: string;
  quantity?: number;
}

export interface PurchaseEvent {
  transactionId: string;
  value: number;
  currency: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  products: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    brand?: string;
    coupon?: string;
    discount?: number;
  }>;
}

export interface PromotionEvent {
  promotionId: string;
  promotionName: string;
  creativeName?: string;
  creativeSlot?: string;
}

export interface RefundEvent {
  transactionId: string;
  value: number;
  currency: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export interface BlogPostEvent {
  id: string;
  title: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime?: number;
  tags?: string[];
}

export interface BlogEngagementEvent {
  postId: string;
  scrollDepth: number;
  timeOnPage: number;
  readComplete: boolean;
}

export interface SearchEvent {
  query: string;
  resultCount: number;
  filters?: string[];
  searchType?: "global" | "blog" | "shop";
}

export interface SearchResultClickEvent {
  query: string;
  resultPosition: number;
  resultType: "blog" | "product";
  resultId: string;
  resultTitle: string;
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return posthog.has_opted_in_capturing();
  } catch {
    return false;
  }
}

export function isGaEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).gtag && !!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
}

export function isMetaPixelEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).fbq && !!process.env.NEXT_PUBLIC_META_PIXEL_ID;
}

export const ga4 = {
  viewItemList: (products: ProductEvent[], listName?: string) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "view_item_list", {
      items: products.map((product, index) => ({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || "USD",
        index: index + 1,
        item_brand: product.brand || "Pantaleone Digital Services",
        item_list_name: listName,
      })),
    });
  },

  viewItem: (product: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "view_item", {
      currency: product.currency || "USD",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  addToCart: (product: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "add_to_cart", {
      currency: product.currency || "USD",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  beginCheckout: (product: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "begin_checkout", {
      currency: product.currency || "USD",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  purchase: (purchase: PurchaseEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "purchase", {
      transaction_id: purchase.transactionId,
      currency: purchase.currency,
      value: purchase.value,
      tax: purchase.tax,
      shipping: purchase.shipping,
      coupon: purchase.coupon,
      items: purchase.products.map((product) => ({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: purchase.currency,
        quantity: product.quantity,
        coupon: product.coupon,
        discount: product.discount,
        item_brand: product.brand || "Pantaleone Digital Services",
      })),
    });
  },

  removeFromCart: (product: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "remove_from_cart", {
      currency: product.currency || "USD",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: product.quantity || 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  viewCart: (products: ProductEvent[], total: number) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "view_cart", {
      currency: products[0]?.currency || "USD",
      value: total,
      items: products.map((product, index) => ({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || "USD",
        quantity: product.quantity || 1,
        index: index + 1,
        item_brand: product.brand || "Pantaleone Digital Services",
      })),
    });
  },

  addToWishlist: (product: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "add_to_wishlist", {
      currency: product.currency || "USD",
      value: product.price,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  addShippingInfo: (product: ProductEvent, shippingTier: string) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "add_shipping_info", {
      currency: product.currency || "USD",
      value: product.price,
      shipping_tier: shippingTier,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  addPaymentInfo: (product: ProductEvent, paymentType: string) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "add_payment_info", {
      currency: product.currency || "USD",
      value: product.price,
      payment_type: paymentType,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          quantity: 1,
          item_brand: product.brand || "Pantaleone Digital Services",
        },
      ],
    });
  },

  selectItem: (product: ProductEvent, listName: string) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "select_item", {
      item_list_name: listName,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          item_category: product.category,
          price: product.price,
          currency: product.currency || "USD",
          index: product.index || 0,
          item_brand: product.brand || "Pantaleone Digital Services",
          item_list_name: listName,
        },
      ],
    });
  },

  viewPromotion: (promotion: PromotionEvent, product?: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "view_promotion", {
      creative_name: promotion.creativeName,
      creative_slot: promotion.creativeSlot,
      promotion_id: promotion.promotionId,
      promotion_name: promotion.promotionName,
      items: product
        ? [
            {
              item_id: product.id,
              item_name: product.name,
              item_category: product.category,
              price: product.price,
              currency: product.currency || "USD",
              item_brand: product.brand || "Pantaleone Digital Services",
            },
          ]
        : [],
    });
  },

  selectPromotion: (promotion: PromotionEvent, product?: ProductEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "select_promotion", {
      creative_name: promotion.creativeName,
      creative_slot: promotion.creativeSlot,
      promotion_id: promotion.promotionId,
      promotion_name: promotion.promotionName,
      items: product
        ? [
            {
              item_id: product.id,
              item_name: product.name,
              item_category: product.category,
              price: product.price,
              currency: product.currency || "USD",
              item_brand: product.brand || "Pantaleone Digital Services",
            },
          ]
        : [],
    });
  },

  refund: (refund: RefundEvent) => {
    if (!isGaEnabled()) return;
    (window as any).gtag("event", "refund", {
      currency: refund.currency,
      value: refund.value,
      transaction_id: refund.transactionId,
      tax: refund.tax,
      shipping: refund.shipping,
      coupon: refund.coupon,
      items: refund.products.map((product) => ({
        item_id: product.id,
        item_name: product.name,
        quantity: product.quantity,
      })),
    });
  },
};

export const posthogAnalytics = {
  productViewed: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("product_viewed", {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || "USD",
      brand: product.brand || "Pantaleone Digital Services",
    });
  },

  addToCart: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("add_to_cart", {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || "USD",
      brand: product.brand || "Pantaleone Digital Services",
      quantity: 1,
    });
  },

  checkoutStarted: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("checkout_started", {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || "USD",
      brand: product.brand || "Pantaleone Digital Services",
      quantity: 1,
    });
  },

  purchaseCompleted: (purchase: PurchaseEvent) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("purchase_completed", {
      transaction_id: purchase.transactionId,
      revenue: purchase.value,
      currency: purchase.currency,
      tax: purchase.tax,
      shipping: purchase.shipping,
      products: purchase.products,
      $set: {
        last_purchase_date: new Date().toISOString(),
        total_revenue: purchase.value,
      },
    });
  },
};

export const metaPixel = {
  viewContent: (product: ProductEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "ViewContent", {
      content_type: "product",
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
    });
  },

  addToCart: (product: ProductEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
    });
  },

  initiateCheckout: (product: ProductEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "InitiateCheckout", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
      num_items: 1,
    });
  },

  purchase: (purchase: PurchaseEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "Purchase", {
      content_ids: purchase.products.map((p) => p.id),
      content_type: "product",
      value: purchase.value,
      currency: purchase.currency,
      num_items: purchase.products.reduce((sum, p) => sum + p.quantity, 0),
    });
  },

  search: (query: string, value?: number, currency?: string) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "Search", {
      search_string: query,
      value: value,
      currency: currency || "USD",
    });
  },

  addToWishlist: (product: ProductEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "AddToWishlist", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
    });
  },

  viewCart: (products: ProductEvent[], total: number) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "ViewCart", {
      content_ids: products.map((p) => p.id),
      content_type: "product",
      value: total,
      currency: products[0]?.currency || "USD",
      num_items: products.reduce((sum, p) => sum + (p.quantity || 1), 0),
    });
  },

  removeFromCart: (product: ProductEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "RemoveFromCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
    });
  },

  addPaymentInfo: (product: ProductEvent, paymentType: string) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "AddPaymentInfo", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
      payment_type: paymentType,
    });
  },

  addShippingInfo: (product: ProductEvent, shippingTier: string) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "AddShippingInfo", {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || "USD",
      shipping_tier: shippingTier,
    });
  },

  contact: (contentName: string, contentCategory?: string) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "Contact", {
      content_name: contentName,
      content_category: contentCategory,
    });
  },

  refund: (refund: RefundEvent) => {
    if (!isMetaPixelEnabled()) return;
    (window as any).fbq("track", "Refund", {
      content_ids: refund.products.map((p) => p.id),
      content_type: "product",
      value: refund.value,
      currency: refund.currency,
      num_items: refund.products.reduce((sum, p) => sum + p.quantity, 0),
      transaction_id: refund.transactionId,
    });
  },
};

export const blogAnalytics = {
  postImpressions: (posts: BlogPostEvent[], listName?: string) => {
    if (!isAnalyticsEnabled()) return;
    posthog.capture("blog_posts_impressed", {
      posts: posts.map((post) => ({
        post_id: post.id,
        title: post.title,
        category: post.category,
        author: post.author,
        published_at: post.publishedAt,
        read_time: post.readTime,
        tags: post.tags,
      })),
      list_name: listName,
      count: posts.length,
    });
  },

  postEngaged: (engagement: BlogEngagementEvent) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("blog_post_engaged", {
        post_id: engagement.postId,
        scroll_depth: engagement.scrollDepth,
        time_on_page: engagement.timeOnPage,
        read_complete: engagement.readComplete,
      });
    }
    if (isGaEnabled()) {
      (window as any).gtag("event", "scroll", {
        event_category: "blog_engagement",
        post_id: engagement.postId,
        scroll_depth: engagement.scrollDepth,
        time_on_page: engagement.timeOnPage,
        read_complete: engagement.readComplete,
      });
    }
  },

  postViewed: (post: BlogPostEvent) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("blog_post_viewed", {
        post_id: post.id,
        title: post.title,
        category: post.category,
        author: post.author,
        published_at: post.publishedAt,
        read_time: post.readTime,
        tags: post.tags,
        $set: {
          last_blog_read: post.publishedAt,
          blog_categories_read: post.category,
        },
      });
    }
    if (isGaEnabled()) {
      (window as any).gtag("event", "view_item", {
        item_id: post.id,
        item_name: post.title,
        item_category: post.category,
        author: post.author,
        value: 1,
        currency: "USD",
      });
    }
  },
};

export const track = {
  productImpression: (products: ProductEvent[], listName?: string) => {
    ga4.viewItemList(products, listName);
  },

  productView: (product: ProductEvent) => {
    ga4.viewItem(product);
    if (isAnalyticsEnabled()) {
      posthogAnalytics.productViewed(product);
      metaPixel.viewContent(product);
    }
  },

  addToCart: (product: ProductEvent) => {
    ga4.addToCart(product);
    if (isAnalyticsEnabled()) {
      posthogAnalytics.addToCart(product);
      metaPixel.addToCart(product);
    }
  },

  beginCheckout: (product: ProductEvent) => {
    ga4.beginCheckout(product);
    if (isAnalyticsEnabled()) {
      posthogAnalytics.checkoutStarted(product);
      metaPixel.initiateCheckout(product);
    }
  },

  purchase: (purchase: PurchaseEvent) => {
    ga4.purchase(purchase);
    if (isAnalyticsEnabled()) {
      posthogAnalytics.purchaseCompleted(purchase);
      metaPixel.purchase(purchase);
    }
  },

  removeFromCart: (product: ProductEvent) => {
    ga4.removeFromCart(product);
    if (isAnalyticsEnabled()) {
      metaPixel.removeFromCart(product);
    }
  },

  viewCart: (products: ProductEvent[], total: number) => {
    ga4.viewCart(products, total);
    if (isAnalyticsEnabled()) {
      metaPixel.viewCart(products, total);
    }
  },

  addToWishlist: (product: ProductEvent) => {
    ga4.addToWishlist(product);
    if (isAnalyticsEnabled()) {
      metaPixel.addToWishlist(product);
    }
  },

  addShippingInfo: (product: ProductEvent, shippingTier: string) => {
    ga4.addShippingInfo(product, shippingTier);
    if (isAnalyticsEnabled()) {
      metaPixel.addShippingInfo(product, shippingTier);
    }
  },

  addPaymentInfo: (product: ProductEvent, paymentType: string) => {
    ga4.addPaymentInfo(product, paymentType);
    if (isAnalyticsEnabled()) {
      metaPixel.addPaymentInfo(product, paymentType);
    }
  },

  selectItem: (product: ProductEvent, listName: string) => {
    ga4.selectItem(product, listName);
  },

  viewPromotion: (promotion: PromotionEvent, product?: ProductEvent) => {
    ga4.viewPromotion(promotion, product);
  },

  selectPromotion: (promotion: PromotionEvent, product?: ProductEvent) => {
    ga4.selectPromotion(promotion, product);
  },

  refund: (refund: RefundEvent) => {
    ga4.refund(refund);
    if (isAnalyticsEnabled()) {
      metaPixel.refund(refund);
    }
  },

  blogPostImpression: (posts: BlogPostEvent[], listName?: string) => {
    blogAnalytics.postImpressions(posts, listName);
  },

  blogPostView: (post: BlogPostEvent) => {
    blogAnalytics.postViewed(post);
  },

  blogPostEngaged: (engagement: BlogEngagementEvent) => {
    blogAnalytics.postEngaged(engagement);
  },

  searchPerformed: (search: SearchEvent) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("search_performed", {
        query: search.query,
        result_count: search.resultCount,
        filters: search.filters,
        search_type: search.searchType,
        $set: {
          last_search_date: new Date().toISOString(),
          search_queries: search.query,
        },
      });
      metaPixel.search(search.query);
    }
    if (isGaEnabled()) {
      (window as any).gtag("event", "search", {
        search_term: search.query,
        results_count: search.resultCount,
      });
    }
  },

  searchResultClicked: (click: SearchResultClickEvent) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("search_result_clicked", {
        query: click.query,
        result_position: click.resultPosition,
        result_type: click.resultType,
        result_id: click.resultId,
        result_title: click.resultTitle,
      });
    }
    if (isGaEnabled()) {
      (window as any).gtag("event", "select_content", {
        content_type: click.resultType,
        content_id: click.resultId,
        search_term: click.query,
      });
    }
  },

  ctaClicked: (ctaType: string, ctaLabel: string, destinationUrl?: string) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("cta_clicked", {
        cta_type: ctaType,
        cta_label: ctaLabel,
        destination_url: destinationUrl,
      });
    }
    if (isGaEnabled() && ctaType === "contact") {
      (window as any).gtag("event", "generate_lead", {
        cta_type: ctaType,
        cta_label: ctaLabel,
        destination_url: destinationUrl,
      });
    }
    if (isMetaPixelEnabled() && ctaType === "contact") {
      metaPixel.contact(ctaLabel);
    }
  },

  outboundLinkClicked: (url: string, linkText: string) => {
    if (isAnalyticsEnabled()) {
      posthog.capture("outbound_link_clicked", {
        url: url,
        link_text: linkText,
      });
    }
    if (isGaEnabled()) {
      (window as any).gtag("event", "click", {
        event_category: "outbound",
        event_label: linkText,
        transport_type: "beacon",
        href: url,
      });
    }
  },
};

export const serverTrack = {
  purchase: async (purchase: PurchaseEvent, clientId?: string) => {
    const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    const apiSecret = process.env.GA_API_SECRET;
    if (!measurementId || !apiSecret) return;
    try {
      const payload = {
        client_id: clientId || "anonymous",
        events: [
          {
            name: "purchase",
            params: {
              transaction_id: purchase.transactionId,
              currency: purchase.currency,
              value: purchase.value,
              tax: purchase.tax,
              shipping: purchase.shipping,
              coupon: purchase.coupon,
              items: purchase.products.map((product) => ({
                item_id: product.id,
                item_name: product.name,
                item_category: product.category,
                price: product.price,
                quantity: product.quantity,
                coupon: product.coupon,
                discount: product.discount,
                item_brand: product.brand || "Pantaleone Digital Services",
              })),
            },
          },
        ],
      };
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      console.error("GA4 Measurement Protocol purchase error:", error);
    }
  },

  refund: async (refund: RefundEvent, clientId?: string) => {
    const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
    const apiSecret = process.env.GA_API_SECRET;
    if (!measurementId || !apiSecret) return;
    try {
      const payload = {
        client_id: clientId || "anonymous",
        events: [
          {
            name: "refund",
            params: {
              currency: refund.currency,
              value: refund.value,
              transaction_id: refund.transactionId,
              tax: refund.tax,
              shipping: refund.shipping,
              coupon: refund.coupon,
              items: refund.products.map((product) => ({
                item_id: product.id,
                item_name: product.name,
                quantity: product.quantity,
              })),
            },
          },
        ],
      };
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      console.error("GA4 Measurement Protocol refund error:", error);
    }
  },

  purchaseMeta: async (purchase: PurchaseEvent, eventId?: string) => {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!pixelId || !accessToken) return;
    try {
      const eventData = {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId || purchase.transactionId,
        custom_data: {
          content_ids: purchase.products.map((p) => p.id),
          content_type: "product",
          value: purchase.value,
          currency: purchase.currency,
          num_items: purchase.products.reduce((sum, p) => sum + p.quantity, 0),
          transaction_id: purchase.transactionId,
        },
      };
      await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [eventData],
          access_token: accessToken,
        }),
      });
    } catch (error) {
      console.error("Meta CAPI purchase error:", error);
    }
  },

  refundMeta: async (refund: RefundEvent, eventId?: string) => {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!pixelId || !accessToken) return;
    try {
      const eventData = {
        event_name: "Refund",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId || `refund_${refund.transactionId}`,
        custom_data: {
          content_ids: refund.products.map((p) => p.id),
          content_type: "product",
          value: refund.value,
          currency: refund.currency,
          num_items: refund.products.reduce((sum, p) => sum + p.quantity, 0),
          transaction_id: refund.transactionId,
        },
      };
      await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [eventData],
          access_token: accessToken,
        }),
      });
    } catch (error) {
      console.error("Meta CAPI refund error:", error);
    }
  },
};
