// eBay shared app credentials. One keyset serves every app ("any app can use
// these keys like with the others"): app-level calls use the shared client-
// credentials token; per-app user actions (listing, orders) use
// EBAY_REFRESH_TOKEN_<APP> after the owner completes RuName consent once.
// See docs/EBAY_INTEGRATION.md. Values never leave env.
export interface EbayAppCreds {
  appId: string;
  devId: string;
  certId: string;
  env: "production" | "sandbox";
  marketplace: string;
}

export function ebayCreds(env: NodeJS.ProcessEnv = process.env): EbayAppCreds | undefined {
  const appId = env.EBAY_APP_ID;
  const certId = env.EBAY_CERT_ID;
  if (!appId || !certId) return undefined;
  return {
    appId,
    devId: env.EBAY_DEV_ID ?? "",
    certId,
    env: env.EBAY_ENV === "sandbox" ? "sandbox" : "production",
    marketplace: env.EBAY_MARKETPLACE ?? "EBAY_US",
  };
}

/** Per-app user refresh-token name, mirroring the META_CAPI_ACCESS_TOKEN_<APP> pattern. */
export function ebayUserTokenEnvVar(appId: string): string {
  return `EBAY_REFRESH_TOKEN_${appId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

export function ebayApiHost(env: "production" | "sandbox"): string {
  return env === "sandbox" ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
}
