import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignHealth } from "@/lib/campaign/scheduler";
import { getCampaignStore } from "@/lib/campaign/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Minimal public health: counts only, no content. Safe for uptime monitors.
export async function GET(request: Request) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  return json(getCampaignHealth(getCampaignStore()));
}

export async function POST() {
  return methodNotAllowed("GET");
}
