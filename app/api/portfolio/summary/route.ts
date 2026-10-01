import { NextResponse } from "next/server";

import { PORTFOLIO_APPS } from "@/config/portfolio";
import { GROWTH_EVENTS } from "@/lib/growth/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function envSuffix(appId: string): string {
  return appId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

type GateChecklist = {
  ga4: boolean;
  meta: boolean;
  conversionMapped: boolean;
  utmStandard: boolean;
  consentEnforced: boolean;
  revenueWired: boolean;
};

/**
 * Portfolio roll-up + per-app Stage-0 gate checklist.
 *
 * Read-only and derived: registry data plus server-side env presence.
 * Unconfigured values report `false` with a `missingSources` marker —
 * never fabricated metrics. GA4/Meta fire only when their per-app
 * (or shared) env vars are present; Pinterest/X/Reddit stay scaffolded
 * until configured.
 */
export async function GET() {
  const apps = PORTFOLIO_APPS.map((app) => {
    const suffix = envSuffix(app.id);
    const ga4 =
      (process.env[`NEXT_PUBLIC_GA4_ID_${suffix}`] ?? process.env.NEXT_PUBLIC_GA4_ID ?? null) !== null;
    const metaPixel =
      (process.env[`NEXT_PUBLIC_META_PIXEL_ID_${suffix}`] ??
        process.env.NEXT_PUBLIC_META_PIXEL_ID ??
        null) !== null;
    const metaToken =
      (process.env[`META_CAPI_ACCESS_TOKEN_${suffix}`] ??
        process.env.META_CAPI_ACCESS_TOKEN ??
        null) !== null;
    const meta = metaPixel && metaToken;
    const conversionMapped = (GROWTH_EVENTS as readonly string[]).includes(
      app.primaryActivationEvent,
    );
    const revenueWired =
      app.monetization.hasProducts ||
      app.monetization.hasSubscriptions ||
      app.monetization.hasAffiliateRevenue;

    const gates: GateChecklist = {
      ga4,
      meta,
      conversionMapped,
      // Static capabilities shipped in lib/growth (code present = true).
      utmStandard: true,
      consentEnforced: true,
      revenueWired,
    };

    const missingSources = [
      ga4 ? null : "ga4-unconfigured",
      meta ? null : "meta-unconfigured",
      conversionMapped ? null : "activation-unmapped",
      revenueWired ? null : "revenue-unwired",
    ].filter((source): source is string => source !== null);

    return {
      id: app.id,
      name: app.name,
      domain: app.domain,
      category: app.category,
      status: app.status,
      primaryActivationEvent: app.primaryActivationEvent,
      monetization: app.monetization,
      channelFit: app.channelFit,
      gates,
      stage0Ready: missingSources.length === 0,
      missingSources,
    };
  });

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      appCount: apps.length,
      readyCount: apps.filter((app) => app.stage0Ready).length,
      apps,
    },
    { headers: NO_STORE },
  );
}
