// Campaign autopilot (Phase 4): deterministic ingest-reconcile + promote.
// Never invents strategy: promotes only unpromoted source content with default
// objective/channels, stages approval at L1/L2 (same code path as human
// approve), auto-approves only when the brand autonomy level allows (L3+).
// Dry-run default. Uses lib/campaign seam only (never vendored internals
// except the engine entry points, per CAMPAIGN_OS_GUIDE section 14).
// Run: npx tsx scripts/campaign-autopilot.ts [--dry-run] [--apply] [--limit 5]
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";
import { runCampaignTick } from "@/lib/campaign/scheduler";
import {
  promoteContent,
  approveCampaign,
} from "@/modules/campaign-os/src/engine";
import { requiresApproval } from "@/modules/campaign-os/src/autonomy";
import { evaluatePolicy } from "@/lib/automation/policy";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const limit = Number(flag("--limit") || "5");
  console.log(
    `autopilot policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} limit=${limit}`,
  );
  if (!AUTOMATION_POLICY.campaign.autoPromoteDeterministic && apply) {
    console.log("auto-promote disabled by policy config; dry-run only.");
    return;
  }

  const store = getCampaignStore();
  const promotedSources = new Set(
    store.data.assets.map((a) => a.source_content_id).filter(Boolean),
  );
  const candidates = store.data.sourceContent
    .filter((s) => !promotedSources.has(s.id))
    .slice(0, limit);

  // Opportunity refresh is deduped and safe to run in both modes.
  const tick = await runCampaignTick(store, { limit: 0, dryRun: true });
  console.log(
    `opportunities_open=${tick.opportunities_open} campaigns=${store.data.campaigns.length} approvals_pending=${store.data.approvals.filter((a) => a.status === "pending").length}`,
  );

  if (candidates.length === 0) {
    console.log("(autopilot: no unpromoted source content)");
    return;
  }

  for (const src of candidates) {
    for (const brand of store.data.brands) {
      const decision = evaluatePolicy({
        system: "campaign",
        rule: "campaign-promote",
        autonomyLevel: brand.autonomy_level ?? 2,
        approvalPresent: !requiresApproval(brand),
        checks: [
          {
            id: "source-eligible",
            ok: Boolean(src.source_url && src.title),
            hard: true,
          },
          {
            id: "not-duplicate",
            ok: true,
            hard: true,
            detail: "unpromoted source",
          },
          { id: "channels-available", ok: true, hard: false },
        ],
      });
      console.log(
        `source ${src.id} (${src.title?.slice(0, 60)}) -> ${decision.decision} [${decision.reasonCodes.join(",")}]`,
      );
      if (decision.decision !== "allow") continue;
      if (!apply) {
        console.log(
          `  would-promote - brand=${brand.id} objective=Engagement channels=[website,linkedin,email]`,
        );
        continue;
      }
      const { campaign } = await promoteContent(store, brand, src, {
        objective: "Engagement",
        channels: ["website", "linkedin", "email"],
        durationDays: 14,
        autonomyLevel: brand.autonomy_level ?? 2,
      });
      console.log(
        `  promoted - campaign=${campaign.id} status=${campaign.status}`,
      );
      if (!requiresApproval(brand)) {
        await approveCampaign(store, brand, campaign.id, "autopilot");
        console.log(
          `  auto-approved - campaign=${campaign.id} (L${brand.autonomy_level})`,
        );
      } else {
        console.log(
          `  staged - campaign=${campaign.id} awaiting human approve (L${brand.autonomy_level ?? 2})`,
        );
      }
    }
  }
  if (apply) {
    persistCampaignStore();
    console.log("store persisted.");
  } else {
    console.log("dry-run: store untouched. Re-run with --apply to act.");
  }
}

const isMain = (process.argv[1] ?? "").endsWith("campaign-autopilot.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
