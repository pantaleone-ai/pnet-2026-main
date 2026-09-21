import { CampaignStore } from "@/modules/campaign-os/src/store";
import type { StoreSnapshot } from "@/modules/campaign-os/src/store";
import { logger } from "@/lib/logger";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function snapshotPath(): string {
  return process.env.CAMPAIGN_SNAPSHOT_PATH ?? "data/campaign-os.snapshot.json";
}

function isSnapshot(value: unknown): value is StoreSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.organizations) &&
    Array.isArray(v.brands) &&
    Array.isArray(v.campaigns) &&
    Array.isArray(v.assets) &&
    Array.isArray(v.publications)
  );
}

function loadSnapshot(store: CampaignStore): void {
  const path = snapshotPath();
  try {
    if (!existsSync(path)) return;
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (isSnapshot(parsed)) {
      store.data = { ...store.data, ...parsed };
    }
  } catch (error) {
    logger.error("Campaign snapshot load failed", error, {
      context: "campaign-store",
    });
  }
}

function seedIfEmpty(store: CampaignStore): void {
  if (store.data.brands.length > 0) return;
  const org = store.createOrganization("Pantaleone");
  const brand = store.createBrand({
    organization_id: org.id,
    name: "Pantaleone",
    description:
      "AI engineering and automation consulting for service businesses.",
    voice_config: {
      tone: "Direct, practical, evidence-led. Short sentences.",
      vocabulary: ["operations", "automation", "agents", "pipeline"],
      sentence_style: "Short, declarative.",
      preferred_terminology: ["operating cadence", "pipeline review"],
      prohibited_terminology: [
        "synergy",
        "revolutionize",
        "game-changing",
        "delve",
        "seamlessly",
      ],
      examples: ["We run a weekly pipeline review. It takes 30 minutes."],
    },
    strategy_config: {
      objectives: ["Leads"],
      audiences: ["Founders", "Operators"],
      positioning: "The operations partner for service businesses.",
      priorities: ["qualified demand"],
      topics_emphasize: ["operations", "automation", "ai agents"],
      topics_avoid: ["hype"],
      claims_policy: "Every claim must trace to source content.",
      cta_rules: ["One CTA per asset"],
      formatting_rules: ["Front-load the point"],
      channel_rules: {},
      frequency_limits: { linkedin: 3, email: 2, website: 2 },
      utm_strategy: {},
    },
    autonomy_level: 2,
  });
  store.createAudience({
    brand_id: brand.id,
    name: "Founders",
    description: "Service business founders and operators",
    attributes: {},
  });
  for (const channel of ["website", "linkedin", "email"] as const) {
    store.upsertChannel({
      brand_id: brand.id,
      type: channel,
      name: channel,
      status: "disconnected",
      configuration: {},
    });
  }
  store.emit("brand.seeded", brand.id, { source: "lib/campaign" });
}

declare global {
  var __campaignStore: CampaignStore | undefined;
}

/**
 * Process-wide campaign store singleton. Survives HMR via globalThis;
 * per-instance memory on serverless (Postgres migration in
 * modules/campaign-os/migrations/002_campaign_os.sql is the durable path).
 */
export function getCampaignStore(): CampaignStore {
  if (!globalThis.__campaignStore) {
    const store = new CampaignStore();
    loadSnapshot(store);
    seedIfEmpty(store);
    globalThis.__campaignStore = store;
  }
  return globalThis.__campaignStore;
}

/**
 * Best-effort snapshot persistence for local/dev durability.
 * Never throws; serverless read-only filesystems fall through silently.
 */
export function persistCampaignStore(): void {
  const store = globalThis.__campaignStore;
  if (!store) return;
  try {
    const path = snapshotPath();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(store.data, null, 2));
  } catch (error) {
    logger.error("Campaign snapshot save failed", error, {
      context: "campaign-store",
    });
  }
}

/**
 * Machine-to-machine auth shared by automation endpoints.
 * Open in dev when no secret is set; enforced otherwise.
 */
export function checkMachineAuth(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  const legacy = request.headers.get("x-webhook-secret") ?? "";
  return (
    header === `Bearer ${secret}` || header === secret || legacy === secret
  );
}
