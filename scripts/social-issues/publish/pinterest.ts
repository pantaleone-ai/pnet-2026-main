// Pinterest v5 publishing. Proven flow: OAuth code -> access+refresh tokens,
// then POST /v5/pins. App credentials live in .env.local (never in repo).
// Scopes required: boards:read,boards:write,pins:read,pins:write,user_accounts:read.
import { execFileSync } from "node:child_process";

const API = "https://api.pinterest.com/v5";
const OAUTH = "https://www.pinterest.com/oauth";

export interface PinResult {
  id: string;
  link: string;
}

function api<T>(method: string, path: string, token: string, body?: unknown): T {
  const args = ["-sS", "-m", "60", "-X", method, `${API}${path}`];
  args.push("-H", `Authorization: Bearer ${token}`, "-H", "Content-Type: application/json");
  if (body !== undefined) args.push("--data", JSON.stringify(body));
  try {
    const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(out) as T;
  } catch (error) {
    throw new Error(`pinterest ${method} ${path} failed: ${String(error).slice(0, 300)}`);
  }
}

/** Step 1 (owner, one click): open this URL, authorize, copy the `code` param. */
export function authorizeUrl(appId: string, redirectUri: string, state: string): string {
  const scopes = ["boards:read", "boards:write", "pins:read", "pins:write", "user_accounts:read"].join(",");
  const q = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, response_type: "code", scope: scopes, state });
  return `${OAUTH}?${q.toString()}`;
}

function tokenExchange(params: Record<string, string>, appId: string, appSecret: string): { access_token: string; refresh_token: string } {
  const basic = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const args = ["-sS", "-m", "60", "-X", "POST", `${API}/oauth/token`];
  args.push("-H", `Authorization: Basic ${basic}`, "-H", "Content-Type: application/x-www-form-urlencoded");
  for (const [k, v] of Object.entries(params)) args.push("--data-urlencode", `${k}=${v}`);
  const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  const res = JSON.parse(out) as { access_token?: string; refresh_token?: string; error?: unknown };
  if (!res.access_token || !res.refresh_token) throw new Error(`token exchange failed: ${out.slice(0, 300)}`);
  return { access_token: res.access_token, refresh_token: res.refresh_token };
}

/** Step 2: exchange the owner-pasted code for tokens (save refresh_token in .env.local). */
export function exchangeCode(appId: string, appSecret: string, code: string, redirectUri: string): { access_token: string; refresh_token: string } {
  return tokenExchange({ grant_type: "authorization_code", code, redirect_uri: redirectUri }, appId, appSecret);
}

/** Step 3 (ongoing): rotate before the ~60d expiry. */
export function refreshAccessToken(appId: string, appSecret: string, refreshToken: string): { access_token: string; refresh_token: string } {
  return tokenExchange({ grant_type: "refresh_token", refresh_token: refreshToken }, appId, appSecret);
}

export function getUser(token: string): { username?: string; account_type?: string } {
  return api("GET", "/user_account", token);
}

export function listBoards(token: string): Array<{ id: string; name: string }> {
  const res = api<{ items?: Array<{ id: string; name: string }> }>("GET", "/boards?page_size=50", token);
  return res.items ?? [];
}

export function createPin(
  token: string,
  boardId: string,
  imageUrl: string,
  title: string,
  description: string,
  link: string,
): PinResult {
  const res = api<{ id?: string; link?: string; error?: unknown }>("POST", "/pins", token, {
    board_id: boardId,
    image_source: { source_type: "image_url", url: imageUrl },
    title: title.slice(0, 100),
    description: description.slice(0, 800),
    link,
  });
  if (!res.id) throw new Error(`pin create failed: ${JSON.stringify(res).slice(0, 300)}`);
  return { id: res.id, link: res.link ?? `https://www.pinterest.com/pin/${res.id}/` };
}
