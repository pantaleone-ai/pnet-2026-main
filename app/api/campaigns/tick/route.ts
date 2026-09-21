import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import { runCampaignTick } from "@/lib/campaign/scheduler";
import {
  checkMachineAuth,
  getCampaignStore,
  persistCampaignStore,
} from "@/lib/campaign/store";
import { tickSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";

// Cron replacement: executes due publications + opportunity detection in one
// idempotent call. Triggered by GitHub Actions / uptime monitor / n8n /
// `npm run campaign:tick` — never Vercel Cron.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await checkRate(request, 60, "write");
  if (limited) return limited;
  if (!checkMachineAuth(request)) {
    return json({ error: "Unauthorized." }, 401);
  }
  try {
    const parsed = tickSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const summary = await runCampaignTick(getCampaignStore(), {
      limit: parsed.data.limit,
      dryRun: parsed.data.dry_run,
    });
    persistCampaignStore();
    return json(summary);
  } catch (error) {
    logger.error("Campaign tick failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Tick failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
