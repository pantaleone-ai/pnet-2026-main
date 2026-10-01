/**
 * Growth X platform scaffold (pure, extractable).
 * `{ connected: false, setupRequirements }` until configured. Loads nothing.
 */

export type XAppConfig = {
  appId: string;
  connected: false;
  pixelId: string | null;
  setupRequirements: string[];
};

export function getXConfig(appId: string): XAppConfig {
  return {
    appId,
    connected: false,
    pixelId: null,
    setupRequirements: [
      `Set X_PIXEL_ID_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")} in Vercel env`,
      "Add the X pixel behind marketing consent + prod-host gate",
      "Map activation event to an X conversion before paid test",
    ],
  };
}
