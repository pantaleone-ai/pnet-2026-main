/**
 * Growth Pinterest platform scaffold (pure, extractable).
 * `{ connected: false, setupRequirements }` until configured. Loads nothing.
 */

export type PinterestAppConfig = {
  appId: string;
  connected: false;
  tagId: string | null;
  setupRequirements: string[];
};

export function getPinterestConfig(appId: string): PinterestAppConfig {
  return {
    appId,
    connected: false,
    tagId: null,
    setupRequirements: [
      `Set PINTEREST_TAG_ID_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")} in Vercel env`,
      "Add the Pinterest tag behind marketing consent + prod-host gate",
      "Map activation event to a Pinterest conversion before paid test",
    ],
  };
}
