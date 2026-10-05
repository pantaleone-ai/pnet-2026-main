import type { GrowthEventName } from "@/lib/growth/events";

/**
 * Product strategy matrix. Grounded in config/portfolio.ts:
 * domain, primaryActivationEvent, monetization, channelFit.
 * No invented features, pricing, or testimonials.
 */

export type ProductStrategy = {
  appId: string;
  domain: string;
  audience: string;
  problem: string;
  valueProposition: string;
  primaryConversion: string;
  secondaryConversion: string;
  primaryCta: string;
  secondaryCta: string;
  activationEvent: GrowthEventName;
  revenueEvent: GrowthEventName | null;
  bestPlatforms: string[];
  bestFormats: string[];
  recurringThemes: string[];
  postsPerWeek: number;
  postingWindows: string[];
};

export const PRODUCT_STRATEGIES: ProductStrategy[] = [
  {
    appId: "synthetic-pics",
    domain: "https://www.synthetic.pics",
    audience: "Art buyers and decor seekers browsing generative art",
    problem: "Generic wall art is overused and hard to differentiate",
    valueProposition: "Human-guided generative art with purchasable downloads",
    primaryConversion: "Artwork purchase or download",
    secondaryConversion: "Gallery exploration and saves",
    primaryCta: "Explore the gallery",
    secondaryCta: "Save this artwork",
    activationEvent: "artwork_downloaded",
    revenueEvent: "purchase_completed",
    bestPlatforms: ["pinterest", "instagram", "facebook"],
    bestFormats: ["pin", "carousel", "reel-concept"],
    recurringThemes: ["artwork-drop", "style-comparison", "room-context", "process-note"],
    postsPerWeek: 3,
    postingWindows: ["Tue 12:00 ET", "Thu 19:00 ET", "Sat 10:00 ET"],
  },
  {
    appId: "print3dmodels",
    domain: "https://www.print3dmodels.com",
    audience: "Gift buyers and 3D-print enthusiasts",
    problem: "Finding unique physical objects that feel personal",
    valueProposition: "Unique 3D-printed objects, printed to order and shipped",
    primaryConversion: "Product purchase",
    secondaryConversion: "Product page view",
    primaryCta: "Shop the print",
    secondaryCta: "See the result",
    activationEvent: "product_viewed",
    revenueEvent: "purchase_completed",
    bestPlatforms: ["pinterest", "instagram", "facebook"],
    bestFormats: ["pin", "before-after", "carousel"],
    recurringThemes: ["model-drop", "print-timelapse-concept", "gift-use-case", "detail-closeup"],
    postsPerWeek: 3,
    postingWindows: ["Mon 12:00 ET", "Wed 19:00 ET", "Sat 11:00 ET"],
  },
  {
    appId: "mixphd",
    domain: "https://www.mixphd.com",
    audience: "Home bartenders and recipe explorers",
    problem: "Knowing what to make with what is on hand",
    valueProposition: "Drink recipes plus My Bar matching and curated barware",
    primaryConversion: "Recipe save and affiliate barware click",
    secondaryConversion: "Recipe page visit",
    primaryCta: "Read the recipe",
    secondaryCta: "Shop the barware",
    activationEvent: "recipe_saved",
    revenueEvent: "affiliate_click",
    bestPlatforms: ["pinterest", "instagram", "facebook"],
    bestFormats: ["pin", "carousel", "short-recipe-card"],
    recurringThemes: ["recipe-drop", "my-bar-match", "technique-tip", "seasonal-roundup"],
    postsPerWeek: 2,
    postingWindows: ["Thu 17:00 ET", "Fri 16:00 ET"],
  },
  {
    appId: "proswing",
    domain: "https://www.proswing.net",
    audience: "Baseball players and coaches fixing swing mechanics",
    problem: "Swing flaws are hard to see without structured feedback",
    valueProposition: "Upload a swing, get structured analysis",
    primaryConversion: "Completed swing analysis",
    secondaryConversion: "Swing upload started",
    primaryCta: "Analyze your swing",
    secondaryCta: "See an example analysis",
    activationEvent: "analysis_completed",
    revenueEvent: null,
    bestPlatforms: ["instagram", "x", "youtube-shorts"],
    bestFormats: ["reel-concept", "before-after", "x-post"],
    recurringThemes: ["one-swing-fix", "common-mistake", "drill-demo", "coach-note"],
    postsPerWeek: 2,
    postingWindows: ["Tue 18:00 ET", "Sun 10:00 ET"],
  },
  {
    appId: "imgsquash",
    domain: "https://imgsquash.com",
    audience: "Makers shipping images on the web",
    problem: "Oversized images slow pages and waste bandwidth",
    valueProposition: "Fast image compression in the browser",
    primaryConversion: "Completed compression",
    secondaryConversion: "Tool page visit",
    primaryCta: "Try it",
    secondaryCta: "See the size difference",
    activationEvent: "compression_completed",
    revenueEvent: null,
    bestPlatforms: ["x", "reddit", "instagram"],
    bestFormats: ["x-post", "before-after", "how-to-card"],
    recurringThemes: ["size-proof", "format-tip", "before-after-bytes", "speed-note"],
    postsPerWeek: 1,
    postingWindows: ["Wed 12:00 ET"],
  },
  {
    appId: "aicapturelab",
    domain: "https://www.aicapturelab.com",
    audience: "Sellers needing product photos without a shoot",
    problem: "Product photography is slow and expensive",
    valueProposition: "Virtual product photography from a single input photo",
    primaryConversion: "Generated photo download or purchase",
    secondaryConversion: "Transformation gallery view",
    primaryCta: "Generate now",
    secondaryCta: "See the transformation",
    activationEvent: "download_completed",
    revenueEvent: "purchase_completed",
    bestPlatforms: ["pinterest", "instagram", "facebook"],
    bestFormats: ["before-after", "carousel", "pin"],
    recurringThemes: ["input-output", "background-swap", "niche-showcase", "quality-note"],
    postsPerWeek: 1,
    postingWindows: ["Wed 19:00 ET"],
  },
  {
    appId: "profitsignals",
    domain: "https://www.profitsignals.xyz",
    audience: "Operators researching markets with AI assistance",
    problem: "Market noise makes it hard to structure research",
    valueProposition: "AI-assisted market research workflows",
    primaryConversion: "Research run or subscription start",
    secondaryConversion: "Insight article read",
    primaryCta: "Run the analysis",
    secondaryCta: "Learn more",
    activationEvent: "subscription_started",
    revenueEvent: "subscription_started",
    bestPlatforms: ["x", "linkedin"],
    bestFormats: ["x-post", "linkedin-post"],
    recurringThemes: ["research-method", "data-hygiene", "workflow-note"],
    postsPerWeek: 1,
    postingWindows: ["Tue 09:00 ET"],
  },
  {
    appId: "aiceo",
    domain: "https://aiceo.io",
    audience: "Founders and operators building with AI",
    problem: "AI pilots stall before production value",
    valueProposition: "Structured AI execution workflows for teams",
    primaryConversion: "Workflow completion or trial start",
    secondaryConversion: "Case or method read",
    primaryCta: "Start free",
    secondaryCta: "Learn more",
    activationEvent: "workflow_completed",
    revenueEvent: "subscription_started",
    bestPlatforms: ["linkedin", "x"],
    bestFormats: ["linkedin-post", "x-post"],
    recurringThemes: ["build-note", "operating-lesson", "failure-mode"],
    postsPerWeek: 0.5,
    postingWindows: ["Thu 09:00 ET"],
  },
];

export function strategyFor(appId: string): ProductStrategy | undefined {
  return PRODUCT_STRATEGIES.find((s) => s.appId === appId);
}
