/**
 * Growth GA4 platform adapter config (pure scaffold, extractable).
 * Absent measurement ID = disabled. Loads nothing.
 */

export type GoogleAppConfig = {
  appId: string;
  connected: boolean;
  measurementId: string | null;
  tokenEnvVar: string;
  missingSource: string | null;
};

export function getGoogleConfig(
  appId: string,
  env: { measurementId?: string | null },
): GoogleAppConfig {
  const measurementId = env.measurementId ?? null;
  const connected = measurementId !== null && measurementId.length > 0;
  return {
    appId,
    connected,
    measurementId,
    tokenEnvVar: `GA4_API_SECRET_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`,
    missingSource: connected ? null : "google-unconfigured",
  };
}
