// Pinterest v5 publishing. Proven flow: OAuth code -> access+refresh tokens,
// then POST /v5/pins. App credentials live in .env.local (never in repo).
// Scopes required: boards:read,boards:write,pins:read,pins:write,user_accounts:read.
// Video pins: POST /v5/media (register) -> multipart upload to S3 -> GET
// /v5/media/{id} (succeeded) -> POST /v5/pins with source_type video_id.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

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
    media_source: { source_type: "image_url", url: imageUrl },
    title: title.slice(0, 100),
    description: description.slice(0, 800),
    link,
  });
  if (!res.id) throw new Error(`pin create failed: ${JSON.stringify(res).slice(0, 300)}`);
  // Canonical pin URL (the API echoes back the destination `link`, which is
  // not a pinterest.com URL — proofPosted() relies on a pin URL for idempotency).
  return { id: res.id, link: `https://www.pinterest.com/pin/${res.id}/` };
}

export interface VideoUploadRegistration {
  media_id: string;
  upload_url: string;
  upload_parameters: Record<string, string>;
}

/** Video step 1: register intent to upload. Returns media_id + S3 upload target. */
export function registerVideoUpload(token: string): VideoUploadRegistration {
  const res = api<{ media_id?: string; upload_url?: string; upload_parameters?: Record<string, string> }>(
    "POST",
    "/media",
    token,
    { media_type: "video" },
  );
  if (!res.media_id || !res.upload_url || !res.upload_parameters) {
    throw new Error(`media register failed: ${JSON.stringify(res).slice(0, 300)}`);
  }
  return { media_id: res.media_id, upload_url: res.upload_url, upload_parameters: res.upload_parameters };
}

/** Video step 2: multipart upload of a local .mp4/.mov/.m4v to the S3 upload_url. No auth. */
export function uploadVideoFile(uploadUrl: string, uploadParameters: Record<string, string>, filePath: string): void {
  if (!existsSync(filePath)) throw new Error(`video file not found: ${filePath}`);
  if (!/\.(mp4|mov|m4v)$/i.test(filePath)) throw new Error(`video must be .mp4/.mov/.m4v: ${filePath}`);
  const args = ["-sS", "-f", "-m", "300", "-X", "POST", uploadUrl];
  for (const [k, v] of Object.entries(uploadParameters)) args.push("-F", `${k}=${v}`);
  args.push("-F", `file=@"${filePath}"`);
  try {
    execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`video S3 upload failed: ${String(error).slice(0, 300)}`);
  }
}

export function getMedia(token: string, mediaId: string): { status?: string; [k: string]: unknown } {
  return api("GET", `/media/${mediaId}`, token);
}

/** Video step 3: poll until status=succeeded (throws on failed/timeout). */
export function waitForVideoReady(token: string, mediaId: string, tries = 12, delayMs = 5000): void {
  for (let i = 0; i < tries; i += 1) {
    const res = getMedia(token, mediaId);
    if (res.status === "succeeded") return;
    if (res.status === "failed") throw new Error(`video processing failed: ${JSON.stringify(res).slice(0, 300)}`);
    execFileSync("sleep", [String(delayMs / 1000)]);
  }
  throw new Error(`video not ready after ${(tries * delayMs) / 1000}s (media ${mediaId})`);
}

/** Video step 4: create the pin from an uploaded video + public cover image URL. */
export function createVideoPin(
  token: string,
  boardId: string,
  mediaId: string,
  coverImageUrl: string,
  title: string,
  description: string,
  link: string,
): PinResult {
  if (!/^https:\/\//.test(coverImageUrl)) throw new Error("cover image must be a public https URL");
  const res = api<{ id?: string }>("POST", "/pins", token, {
    board_id: boardId,
    media_source: { source_type: "video_id", media_id: mediaId, cover_image_url: coverImageUrl },
    title: title.slice(0, 100),
    description: description.slice(0, 800),
    link,
  });
  if (!res.id) throw new Error(`video pin create failed: ${JSON.stringify(res).slice(0, 300)}`);
  return { id: res.id, link: `https://www.pinterest.com/pin/${res.id}/` };
}
