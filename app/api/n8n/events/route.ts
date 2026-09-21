import {
  checkRate,
  json,
  methodNotAllowed,
  readJsonBody,
} from "@/lib/campaign/http";
import {
  checkMachineAuth,
  getCampaignStore,
  persistCampaignStore,
} from "@/lib/campaign/store";
import { eventSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = await checkRate(request, 60, "write");
  if (limited) return limited;
  if (!checkMachineAuth(request)) {
    return json({ error: "Unauthorized." }, 401);
  }
  try {
    const parsed = eventSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const store = getCampaignStore();
    const event = store.emit(
      parsed.data.type,
      parsed.data.entity_id,
      parsed.data.payload ?? {},
    );
    persistCampaignStore();
    return json({ event }, 202);
  } catch (error) {
    logger.error("n8n event intake failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Event intake failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
