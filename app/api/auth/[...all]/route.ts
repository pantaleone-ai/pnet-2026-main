import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getAuth } from "@/lib/auth";

/**
 * better-auth request handler. All auth endpoints live here and nowhere
 * else — the browser must never talk to a third-party auth service.
 */
export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  return getAuth(env as Parameters<typeof getAuth>[0]).handler(request);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  return getAuth(env as Parameters<typeof getAuth>[0]).handler(request);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
