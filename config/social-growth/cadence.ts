/**
 * Posting cadence and timing. Sustainable over maximal.
 * Portfolio: ~13/week, ~30 posts per 30 days (1/day + spares).
 * Windows default to audience geography (US Eastern) with observed-performance
 * override once reporting lands in lib/growth/reporting.ts.
 */

export const CADENCE = {
  portfolioWeeklyTarget: 13,
  portfolioDailyAverage:
    "1 to 2 posts per day across the portfolio, never more than 3",
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

/**
 * Synthetic.pics nightly auto-posting grid (31 slots/week ≈ 4.4/day).
 * Weekends carry 7 slots (Sat 4, Sun 3); off-hours (<08:00 / >=20:00 ET)
 * carry 6 (early birds + late scrollers). Tue-Thu carry 19 of 31 slots;
 * something posts every day; slots never share an hour across platforms
 * or brands (staggered). Times are ET; IG slot crons run in UTC so revisit
 * on EST change. Refine from reporting data once it lands.
 */
export const SYN_TIMING_WINDOWS: Record<string, string[]> = {
  instagram: [
    "Mon 07:30 ET",
    "Mon 12:00 ET",
    "Tue 09:00 ET",
    "Tue 12:00 ET",
    "Tue 18:30 ET",
    "Tue 21:00 ET",
    "Wed 09:00 ET",
    "Wed 12:00 ET",
    "Wed 18:30 ET",
    "Wed 21:00 ET",
    "Thu 09:00 ET",
    "Thu 12:00 ET",
    "Thu 18:30 ET",
    "Thu 21:00 ET",
    "Fri 12:00 ET",
    "Sat 09:00 ET",
    "Sat 18:00 ET",
    "Sun 19:00 ET",
  ],
  facebook: [
    "Mon 09:00 ET",
    "Tue 10:00 ET",
    "Tue 17:00 ET",
    "Wed 07:00 ET",
    "Wed 13:00 ET",
    "Wed 19:00 ET",
    "Thu 10:00 ET",
    "Thu 17:00 ET",
    "Fri 09:00 ET",
    "Sat 10:00 ET",
    "Sat 16:00 ET",
    "Sun 13:00 ET",
    "Sun 20:00 ET",
  ],
};

/**
 * Mixphd nightly auto-posting grid (24 slots/week ≈ 3.4/day, canary).
 * Weekends carry 8 slots (Sat 4, Sun 4); off-hours (<08:00 / >=20:00 ET)
 * carry 8 (early birds + late scrollers). Tue-Thu carry 10 of 24 slots.
 * Staggered against SYN_TIMING_WINDOWS (no shared day+hour across brands).
 * Slots are ET — revisit on EST change. Refine from reporting data once it lands.
 */
export const MIX_TIMING_WINDOWS: Record<string, string[]> = {
  instagram: [
    "Mon 10:00 ET",
    "Tue 08:00 ET",
    "Tue 20:00 ET",
    "Wed 08:00 ET",
    "Wed 20:00 ET",
    "Thu 08:00 ET",
    "Thu 20:00 ET",
    "Fri 10:00 ET",
    "Fri 21:00 ET",
    "Sat 08:00 ET",
    "Sat 12:00 ET",
    "Sun 08:00 ET",
    "Sun 18:00 ET",
  ],
  facebook: [
    "Mon 14:00 ET",
    "Tue 07:00 ET",
    "Tue 11:00 ET",
    "Wed 10:00 ET",
    "Thu 11:00 ET",
    "Fri 14:00 ET",
    "Fri 20:00 ET",
    "Sat 07:00 ET",
    "Sat 15:00 ET",
    "Sun 07:00 ET",
    "Sun 14:00 ET",
  ],
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

/**
 * Pantaleone.net reshare caps (portfolio umbrella).
 * Any app's published FB/IG post may nominate, but only top-scored posts
 * publish here. Raised 2026-10-19 (Rule 2 canary): 4/week combined,
 * 2/platform/week, still 48h after source and 48h between reshares.
 */
export const PANTA_RESHARE_CAPS = {
  maxPerWeekCombined: 4,
  maxPerPlatformPerWeek: 2,
  minDelayHoursAfterSource: 48,
  minGapHoursBetweenReshares: 48,
  autoPublishPriorities: ["p1"] as string[],
  gatedPriorities: ["p2"] as string[],
  manualOnlyPriorities: ["p3"] as string[],
};
