import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore } from "@/lib/campaign/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  const store = getCampaignStore();
  return json({
    opportunities: store.data.opportunities.filter((o) => o.status === "open"),
  });
}

export async function POST() {
  return methodNotAllowed("GET");
}
