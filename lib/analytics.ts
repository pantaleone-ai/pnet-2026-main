/**
 * Analytics Utilities
 * Centralized e-commerce and conversion tracking for Google Analytics, PostHog, and Meta Pixel
 */

import { posthog } from 'posthog-js'

// Analytics event types
export interface ProductEvent {
  id: string
  name: string
  category: string
  price: number
  currency?: string
  brand?: string
}

export interface PurchaseEvent {
  transactionId: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  products: Array<{
    id: string
    name: string
    category: string
    price: number
    quantity: number
    brand?: string
  }>
}

export interface BlogPostEvent {
  id: string
  title: string
  category: string
  author: string
  publishedAt: string
  readTime?: number
  tags?: string[]
}

export interface BlogEngagementEvent {
  postId: string
  scrollDepth: number
  timeOnPage: number
  readComplete: boolean
}

export interface SearchEvent {
  query: string
  resultCount: number
  filters?: string[]
  searchType?: 'global' | 'blog' | 'shop'
}

export interface SearchResultClickEvent {
  query: string
  resultPosition: number
  resultType: 'blog' | 'product'
  resultId: string
  resultTitle: string
}

// Check if analytics is enabled and user has consented
function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false

  // Check PostHog consent (our primary consent mechanism)
  try {
    return posthog.has_opted_in_capturing()
  } catch {
    return false
  }
}

// Google Analytics 4 E-commerce Tracking
export const ga4 = {
  // Product impressions (when products are viewed in a list)
  viewItemList: (products: ProductEvent[], listName?: string) => {
    if (!isAnalyticsEnabled() || !(window as any).gtag) return

    (window as any).gtag('event', 'view_item_list', {
      items: products.map((product, index) => ({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || 'USD',
        index: index + 1,
        item_brand: product.brand || 'Pantaleone Digital Services',
        item_list_name: listName
      }))
    })
  },

  // Individual product view
  viewItem: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).gtag) return

    (window as any).gtag('event', 'view_item', {
      currency: product.currency || 'USD',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || 'USD',
        item_brand: product.brand || 'Pantaleone Digital Services'
      }]
    })
  },

  // Add to cart
  addToCart: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).gtag) return

    (window as any).gtag('event', 'add_to_cart', {
      currency: product.currency || 'USD',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || 'USD',
        quantity: 1,
        item_brand: product.brand || 'Pantaleone Digital Services'
      }]
    })
  },

  // Begin checkout (when user clicks payment link)
  beginCheckout: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).gtag) return

    (window as any).gtag('event', 'begin_checkout', {
      currency: product.currency || 'USD',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: product.currency || 'USD',
        quantity: 1,
        item_brand: product.brand || 'Pantaleone Digital Services'
      }]
    })
  },

  // Purchase completion (server-side tracking via webhook)
  purchase: (purchase: PurchaseEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).gtag) return

    (window as any).gtag('event', 'purchase', {
      transaction_id: purchase.transactionId,
      currency: purchase.currency,
      value: purchase.value,
      tax: purchase.tax,
      shipping: purchase.shipping,
      items: purchase.products.map(product => ({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.price,
        currency: purchase.currency,
        quantity: product.quantity,
        item_brand: product.brand || 'Pantaleone Digital Services'
      }))
    })
  }
}

// PostHog E-commerce Tracking
export const posthogAnalytics = {
  // Product viewed
  productViewed: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('product_viewed', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || 'USD',
      brand: product.brand || 'Pantaleone Digital Services'
    })
  },

  // Add to cart (click on payment link)
  addToCart: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('add_to_cart', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || 'USD',
      brand: product.brand || 'Pantaleone Digital Services',
      quantity: 1
    })
  },

  // Checkout started
  checkoutStarted: (product: ProductEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('checkout_started', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency || 'USD',
      brand: product.brand || 'Pantaleone Digital Services',
      quantity: 1
    })
  },

  // Purchase completed
  purchaseCompleted: (purchase: PurchaseEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('purchase_completed', {
      transaction_id: purchase.transactionId,
      revenue: purchase.value,
      currency: purchase.currency,
      tax: purchase.tax,
      shipping: purchase.shipping,
      products: purchase.products,
      $set: {
        last_purchase_date: new Date().toISOString(),
        total_revenue: purchase.value // This will be merged with user properties
      }
    })
  }
}

// Meta Pixel Commerce Events
export const metaPixel = {
  // View content (product detail page)
  viewContent: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).fbq) return

    (window as any).fbq('track', 'ViewContent', {
      content_type: 'product',
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || 'USD'
    })
  },

  // Add to cart
  addToCart: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).fbq) return

    (window as any).fbq('track', 'AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || 'USD'
    })
  },

  // Initiate checkout
  initiateCheckout: (product: ProductEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).fbq) return

    (window as any).fbq('track', 'InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      content_category: product.category,
      value: product.price,
      currency: product.currency || 'USD',
      num_items: 1
    })
  },

  // Purchase
  purchase: (purchase: PurchaseEvent) => {
    if (!isAnalyticsEnabled() || !(window as any).fbq) return

    (window as any).fbq('track', 'Purchase', {
      content_ids: purchase.products.map(p => p.id),
      content_type: 'product',
      value: purchase.value,
      currency: purchase.currency,
      num_items: purchase.products.reduce((sum, p) => sum + p.quantity, 0)
    })
  }
}

// Blog Analytics Tracking
export const blogAnalytics = {
  // Blog post impressions (when posts are viewed in a list)
  postImpressions: (posts: BlogPostEvent[], listName?: string) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('blog_posts_impressed', {
      posts: posts.map(post => ({
        post_id: post.id,
        title: post.title,
        category: post.category,
        author: post.author,
        published_at: post.publishedAt,
        read_time: post.readTime,
        tags: post.tags
      })),
      list_name: listName,
      count: posts.length
    })
  },

  // Individual blog post view
  postViewed: (post: BlogPostEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('blog_post_viewed', {
      post_id: post.id,
      title: post.title,
      category: post.category,
      author: post.author,
      published_at: post.publishedAt,
      read_time: post.readTime,
      tags: post.tags,
      $set: {
        last_blog_read: post.publishedAt,
        blog_categories_read: post.category // This will be appended to user properties
      }
    })
  },

  // Blog engagement (scroll depth, time on page)
  postEngaged: (engagement: BlogEngagementEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('blog_post_engaged', {
      post_id: engagement.postId,
      scroll_depth: engagement.scrollDepth,
      time_on_page: engagement.timeOnPage,
      read_complete: engagement.readComplete
    })
  }
}

// Unified tracking functions
export const track = {
  // Product interactions
  productImpression: (products: ProductEvent[], listName?: string) => {
    ga4.viewItemList(products, listName)
    // PostHog doesn't have a direct equivalent for impressions
  },

  productView: (product: ProductEvent) => {
    ga4.viewItem(product)
    posthogAnalytics.productViewed(product)
    metaPixel.viewContent(product)
  },

  addToCart: (product: ProductEvent) => {
    ga4.addToCart(product)
    posthogAnalytics.addToCart(product)
    metaPixel.addToCart(product)
  },

  beginCheckout: (product: ProductEvent) => {
    ga4.beginCheckout(product)
    posthogAnalytics.checkoutStarted(product)
    metaPixel.initiateCheckout(product)
  },

  // Purchase completion (typically called server-side via webhook)
  purchase: (purchase: PurchaseEvent) => {
    ga4.purchase(purchase)
    posthogAnalytics.purchaseCompleted(purchase)
    metaPixel.purchase(purchase)
  },

  // Blog interactions
  blogPostImpression: (posts: BlogPostEvent[], listName?: string) => {
    blogAnalytics.postImpressions(posts, listName)
  },

  blogPostView: (post: BlogPostEvent) => {
    blogAnalytics.postViewed(post)
  },

  blogPostEngaged: (engagement: BlogEngagementEvent) => {
    blogAnalytics.postEngaged(engagement)
  },

  // Search interactions
  searchPerformed: (search: SearchEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('search_performed', {
      query: search.query,
      result_count: search.resultCount,
      filters: search.filters,
      search_type: search.searchType,
      $set: {
        last_search_date: new Date().toISOString(),
        search_queries: search.query // This will be appended to user properties
      }
    })

    // Google Analytics search tracking
    if ((window as any).gtag) {
      (window as any).gtag('event', 'search', {
        search_term: search.query,
        results_count: search.resultCount
      })
    }
  },

  searchResultClicked: (click: SearchResultClickEvent) => {
    if (!isAnalyticsEnabled()) return

    posthog.capture('search_result_clicked', {
      query: click.query,
      result_position: click.resultPosition,
      result_type: click.resultType,
      result_id: click.resultId,
      result_title: click.resultTitle
    })

    // Google Analytics event for search result clicks
    if ((window as any).gtag) {
      (window as any).gtag('event', 'select_content', {
        content_type: click.resultType,
        content_id: click.resultId,
        search_term: click.query
      })
    }
  }
}
