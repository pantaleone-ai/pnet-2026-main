// Campaign tick CLI — cron replacement for local/dev and servers with
// process access. Production trigger is POST /api/campaigns/tick
// (see .github/workflows/campaign-tick.yml).
// Run: npm run campaign:tick -- --limit 25 --dry-run
import { runCampaignTick } from "@/lib/campaign/scheduler";
import { getCampaignStore, persistCampaignStore } from "@/lib/campaign/store";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  const value = i === -1 ? undefined : process.argv[i + 1];
  return value;
}

async function main(): Promise<void> {
  const limit = Math.min(Math.max(Number(arg("--limit") ?? 25), 1), 100);
  const dryRun = process.argv.includes("--dry-run");

  const summary = await runCampaignTick(getCampaignStore(), {
    limit,
    dryRun,
  });
  persistCampaignStore();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0 && !dryRun) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
