// Contracts for channels with no stored credential yet.
// Each entry pins the exact publish endpoint + payload shape so wiring the
// token later is mechanical. Until then publish-due reports blocked with the
// env names the owner must provide (see docs/SOCIAL_PUBLISHING.md).
// Reddit stays manual-only by policy (answers-only per platform-matrix).
import type { ChannelId } from "./channels";

export interface PendingChannelPlan {
  channel: ChannelId;
  status: "blocked";
  missing: string[];
  endpoint: string;
  payloadShape: string;
  setup: string;
  policyNote?: string;
}

const PLANS: PendingChannelPlan[] = [
  {
    channel: "pinterest",
    status: "blocked",
    missing: ["PINTEREST_ACCESS_TOKEN"],
    endpoint: "POST https://api.pinterest.com/v5/pins",
    payloadShape: `{ board_id, image_source: { source_type: "image_url", url }, title, description, link } (link = UTM destination)`,
    setup: "Pinterest app (production trial) -> OAuth code exchange -> long-lived token (~60d, refreshable). Optional PINTEREST_BOARD_<SITE> overrides; default board map goes in code next to SITE_ACCOUNTS.",
  },
  {
    channel: "x",
    status: "blocked",
    missing: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"],
    endpoint: "POST https://api.x.com/2/tweets (+ v1.1 media/upload for visuals)",
    payloadShape: `{ text (<=280 chars, 1 idea + UTM link), media_ids? }`,
    setup: "X developer app with Read+Write user auth (Free tier covers queue volume) -> 4-legged OAuth 1.0a user tokens. Store all four envs.",
  },
  {
    channel: "linkedin",
    status: "blocked",
    missing: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_PERSON_URN"],
    endpoint: "POST https://api.linkedin.com/v2/ugcPosts (or /v2/posts)",
    payloadShape: `{ author: <person URN>, commentary (150-300 words founder insight), article share with UTM link }`,
    setup: "LinkedIn app with w_member_social -> OAuth 3-legged token (~60d refresh). Matrix scope: aiceo + profitsignals only.",
  },
  {
    channel: "reddit",
    status: "blocked",
    missing: ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD"],
    endpoint: "POST https://oauth.reddit.com/api/submit",
    payloadShape: `{ sr (subreddit), kind: "link"|"self", title, url|text } — link only when directly useful`,
    setup: "script-type Reddit app. NOTE: no 2FA on the posting account (2FA breaks password grant).",
    policyNote: "Manual-only by design: answers-first, subreddit rules, never a pitch. Pipeline holds packet-ready; a human posts and pastes the permalink.",
  },
  {
    channel: "youtube-shorts",
    status: "blocked",
    missing: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"],
    endpoint: "POST https://www.googleapis.com/upload/youtube/v3/videos (resumable, 5-30s vertical mp4)",
    payloadShape: `{ snippet: { title, description (+UTM link), categoryId }, status: { privacyStatus: "public" } }`,
    setup: "Google Cloud OAuth client (youtube.upload scope) -> offline refresh token. Video creative via the ffmpeg recipe in docs/social-presence/*stories-reels*.md.",
  },
];

export function pendingPlan(channel: ChannelId): PendingChannelPlan | undefined {
  return PLANS.find((p) => p.channel === channel);
}
