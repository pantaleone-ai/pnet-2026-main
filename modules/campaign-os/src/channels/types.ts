// Channel adapter interface — common contract for all channels.
// Real adapters: website, linkedin, email. Scaffolded: x, instagram, facebook, youtube.
import { CampaignAsset, ChannelType, Publication } from "../types";

export interface PublishInput {
  asset: CampaignAsset;
  idempotencyKey: string;
  dryRun?: boolean;
}
export interface PublishResult {
  ok: boolean;
  externalId?: string;
  error?: string;
  status: Publication["status"];
}
export interface MetricSample {
  metric_type: string;
  metric_value: number;
  metadata?: Record<string, unknown>;
}
export interface ChannelCapabilities {
  publish: boolean;
  schedule: boolean;
  metrics: boolean;
  media: boolean;
}

export interface ChannelAdapter {
  channel: ChannelType;
  capabilities(): ChannelCapabilities;
  connected(): boolean;
  setupRequirements(): string[];
  validate(asset: CampaignAsset): { ok: boolean; errors: string[] };
  publish(input: PublishInput): Promise<PublishResult>;
  getMetrics(externalId: string): Promise<MetricSample[]>;
}
