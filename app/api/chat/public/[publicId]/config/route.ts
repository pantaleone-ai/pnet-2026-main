import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { resolvePublicChatbot } from "@/lib/tenant-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Safe public config for the hosted page + embed loader. Never exposes
 * keys, prompts, internals, or tenant ids — only what a visitor's browser
 * may render.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb((env as { CHAT_DB?: unknown }).CHAT_DB);
  const resolved = await resolvePublicChatbot(db, publicId);
  if (!resolved) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  }
  let appearance: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(resolved.bot.appearanceJson ?? "{}") as unknown;
    if (parsed && typeof parsed === "object") appearance = parsed as Record<string, unknown>;
  } catch {
    appearance = {};
  }
  return NextResponse.json(
    {
      name: resolved.bot.name,
      welcomeMessage: resolved.welcomeMessage,
      suggestedQuestions: resolved.suggestedQuestions,
      leadCaptureMode: resolved.leadCaptureMode,
      appearance: {
        theme: typeof appearance.theme === "string" ? appearance.theme : "auto",
        launcherPosition:
          appearance.launcherPosition === "left" ? "left" : "right",
      },
    },
    { headers: NO_STORE },
  );
}
