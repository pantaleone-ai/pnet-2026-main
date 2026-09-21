// Campaign OS verification — unit + integration + E2E. No external deps.
// Run: npm run campaign:test
// Ported from the upstream module tests to the vendored paths.
import assert from "node:assert/strict";
import { CampaignStore } from "@/modules/campaign-os/src/store";
import {
  approveCampaign,
  executePublication,
  promoteContent,
} from "@/modules/campaign-os/src/engine";
import { buildUtmUrl, slugify } from "@/modules/campaign-os/src/lib/utm";
import { idempotencyKey } from "@/modules/campaign-os/src/lib/scheduling";
import { fatigueForTopic } from "@/modules/campaign-os/src/lib/fatigue";
import { qaAsset } from "@/modules/campaign-os/src/agents/qa";
import {
  checkRateLimit,
  evaluateExperiment,
} from "@/modules/campaign-os/src/lib/engine-utils";
import { channelStatuses } from "@/modules/campaign-os/src/channels/index";
import { getCampaignHealth, runCampaignTick } from "@/lib/campaign/scheduler";

let passed = 0;
const ok = (name: string) => {
  passed++;
  console.log(`ok - ${name}`);
};

function makeBrand(store: CampaignStore) {
  const org = store.createOrganization("Test Org");
  return store.createBrand({
    organization_id: org.id,
    name: "Test Brand",
    description: "Test",
    voice_config: {
      tone: "Direct",
      vocabulary: [],
      sentence_style: "Short",
      preferred_terminology: [],
      prohibited_terminology: ["revolutionize"],
      examples: [],
    },
    strategy_config: {
      objectives: ["Leads"],
      audiences: ["Founders"],
      positioning: "Test",
      priorities: [],
      topics_emphasize: [],
      topics_avoid: [],
      claims_policy: "cite sources",
      cta_rules: [],
      formatting_rules: [],
      channel_rules: {},
      frequency_limits: {},
    },
    autonomy_level: 2,
  });
}

// Unit: state transitions
async function main(): Promise<void> {
  {
    const s = new CampaignStore();
    const b = makeBrand(s);
    const c = s.createCampaign({
      brand_id: b.id,
      name: "C",
      objective: "Leads",
      autonomy_level: 2,
    });
    assert.equal(c.status, "draft");
    s.transitionCampaign(c.id, "planning");
    assert.throws(
      () => s.transitionCampaign(c.id, "active"),
      /invalid campaign transition/,
    );
    ok("campaign state transitions");
  }
  // Unit: UTM never overwrites intentional params
  {
    const u = buildUtmUrl(
      "https://x.com/p?utm_source=newsletter",
      "linkedin",
      "slug",
      "a1",
      {},
    );
    assert.match(u, /utm_source=newsletter/);
    assert.match(u, /utm_campaign=slug/);
    assert.ok(slugify("Hello World!") === "hello-world");
    ok("utm generation");
  }
  // Unit: idempotency
  {
    const s = new CampaignStore();
    const k = idempotencyKey("c", "a", "linkedin", 1);
    const p1 = s.createPublication({
      asset_id: "a",
      channel: "linkedin",
      status: "queued",
      idempotency_key: k,
    });
    const p2 = s.createPublication({
      asset_id: "a",
      channel: "linkedin",
      status: "queued",
      idempotency_key: k,
    });
    assert.equal(p1.id, p2.id);
    ok("idempotency");
  }
  // Unit: QA blocks placeholders + banned phrases
  {
    const s = new CampaignStore();
    const b = makeBrand(s);
    const r = qaAsset(
      s,
      b,
      "c",
      "a",
      "linkedin",
      "T",
      "This will revolutionize TODO lorem ipsum",
      "CTA",
    );
    assert.equal(r.status, "block");
    ok("qa scoring");
  }
  // Unit: rate limiting
  {
    for (let i = 0; i < 10; i++) checkRateLimit("test-channel-rl", 10);
    const r = checkRateLimit("test-channel-rl", 10);
    assert.equal(r.allowed, false);
    ok("rate limiting");
  }
  // Unit: channels declare disconnected (no fake success)
  {
    const statuses = channelStatuses();
    assert.ok(statuses.find((c) => c.channel === "x")?.connected === false);
    ok("channel capabilities");
  }
  // Integration + E2E: Promote This → strategy → assets → QA → approval → schedule → execute → metrics → learn
  {
    const s = new CampaignStore();
    const b = makeBrand(s);
    const src = s.createSourceContent({
      brand_id: b.id,
      source_type: "article",
      source_url: "https://example.com/ops",
      title: "Ops review",
      content:
        "Weekly pipeline review. Owners, next steps, dates. Thirty minutes.",
      metadata: {},
    });
    const { campaign, assets } = await promoteContent(s, b, src, {
      objective: "Leads",
      channels: ["website", "linkedin", "email"],
      durationDays: 14,
      autonomyLevel: 2,
    });
    assert.equal(campaign.status, "review");
    assert.equal(assets.length, 3);
    assert.ok(assets.every((a) => a.body.length > 40));
    const channels = new Set(assets.map((a) => a.channel));
    assert.ok(
      channels.has("website") &&
        channels.has("linkedin") &&
        channels.has("email"),
    );
    // Assets must be channel-native, not identical copies.
    assert.ok(new Set(assets.map((a) => a.body)).size === 3);
    await approveCampaign(s, b, campaign.id, "tester");
    const pubs = s.data.publications.filter((p) =>
      assets.some((a) => a.id === p.asset_id),
    );
    assert.equal(pubs.length, 3);
    assert.ok(pubs.every((p) => p.scheduled_at));
    // Execute publication in dry-run-safe disconnected mode → fails honestly, no fake success.
    const firstPub = pubs[0];
    assert.ok(firstPub);
    const r = await executePublication(s, firstPub.id);
    assert.ok(["published", "failed"].includes(r.status));
    if (r.status === "failed")
      assert.match(r.error ?? "", /not connected|missing|failed/);
    // Duplicate execute must not duplicate.
    const count = s.data.publications.length;
    await executePublication(s, firstPub.id);
    assert.equal(s.data.publications.length, count);
    // Metrics → experiment evaluation with insufficient data.
    const exp = s.createExperiment({
      campaign_id: campaign.id,
      name: "Hook",
      hypothesis: "H",
      variable: "hook",
      control: {},
      variant: {},
      success_metric: "clicks",
      status: "running",
    });
    const evaluated = evaluateExperiment(s, exp, 10);
    assert.equal(evaluated.result, "insufficient_data");
    // Fatigue returns a configured level.
    const f = await fatigueForTopic(s, "Ops review");
    assert.ok(["LOW", "MEDIUM", "HIGH"].includes(f.level));
    ok("e2e promote-to-learning flow");
  }
  // Partial success: one channel failure must not fail the campaign
  {
    const s = new CampaignStore();
    const b = makeBrand(s);
    const src = s.createSourceContent({
      brand_id: b.id,
      source_type: "article",
      source_url: "https://example.com/p",
      title: "P",
      content: "Enough content here to pass QA checks easily.",
      metadata: {},
    });
    const { campaign } = await promoteContent(s, b, src, {
      objective: "Leads",
      channels: ["website", "linkedin"],
      durationDays: 7,
      autonomyLevel: 2,
    });
    await approveCampaign(s, b, campaign.id, "tester");
    const pubs = s.data.publications;
    const pubA = pubs[0];
    const pubB = pubs[1];
    assert.ok(pubA && pubB);
    s.updatePublication(pubA.id, {
      status: "failed",
      error: "linkedin authentication",
    });
    s.updatePublication(pubB.id, { status: "published", external_id: "web-1" });
    assert.equal(s.getCampaign(campaign.id)?.status, "scheduled");
    ok("failure isolation / partial success");
  }
  // Tick: due work executes idempotently; health reports counts
  {
    const s = new CampaignStore();
    const b = makeBrand(s);
    const src = s.createSourceContent({
      brand_id: b.id,
      source_type: "article",
      source_url: "https://example.com/tick",
      title: "Tick source with enough content to pass QA checks easily",
      content:
        "Weekly pipeline review. Owners, next steps, dates. Thirty minutes of focused work.",
      metadata: {},
    });
    const { campaign } = await promoteContent(s, b, src, {
      objective: "Leads",
      channels: ["website", "linkedin"],
      durationDays: 7,
      autonomyLevel: 2,
    });
    await approveCampaign(s, b, campaign.id, "tester");
    // Force publications due now.
    for (const p of s.data.publications) {
      s.updatePublication(p.id, {
        scheduled_at: new Date(Date.now() - 1000).toISOString(),
      });
    }
    const summary = await runCampaignTick(s, { limit: 10 });
    assert.equal(summary.due, 2);
    assert.equal(summary.executed, 2);
    // Second tick finds nothing due that is still queued-and-executable twice:
    // failed pubs already attempted stay failed-skipped only after 3 attempts;
    // the key assertion is no duplicate publications were created.
    const count = s.data.publications.length;
    const second = await runCampaignTick(s, { limit: 10 });
    assert.equal(s.data.publications.length, count);
    // Repeat ticks must not stack duplicate opportunities.
    assert.equal(second.opportunities_open, summary.opportunities_open);
    const health = getCampaignHealth(s);
    assert.equal(health.campaigns, 1);
    assert.ok(Array.isArray(health.channels) && health.channels.length === 7);
    ok("tick + health (no-cron scheduler)");
  }
}

main()
  .then(() => {
    console.log(`\n${passed} test groups passed`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
