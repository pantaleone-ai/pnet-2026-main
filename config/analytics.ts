/**
 * Analytics Configuration
 * Centralized configuration for all analytics services
 */

export const analyticsConfig = {
  // Google Analytics configuration
  googleAnalytics: {
    enabled: !!process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    id: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "",
  },

  // Meta Pixel configuration
  metaPixel: {
    enabled: !!process.env.NEXT_PUBLIC_META_PIXEL_ID,
    id: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  },

  // PostHog configuration (existing)
  posthog: {
    enabled: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    uiHost: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || "https://app.posthog.com",
  },
};

export type AnalyticsConfig = typeof analyticsConfig;
