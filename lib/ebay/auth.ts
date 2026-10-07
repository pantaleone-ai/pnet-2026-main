// eBay OAuth: app tokens (client credentials, works now) + user consent
// helpers (RuName code exchange + refresh; needs one owner login per app).
// Docs: https://developer.ebay.com/develop/guides/sell/authorization
import { ebayApiHost, type EbayAppCreds } from "./config";

export interface AppToken {
  accessToken: string;
  expiresIn: number;
}

export async function getAppToken(
  creds: EbayAppCreds,
  scopes: string = "https://api.ebay.com/oauth/api_scope",
): Promise<AppToken> {
  const basic = Buffer.from(`${creds.appId}:${creds.certId}`).toString("base64");
  const res = await fetch(`${ebayApiHost(creds.env)}/identity/v1/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: scopes }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    errors?: unknown;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`ebay app token failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 7200 };
}

/** Step 1 (owner, once per app): open this URL, sign in, authorize, copy `code`. */
export function consentUrl(creds: EbayAppCreds, ruName: string, scopes: string, state: string): string {
  const q = new URLSearchParams({
    client_id: creds.appId,
    redirect_uri: ruName,
    response_type: "code",
    scope: scopes,
  });
  void state;
  return `https://auth.ebay.com/oauth2/authorize?${q.toString()}`;
}

/** Step 2: exchange the pasted code for a user access + refresh token pair. */
export async function exchangeCode(
  creds: EbayAppCreds,
  ruName: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const basic = Buffer.from(`${creds.appId}:${creds.certId}`).toString("base64");
  const res = await fetch(`${ebayApiHost(creds.env)}/identity/v1/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: ruName }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !data.access_token || !data.refresh_token) {
    throw new Error(`ebay code exchange failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in ?? 7200 };
}

/** Step 3 (ongoing): rotate a user token with its refresh token. */
export async function refreshUserToken(
  creds: EbayAppCreds,
  refreshToken: string,
  scopes: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const basic = Buffer.from(`${creds.appId}:${creds.certId}`).toString("base64");
  const res = await fetch(`${ebayApiHost(creds.env)}/identity/v1/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, scope: scopes }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) {
    throw new Error(`ebay refresh failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 7200 };
}
