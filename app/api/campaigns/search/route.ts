import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { getCampaignStore } from "@/lib/campaign/store";
import { globalSearch } from "@/modules/campaign-os/src/lib/engine-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return json(globalSearch(getCampaignStore(), q.slice(0, 200)));
}

export async function POST() {
  return methodNotAllowed("GET");
}
