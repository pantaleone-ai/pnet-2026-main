/**
 * Growth Reddit platform scaffold (pure, extractable).
 * `{ connected: false, setupRequirements }` until configured. Loads nothing.
 */

export type RedditAppConfig = {
  appId: string;
  connected: false;
  pixelId: string | null;
  setupRequirements: string[];
};

export function getRedditConfig(appId: string): RedditAppConfig {
  return {
    appId,
    connected: false,
    pixelId: null,
    setupRequirements: [
      `Set REDDIT_PIXEL_ID_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")} in Vercel env`,
      "Add the Reddit pixel behind marketing consent + prod-host gate",
      "Map activation event to a Reddit conversion before paid test",
    ],
  };
}
