import { executePublication } from "@/modules/campaign-os/src/engine";
import type { CampaignStore } from "@/modules/campaign-os/src/store";
import { detectOpportunities } from "@/modules/campaign-os/src/agents/optimization";
import { channelStatuses } from "@/modules/campaign-os/src/channels/index";

export interface TickOptions {
  limit?: number;
  dryRun?: boolean;
}

export interface TickSummary {
  checked_at: string;
  due: number;
  executed: number;
  published: number;
  failed: number;
  failures: Array<{ publication_id: string; channel: string; error: string }>;
  opportunities_open: number;
}

export interface CampaignHealth {
  checked_at: string;
  campaigns: number;
  campaigns_by_status: Record<string, number>;
  publications_queued: number;
  publications_due: number;
  publications_failed: number;
  approvals_pending: number;
  opportunities_open: number;
  channels: Array<{ channel: string; connected: boolean }>;
}

function duePublications(store: CampaignStore, limit: number) {
  const now = Date.now();
  return store.data.publications
    .filter((p) => {
      if (p.status !== "queued") return false;
      if (p.attempt_count >= 3) return false;
      if (!p.scheduled_at) return true;
      return new Date(p.scheduled_at).getTime() <= now;
    })
    .slice(0, limit);
}

/**
 * Cron replacement: run every piece of due campaign work idempotently.
 * Safe to call from GitHub Actions, an uptime monitor, n8n, the admin
 * button, or `npm run campaign:tick`. Retries can never double-publish:
 * execution keys are idempotent and published records are reused.
 */
export async function runCampaignTick(
  store: CampaignStore,
  opts: TickOptions = {},
): Promise<TickSummary> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100);
  const due = duePublications(store, limit);
  let published = 0;
  const failures: TickSummary["failures"] = [];

  for (const pub of due) {
    const out = await executePublication(store, pub.id, opts.dryRun ?? false);
    if (out.status === "published") {
      published += 1;
    } else {
      failures.push({
        publication_id: pub.id,
        channel: pub.channel,
        error: out.error ?? "publish failed",
      });
    }
  }

  for (const brand of store.data.brands) {
    detectOpportunitiesDeduped(store, brand.id);
  }
  const open = store.data.opportunities.filter((o) => o.status === "open");

  return {
    checked_at: new Date().toISOString(),
    due: due.length,
    executed: due.length,
    published,
    failed: failures.length,
    failures,
    opportunities_open: open.length,
  };
}

/**
 * Opportunity detection that never stacks duplicates: an hourly tick must
 * not create a new row for a source that already has an open opportunity.
 * The vendored engine is append-only by design, so dedupe lives here.
 */
export function detectOpportunitiesDeduped(
  store: CampaignStore,
  brandId: string,
): void {
  const seen = new Set(
    store.data.opportunities
      .filter((o) => o.brand_id === brandId && o.status === "open")
      .map((o) => `${o.opportunity_type}:${o.source}`),
  );
  for (const created of detectOpportunities(store, brandId)) {
    const key = `${created.opportunity_type}:${created.source}`;
    if (seen.has(key)) {
      const index = store.data.opportunities.indexOf(created);
      if (index !== -1) store.data.opportunities.splice(index, 1);
    } else {
      seen.add(key);
    }
  }
}

export function getCampaignHealth(store: CampaignStore): CampaignHealth {
  const now = Date.now();
  const byStatus: Record<string, number> = {};
  for (const c of store.data.campaigns) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
  }
  const queued = store.data.publications.filter((p) => p.status === "queued");
  const due = queued.filter(
    (p) => !p.scheduled_at || new Date(p.scheduled_at).getTime() <= now,
  );
  return {
    checked_at: new Date().toISOString(),
    campaigns: store.data.campaigns.length,
    campaigns_by_status: byStatus,
    publications_queued: queued.length,
    publications_due: due.length,
    publications_failed: store.data.publications.filter(
      (p) => p.status === "failed",
    ).length,
    approvals_pending: store.data.approvals.filter(
      (a) => a.status === "pending",
    ).length,
    opportunities_open: store.data.opportunities.filter(
      (o) => o.status === "open",
    ).length,
    channels: channelStatuses().map((c) => ({
      channel: c.channel,
      connected: c.connected,
    })),
  };
}
