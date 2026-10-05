/**
 * Posting cadence and timing. Sustainable over maximal.
 * Portfolio: ~13/week, ~30 posts per 30 days (1/day + spares).
 * Windows default to audience geography (US Eastern) with observed-performance
 * override once reporting lands in lib/growth/reporting.ts.
 */

export const CADENCE = {
  portfolioWeeklyTarget: 13,
  portfolioDailyAverage: "1 to 2 posts per day across the portfolio, never more than 3",
  perProductWeekly: {
    "synthetic-pics": 3,
    print3dmodels: 3,
    mixphd: 2,
    proswing: 2,
    imgsquash: 1,
    aicapturelab: 1,
    profitsignals: 1,
    aiceo: 0.5,
  } as Record<string, number>,
  perPlatformWeekly: {
    pinterest: 4,
    instagram: 4,
    facebook: 2,
    x: 3,
    reddit: 1,
    linkedin: 1,
    "youtube-shorts": 1,
  } as Record<string, number>,
};

export const TIMING_WINDOWS: Record<string, string[]> = {
  pinterest: ["Sat 10:00 ET", "Tue 12:00 ET", "Thu 19:00 ET"],
  instagram: ["Tue 12:00 ET", "Thu 19:00 ET", "Sat 11:00 ET"],
  facebook: ["Thu 17:00 ET", "Sun 13:00 ET"],
  x: ["Tue 09:00 ET", "Wed 12:00 ET"],
  reddit: ["Wed 10:00 ET"],
  linkedin: ["Thu 09:00 ET"],
  "youtube-shorts": ["Sun 10:00 ET"],
};

export const PERFORMANCE_HIERARCHY = [
  "revenue",
  "purchases",
  "subscriptions",
  "activations",
  "cta-clicks",
  "landing-visits",
  "reach",
  "engagement",
] as const;
