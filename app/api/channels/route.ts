import { checkRate, json, methodNotAllowed } from "@/lib/campaign/http";
import { channelStatuses } from "@/modules/campaign-os/src/channels/index";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Always tells the truth about connectivity — never faked.
export async function GET(request: Request) {
  const limited = await checkRate(request, 60, "read");
  if (limited) return limited;
  return json({ channels: channelStatuses() });
}

export async function POST() {
  return methodNotAllowed("GET");
}
