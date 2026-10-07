// Channel registry for the social publish pipeline.
// Single source of truth: issue platform label -> channel -> required envs.
// See docs/SOCIAL_PUBLISHING.md for how to mint each credential.
export type ChannelId =
  | "instagram"
  | "facebook"
  | "pinterest"
  | "x"
  | "linkedin"
  | "reddit"
  | "youtube-shorts";

export interface ChannelSpec {
  id: ChannelId;
  /** Issue label that routes to this channel. */
  label: string;
  /** Env names that must be present to publish live. Empty = nothing configured yet. */
  requiredEnvs: string[];
  /** True when a publisher implementation exists in scripts/social-issues/publish/. */
  implemented: boolean;
  /** Auto-post policy. Manual-only channels stay packet-ready by design. */
  autoPost: boolean;
}

export const CHANNELS: ChannelSpec[] = [
  { id: "instagram", label: "platform:instagram", requiredEnvs: ["META_CAPI_ACCESS_TOKEN"], implemented: true, autoPost: true },
  { id: "facebook", label: "platform:facebook", requiredEnvs: ["META_CAPI_ACCESS_TOKEN"], implemented: true, autoPost: true },
  { id: "pinterest", label: "platform:pinterest", requiredEnvs: ["PINTEREST_ACCESS_TOKEN"], implemented: false, autoPost: true },
  { id: "x", label: "platform:x", requiredEnvs: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"], implemented: false, autoPost: true },
  { id: "linkedin", label: "platform:linkedin", requiredEnvs: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"], implemented: false, autoPost: true },
  { id: "reddit", label: "platform:reddit", requiredEnvs: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD"], implemented: false, autoPost: false },
  { id: "youtube-shorts", label: "platform:youtube-shorts", requiredEnvs: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"], implemented: false, autoPost: true },
];

export function channelForLabelNames(names: string[]): ChannelSpec | undefined {
  return CHANNELS.find((c) => names.includes(c.label));
}

export function missingEnvs(spec: ChannelSpec, env: NodeJS.ProcessEnv = process.env): string[] {
  return spec.requiredEnvs.filter((k) => !env[k]);
}
