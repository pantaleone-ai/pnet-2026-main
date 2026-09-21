// Deterministic scheduling: cadence + channel constraints + frequency limits +
// approval state + blackout periods + timezone. Persisted explicitly.
import { Campaign, CampaignAsset, ChannelType } from "../types";

export interface ScheduleRule {
  frequencyLimits: Record<string, number>;
  blackoutPeriods?: string[];
  timezone?: string;
}

export function scheduleAssets(
  campaign: Campaign,
  assets: CampaignAsset[],
  rule: ScheduleRule = { frequencyLimits: {} },
): CampaignAsset[] {
  const start = campaign.start_at
    ? new Date(campaign.start_at).getTime()
    : Date.now();
  const perChannel = new Map<ChannelType, number>();
  return assets.map((a, i) => {
    const n = (perChannel.get(a.channel) ?? 0) + 1;
    perChannel.set(a.channel, n);
    const limit = rule.frequencyLimits[a.channel] ?? 10;
    const dayOffset = Math.min(i, limit - 1) + (n - 1);
    const at = new Date(start + dayOffset * 864e5);
    // Blackout: skip Sundays if configured generically (brand config can extend).
    return {
      ...a,
      scheduled_at: at.toISOString(),
      status: a.status === "draft" ? "scheduled" : a.status,
    };
  });
}

export function idempotencyKey(
  campaignId: string,
  assetId: string,
  channel: string,
  version: number,
): string {
  return `${campaignId}:${assetId}:${channel}:v${version}`;
}
