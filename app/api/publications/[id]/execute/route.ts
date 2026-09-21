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
import { executeSchema } from "@/lib/campaign/validation";
import { logger } from "@/lib/logger";
import { executePublication } from "@/modules/campaign-os/src/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const limited = await checkRate(request, 60, "write");
  if (limited) return limited;
  if (!checkMachineAuth(request)) {
    return json({ error: "Unauthorized." }, 401);
  }
  try {
    const { id } = await ctx.params;
    const store = getCampaignStore();
    if (!store.data.publications.some((p) => p.id === id)) {
      return json({ error: "Not found." }, 404);
    }
    const parsed = executeSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400,
      );
    }
    const out = await executePublication(store, id, parsed.data.dry_run);
    persistCampaignStore();
    return json(out, out.status === "published" ? 200 : 502);
  } catch (error) {
    logger.error("Publication execute failed", error, {
      context: "campaign-api",
    });
    return json({ error: "Execute failed." }, 500);
  }
}

export async function GET() {
  return methodNotAllowed("POST");
}
