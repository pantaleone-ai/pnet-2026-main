// Meta Graph API transport over curl (sandbox-safe TLS; never logs the token).
// Used by the instagram + facebook publishers. Read-only callers pass method GET.
import { execFileSync } from "node:child_process";

export const GRAPH_VERSION = "v26.0";
const GRAPH_HOST = "https://graph.facebook.com";

function redactError(token: string, message: string): string {
  return message.split(token).join("<token>");
}

export function graphGet<T>(token: string, path: string, params: Record<string, string> = {}): T {
  const args = ["-sS", "-m", "60", "-G", `${GRAPH_HOST}/${GRAPH_VERSION}/${path}`];
  args.push("--data-urlencode", `access_token=${token}`);
  for (const [k, v] of Object.entries(params)) args.push("--data-urlencode", `${k}=${v}`);
  try {
    const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(out) as T;
  } catch (error) {
    const message = error instanceof Error ? redactError(token, error.message) : String(error);
    throw new Error(`graph GET ${path} failed: ${message.slice(0, 400)}`);
  }
}

export function graphPost<T>(token: string, path: string, params: Record<string, string> = {}): T {
  const args = ["-sS", "-m", "60", "-X", "POST", `${GRAPH_HOST}/${GRAPH_VERSION}/${path}`];
  args.push("--data-urlencode", `access_token=${token}`);
  for (const [k, v] of Object.entries(params)) args.push("--data-urlencode", `${k}=${v}`);
  try {
    const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(out) as T;
  } catch (error) {
    const message = error instanceof Error ? redactError(token, error.message) : String(error);
    throw new Error(`graph POST ${path} failed: ${message.slice(0, 400)}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function graphDelete<T>(token: string, path: string): T {
  const args = ["-sS", "-m", "60", "-X", "DELETE", `${GRAPH_HOST}/${GRAPH_VERSION}/${path}`];
  args.push("--data-urlencode", `access_token=${token}`);
  try {
    const out = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(out) as T;
  } catch (error) {
    const message = error instanceof Error ? redactError(token, error.message) : String(error);
    throw new Error(`graph DELETE ${path} failed: ${message.slice(0, 400)}`);
  }
}
