/**
 * Platform-fit matrix. Primary / secondary / experimental / avoid per app,
 * derived from portfolio channelFit plus platform-native behavior.
 * Frequencies are portfolio-level guidance; per-app cadence lives in tiers.ts.
 */

export type PlatformFit = "primary" | "secondary" | "experimental" | "avoid";

export type PlatformStrategy = {
  platform: string;
  contentFormat: string;
  weeklyTarget: number;
  ctaStyle: string;
  audience: string;
  expectedAction: string;
  notes: string;
};

export const PLATFORM_STRATEGIES: PlatformStrategy[] = [
  {
    platform: "pinterest",
    contentFormat: "Evergreen pin, 1000x1500, keyword title + description, deep link",
    weeklyTarget: 4,
    ctaStyle: "Explore / Shop / Read the recipe",
    audience: "Visual searchers for art, recipes, prints, product photos",
    expectedAction: "Save and click to destination page",
    notes: "Best for synthetic-pics, mixphd, print3dmodels, aicapturelab. Boards per theme, fresh variants.",
  },
  {
    platform: "instagram",
    contentFormat: "Reel concept or carousel, first-frame hook, 1 CTA in caption",
    weeklyTarget: 4,
    ctaStyle: "Link in bio / Try it / See the result",
    audience: "Visual discovery across all consumer apps",
    expectedAction: "Profile visit and link click",
    notes: "Separate creative from Facebook. No mechanical cross-post.",
  },
  {
    platform: "facebook",
    contentFormat: "Single visual plus short useful caption, link post",
    weeklyTarget: 2,
    ctaStyle: "Learn more / Shop the product",
    audience: "Gift buyers, hobby groups, recipe savers",
    expectedAction: "Link click to product or recipe",
    notes: "Groups only where genuinely useful. No bait.",
  },
  {
    platform: "x",
    contentFormat: "Short post under 200 chars, 1 idea, 1 visual when helpful",
    weeklyTarget: 3,
    ctaStyle: "Try it / See the result",
    audience: "Builders, tool users, early adopters",
    expectedAction: "Click and trial start",
    notes: "Best for imgsquash, proswing, profitsignals, aiceo. Threads only when warranted.",
  },
  {
    platform: "reddit",
    contentFormat: "Text-first useful answer, link only when directly requested",
    weeklyTarget: 1,
    ctaStyle: "Contextual link, never a pitch",
    audience: "Problem-led communities per niche",
    expectedAction: "Useful visit, low volume but high intent",
    notes: "Follow subreddit rules. Lead with value. No manufactured stories.",
  },
  {
    platform: "linkedin",
    contentFormat: "Founder insight, 150-300 words, no consumer cross-post",
    weeklyTarget: 1,
    ctaStyle: "Learn more",
    audience: "Operators and founders",
    expectedAction: "aiceo and profitsignals discovery",
    notes: "Only aiceo and profitsignals as primary. Others avoid.",
  },
  {
    platform: "youtube-shorts",
    contentFormat: "5-30s demo concept, watch-the-transformation",
    weeklyTarget: 1,
    ctaStyle: "Try it",
    audience: "Demo-led viewers",
    expectedAction: "Tool trial",
    notes: "Only when visual demo is strong: proswing, aicapturelab, print3dmodels.",
  },
  {
    platform: "tiktok",
    contentFormat: "Experimental short demo",
    weeklyTarget: 0,
    ctaStyle: "Try it",
    audience: "Unproven for this portfolio",
    expectedAction: "Test only after Shorts winners emerge",
    notes: "Experimental. Do not invest until a Shorts winner recycles cleanly.",
  },
];

export const APP_PLATFORM_FIT: Record<string, Record<string, PlatformFit>> = {
  "synthetic-pics": {
    pinterest: "primary",
    instagram: "primary",
    facebook: "secondary",
    x: "secondary",
    reddit: "experimental",
    linkedin: "avoid",
    "youtube-shorts": "experimental",
    tiktok: "experimental",
  },
  mixphd: {
    pinterest: "primary",
    instagram: "primary",
    facebook: "secondary",
    x: "secondary",
    reddit: "secondary",
    linkedin: "avoid",
    "youtube-shorts": "experimental",
    tiktok: "avoid",
  },
  print3dmodels: {
    pinterest: "primary",
    instagram: "primary",
    facebook: "secondary",
    x: "secondary",
    reddit: "secondary",
    linkedin: "avoid",
    "youtube-shorts": "secondary",
    tiktok: "experimental",
  },
  proswing: {
    pinterest: "avoid",
    instagram: "primary",
    facebook: "secondary",
    x: "primary",
    reddit: "secondary",
    linkedin: "avoid",
    "youtube-shorts": "primary",
    tiktok: "experimental",
  },
  imgsquash: {
    pinterest: "avoid",
    instagram: "secondary",
    facebook: "avoid",
    x: "primary",
    reddit: "primary",
    linkedin: "avoid",
    "youtube-shorts": "avoid",
    tiktok: "avoid",
  },
  aicapturelab: {
    pinterest: "primary",
    instagram: "primary",
    facebook: "secondary",
    x: "secondary",
    reddit: "avoid",
    linkedin: "avoid",
    "youtube-shorts": "secondary",
    tiktok: "avoid",
  },
  profitsignals: {
    pinterest: "avoid",
    instagram: "avoid",
    facebook: "avoid",
    x: "primary",
    reddit: "secondary",
    linkedin: "primary",
    "youtube-shorts": "avoid",
    tiktok: "avoid",
  },
  aiceo: {
    pinterest: "avoid",
    instagram: "avoid",
    facebook: "avoid",
    x: "secondary",
    reddit: "avoid",
    linkedin: "primary",
    "youtube-shorts": "avoid",
    tiktok: "avoid",
  },
};
