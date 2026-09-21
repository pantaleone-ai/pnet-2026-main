// Scaffolded adapters (X, Instagram, Facebook, YouTube): declare capabilities,
// expose disconnected status + setup requirements. Never pretend success.
import { ChannelAdapter } from "./types";
import { ChannelType } from "../types";

function scaffold(
  channel: ChannelType,
  requirements: string[],
): ChannelAdapter {
  return {
    channel,
    capabilities: () => ({
      publish: true,
      schedule: false,
      metrics: false,
      media: channel !== "x",
    }),
    connected: () => false,
    setupRequirements: () => requirements,
    validate: () => ({ ok: true, errors: [] }),
    publish: async () => ({
      ok: false,
      error: `${channel} not connected`,
      status: "failed",
    }),
    getMetrics: async () => [],
  };
}

export const xAdapter = () =>
  scaffold("x", ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "OAuth 1.0a"]);
export const instagramAdapter = () =>
  scaffold("instagram", ["INSTAGRAM_BUSINESS_ID", "META_ACCESS_TOKEN"]);
export const facebookAdapter = () =>
  scaffold("facebook", ["FACEBOOK_PAGE_ID", "META_ACCESS_TOKEN"]);
export const youtubeAdapter = () =>
  scaffold("youtube", [
    "YOUTUBE_API_KEY or OAuth client",
    "YOUTUBE_CHANNEL_ID",
  ]);
