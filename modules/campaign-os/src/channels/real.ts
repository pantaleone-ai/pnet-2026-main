// Website / LinkedIn / Email adapters — real implementations with
// disconnected status when credentials are absent. Never fake success.
import { CampaignAsset } from "../types";
import { ChannelAdapter, MetricSample } from "./types";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v !== "xxx" && !v.startsWith("change-me") ? v : undefined;
}

export function websiteAdapter(): ChannelAdapter {
  const apiBase = env("WEBSITE_API_BASE");
  return {
    channel: "website",
    capabilities: () => ({
      publish: true,
      schedule: false,
      metrics: true,
      media: true,
    }),
    connected: () => Boolean(apiBase && env("WEBSITE_API_TOKEN")),
    setupRequirements: () => ["WEBSITE_API_BASE", "WEBSITE_API_TOKEN"],
    validate: (a: CampaignAsset) => {
      const errors: string[] = [];
      if (!a.title) errors.push("title required");
      if (!a.body || a.body.length < 40) errors.push("body too short");
      return { ok: errors.length === 0, errors };
    },
    publish: async ({ asset, dryRun }) => {
      if (!apiBase || !env("WEBSITE_API_TOKEN"))
        return { ok: false, error: "website not connected", status: "failed" };
      if (dryRun)
        return {
          ok: true,
          externalId: `dryrun-${asset.id}`,
          status: "published",
        };
      const res = await fetch(`${apiBase}/posts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env("WEBSITE_API_TOKEN")}`,
        },
        body: JSON.stringify({
          title: asset.title,
          body: asset.body,
          metadata: asset.metadata,
        }),
      });
      if (!res.ok)
        return {
          ok: false,
          error: `website publish failed: ${res.status}`,
          status: "failed",
        };
      const j = (await res.json()) as { id?: string };
      return { ok: true, externalId: j.id ?? asset.id, status: "published" };
    },
    getMetrics: async (_externalId): Promise<MetricSample[]> => [],
  };
}

export function linkedinAdapter(): ChannelAdapter {
  const token = env("LINKEDIN_ACCESS_TOKEN");
  return {
    channel: "linkedin",
    capabilities: () => ({
      publish: true,
      schedule: false,
      metrics: true,
      media: true,
    }),
    connected: () => Boolean(token),
    setupRequirements: () => [
      "LINKEDIN_ACCESS_TOKEN (OAuth 2.0, scope w_member_social)",
    ],
    validate: (a: CampaignAsset) => {
      const errors: string[] = [];
      if (a.body.length > 3000) errors.push("LinkedIn post too long");
      return { ok: errors.length === 0, errors };
    },
    publish: async ({ asset, dryRun }) => {
      if (!token)
        return { ok: false, error: "linkedin not connected", status: "failed" };
      if (dryRun)
        return {
          ok: true,
          externalId: `dryrun-${asset.id}`,
          status: "published",
        };
      // LinkedIn UGC post API (w_member_social). Person URN from env.
      const person = env("LINKEDIN_PERSON_URN");
      if (!person)
        return {
          ok: false,
          error: "LINKEDIN_PERSON_URN missing",
          status: "failed",
        };
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          author: person,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: asset.body },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      if (!res.ok)
        return {
          ok: false,
          error: `linkedin publish failed: ${res.status}`,
          status: "failed",
        };
      const j = (await res.json()) as { id?: string };
      return { ok: true, externalId: j.id ?? asset.id, status: "published" };
    },
    getMetrics: async () => [],
  };
}

export function emailAdapter(): ChannelAdapter {
  const key =
    env("EMAIL_PROVIDER_API_KEY") ??
    env("RESEND_API_KEY") ??
    env("SENDGRID_API_KEY");
  const from = env("EMAIL_FROM");
  return {
    channel: "email",
    capabilities: () => ({
      publish: true,
      schedule: true,
      metrics: true,
      media: false,
    }),
    connected: () => Boolean(key && from),
    setupRequirements: () => [
      "EMAIL_PROVIDER_API_KEY (Resend or SendGrid)",
      "EMAIL_FROM",
      "unsubscribe handling via provider",
    ],
    validate: (a: CampaignAsset) => {
      const errors: string[] = [];
      if (!a.title) errors.push("subject (title) required");
      if (!/unsubscribe/i.test(a.body))
        errors.push("missing unsubscribe handling reference");
      return { ok: errors.length === 0, errors };
    },
    publish: async ({ asset, dryRun }) => {
      if (!key || !from)
        return { ok: false, error: "email not connected", status: "failed" };
      if (dryRun)
        return {
          ok: true,
          externalId: `dryrun-${asset.id}`,
          status: "published",
        };
      const to =
        (asset.metadata.audience_email as string | undefined) ??
        env("EMAIL_TEST_RECIPIENT");
      if (!to)
        return {
          ok: false,
          error: "no recipient (set asset.metadata.audience_email)",
          status: "failed",
        };
      // Resend-compatible API; SendGrid users should set EMAIL_API_BASE override.
      const base = env("EMAIL_API_BASE") ?? "https://api.resend.com";
      const res = await fetch(`${base}/emails`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          from,
          to,
          subject: asset.title,
          html: asset.body,
        }),
      });
      if (!res.ok)
        return {
          ok: false,
          error: `email send failed: ${res.status}`,
          status: "failed",
        };
      const j = (await res.json()) as { id?: string };
      return { ok: true, externalId: j.id ?? asset.id, status: "published" };
    },
    getMetrics: async () => [],
  };
}
