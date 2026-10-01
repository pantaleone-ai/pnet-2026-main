/**
 * Growth Meta platform adapter config (pure, extractable).
 *
 * Per-app dataset resolution with a shared `event_id` dedup contract:
 * browser and server (CAPI) sends reuse the same event ID so Meta dedups
 * the pair. No network here — callers own pixel/CAPI dispatch.
 */

export type MetaAppConfig = {
  appId: string;
  connected: boolean;
  pixelId: string | null;
  datasetId: string | null;
  /** Absent server token name for this app (never the token itself). */
  tokenEnvVar: string;
  missingSource: string | null;
};

export function getMetaConfig(
  appId: string,
  env: { pixelId?: string | null; tokenPresent: boolean },
): MetaAppConfig {
  const pixelId = env.pixelId ?? null;
  const connected = pixelId !== null && pixelId.length > 0 && env.tokenPresent;
  return {
    appId,
    connected,
    pixelId,
    datasetId: pixelId,
    tokenEnvVar: `META_CAPI_ACCESS_TOKEN_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
    missingSource: connected ? null : "meta-unconfigured",
  };
}

export type DedupContract = {
  event_name: string;
  event_id: string;
};

export function dedupKey(contract: DedupContract): string {
  return `${contract.event_name}:${contract.event_id}`;
}
