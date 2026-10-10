/**
 * Portfolio registry — single source of truth for Pantaleone apps.
 *
 * One parent / many brands / shared infra / independent data + economics /
 * centralized reporting. No shared pixels or audiences across unrelated apps.
 *
 * Verification 2026-10-01:
 * - Repos verified via `gh repo list pantaleone-ai`: synthetic.pics,
 *   mixphd-2026, proswing, imgsquash-2026, print3dmodels.com,
 *   aicapturelab.com, aiceo.io, profitsignals. No `agentlibrary.ai` — omitted.
 * - print3dmodels.com verified live (real storefront, printed-to-order
 *   checkout) — included with activation `purchase`.
 * - Canonical domains below verified 2026-09-21 (see ecosystem.ts history)
 *   + 2026-10-01 re-check for print3dmodels.com.
 * - Analytics IDs are intentionally `null` until per-app configuration
 *   lands. Absent = disabled. Never fabricate IDs or metrics.
 */

export type PortfolioStatus = "live" | "beta" | "unverified" | "archived";

export type Monetization = {
  hasProducts: boolean;
  hasSubscriptions: boolean;
  hasAffiliateRevenue: boolean;
  stripeSlug?: string;
};

export type ChannelFit = {
  meta: boolean;
  google: boolean;
  pinterest: boolean;
  x: boolean;
  reddit: boolean;
};

export type PortfolioAppImage = {
  src: string;
  alt: string;
};

export type PortfolioApp = {
  id: string;
  name: string;
  domain: string;
  description: string;
  category: string;
  image: PortfolioAppImage;
  status: PortfolioStatus;
  githubRepo: string;
  vercelProject: string;
  primaryCTA: { label: string; href: string };
  primaryActivationEvent: string;
  secondaryEvents?: string[];
  monetization: Monetization;
  channelFit: ChannelFit;
  social?: { x?: string; pinterest?: string; reddit?: string };
  ids: { ga4: string | null; meta: string | null };
};

export const PORTFOLIO_APPS: PortfolioApp[] = [
  {
    id: "synthetic-pics",
    name: "Synthetic Pics",
    domain: "https://www.synthetic.pics",
    description:
      "Human-guided generative art gallery with purchasable downloads.",
    category: "Generative Art",
    image: {
      src: "https://www.synthetic.pics/opengraph-image",
      alt: "Synthetic Pics generative art preview",
    },
    status: "live",
    githubRepo: "pantaleone-ai/synthetic.pics",
    vercelProject: "synthetic.pics",
    primaryCTA: {
      label: "Explore the gallery",
      href: "https://www.synthetic.pics",
    },
    primaryActivationEvent: "artwork_downloaded",
    secondaryEvents: ["artwork_saved"],
    monetization: {
      hasProducts: true,
      hasSubscriptions: false,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: true,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "mixphd",
    name: "MixPHD",
    domain: "https://www.mixphd.com",
    description: "Drink recipes, My Bar matching, and curated barware.",
    category: "Food & Drink",
    image: {
      src: "/images/projects/mixphd/mixphd-home.webp",
      alt: "MixPHD drink discovery home screen",
    },
    status: "live",
    githubRepo: "pantaleone-ai/mixphd-2026",
    vercelProject: "mixphd-2026",
    primaryCTA: { label: "Find a drink", href: "https://www.mixphd.com" },
    primaryActivationEvent: "recipe_saved",
    secondaryEvents: ["affiliate_click"],
    monetization: {
      hasProducts: false,
      hasSubscriptions: false,
      hasAffiliateRevenue: true,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: true,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "proswing",
    name: "ProSwing",
    domain: "https://www.proswing.net",
    description: "Baseball swing analysis app.",
    category: "Sports",
    image: {
      src: "https://img.pantaleone.net/proswing-hero.avif",
      alt: "ProSwing swing score and video upload screen",
    },
    status: "live",
    githubRepo: "pantaleone-ai/proswing",
    vercelProject: "proswing",
    primaryCTA: {
      label: "Analyze your swing",
      href: "https://www.proswing.net",
    },
    primaryActivationEvent: "analysis_completed",
    secondaryEvents: ["swing_uploaded"],
    monetization: {
      hasProducts: false,
      hasSubscriptions: false,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: false,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "imgsquash",
    name: "ImgSquash",
    domain: "https://imgsquash.com",
    description: "Image compression tool.",
    category: "Developer Tools",
    image: {
      src: "/images/projects/imgsquash/imgsquash-home.webp",
      alt: "ImgSquash image compression tool",
    },
    status: "live",
    githubRepo: "pantaleone-ai/imgsquash-2026",
    vercelProject: "imgsquash-2026",
    primaryCTA: { label: "Compress images", href: "https://imgsquash.com" },
    primaryActivationEvent: "compression_completed",
    monetization: {
      hasProducts: false,
      hasSubscriptions: false,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: false,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "print3dmodels",
    name: "Print3DModels",
    domain: "https://www.print3dmodels.com",
    description: "Unique 3D-printed objects, printed to order and shipped.",
    category: "E-commerce",
    image: {
      src: "https://www.print3dmodels.com/og-image.jpg",
      alt: "Print3DModels 3D print storefront preview",
    },
    status: "live",
    githubRepo: "pantaleone-ai/print3dmodels.com",
    vercelProject: "print3dmodels.com",
    primaryCTA: { label: "Shop prints", href: "https://www.print3dmodels.com" },
    primaryActivationEvent: "purchase",
    secondaryEvents: ["product_viewed"],
    monetization: {
      hasProducts: true,
      hasSubscriptions: false,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: true,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "aicapturelab",
    name: "AI Capture Lab",
    domain: "https://www.aicapturelab.com",
    description: "Virtual product photography studio.",
    category: "Photography",
    image: {
      src: "https://img.pantaleone.net/aicapturelab-hero.avif",
      alt: "AI Capture Lab virtual product photography preview",
    },
    status: "live",
    githubRepo: "pantaleone-ai/aicapturelab.com",
    vercelProject: "aicapturelab.com",
    primaryCTA: {
      label: "Create photos",
      href: "https://www.aicapturelab.com",
    },
    primaryActivationEvent: "download_completed",
    monetization: {
      hasProducts: true,
      hasSubscriptions: false,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: true,
      x: true,
      reddit: false,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "aiceo",
    name: "AICEO",
    domain: "https://aiceo.io",
    description: "AI executive platform for teams.",
    category: "Business AI",
    image: {
      src: "https://img.pantaleone.net/aiceo-hero.avif",
      alt: "AICEO AI platform preview",
    },
    status: "live",
    githubRepo: "pantaleone-ai/aiceo.io",
    vercelProject: "aiceo.io",
    primaryCTA: { label: "Explore AICEO", href: "https://aiceo.io" },
    primaryActivationEvent: "workflow_completed",
    monetization: {
      hasProducts: false,
      hasSubscriptions: true,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: false,
      x: true,
      reddit: false,
    },
    ids: { ga4: null, meta: null },
  },
  {
    id: "profitsignals",
    name: "ProfitSignals",
    domain: "https://www.profitsignals.xyz",
    description: "AI market intelligence signals.",
    category: "Finance",
    image: {
      src: "/images/projects/profitsignals/4.png",
      alt: "ProfitSignals market intelligence preview",
    },
    status: "live",
    githubRepo: "pantaleone-ai/profitsignals",
    vercelProject: "profitsignals",
    primaryCTA: { label: "Get signals", href: "https://www.profitsignals.xyz" },
    primaryActivationEvent: "subscription_started",
    monetization: {
      hasProducts: false,
      hasSubscriptions: true,
      hasAffiliateRevenue: false,
    },
    channelFit: {
      meta: true,
      google: true,
      pinterest: false,
      x: true,
      reddit: true,
    },
    ids: { ga4: null, meta: null },
  },
];

export const PORTFOLIO_IDS = PORTFOLIO_APPS.map((app) => app.id);

export function getPortfolioApp(id: string): PortfolioApp | undefined {
  return PORTFOLIO_APPS.find((app) => app.id === id);
}
