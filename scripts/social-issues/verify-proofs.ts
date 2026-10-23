// Proof verification (Phase 5C): confirm platform permalinks behind open
// `needs-screenshot` / proof-carrying issues are still live. Report only —
// never closes issues (screenshot close stays human via publish-due).
// FB: Graph API with META_CAPI_ACCESS_TOKEN (fail-soft without token).
// IG: public HEAD request (login-gated posts report unverified, not dead).
// Run: npx tsx scripts/social-issues/verify-proofs.ts [--limit 20]
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
import { ghJson } from "../content-issues/gh";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

interface IssueView {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  comments: Array<{ body: string }>;
}

async function fbLive(
  postIdOrUrl: string,
  token: string,
): Promise<"live" | "unverified" | "dead"> {
  try {
    const m = postIdOrUrl.match(/facebook\.com\/(\d+)[_ ](\d+)/);
    const id = m ? `${m[1]}_${m[2]}` : postIdOrUrl;
    // Page-scoped token reads page posts more reliably than the system-user token.
    let readToken = token;
    if (m) {
      try {
        const t = await fetch(
          `https://graph.facebook.com/v26.0/${m[1]}?fields=access_token&access_token=${token}`,
          { signal: AbortSignal.timeout(20000) },
        );
        const j = (await t.json()) as { access_token?: string };
        if (j.access_token) readToken = j.access_token;
      } catch {
        /* fall through with system-user token */
      }
    }
    const res = await fetch(
      `https://graph.facebook.com/v26.0/${id}?fields=id,created_time&access_token=${readToken}`,
      { signal: AbortSignal.timeout(20000) },
    );
    if (res.ok) return "live";
    if (res.status === 404) return "dead";
    return "unverified";
  } catch {
    return "unverified";
  }
}

async function igLive(url: string): Promise<"live" | "unverified" | "dead"> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return "live";
    if (res.status === 404 || res.status === 410) return "dead";
    return "unverified"; // login-gated / rate-limited: do not call dead
  } catch {
    return "unverified";
  }
}

async function main(): Promise<void> {
  const limit = Number(flag("--limit") || "20");
  const token = process.env.META_CAPI_ACCESS_TOKEN ?? "";
  const issues = ghJson<IssueView[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,labels,comments",
  ]);
  let checked = 0;
  let live = 0;
  let unverified = 0;
  let dead = 0;
  for (const i of issues) {
    if (checked >= limit) break;
    const proof = i.comments.find((c) =>
      c.body.includes("Platform publish proof"),
    );
    if (!proof) continue;
    const url =
      proof.body.match(
        /https:\/\/(www\.)?(instagram\.com|facebook\.com)\/\S+/,
      )?.[0] ?? "";
    if (!url) continue;
    checked += 1;
    let status: "live" | "unverified" | "dead" = "unverified";
    if (url.includes("facebook.com")) {
      status = token ? await fbLive(url, token) : "unverified";
    } else {
      status = await igLive(url);
    }
    if (status === "live") live += 1;
    else if (status === "dead") dead += 1;
    else unverified += 1;
    console.log(
      `#${i.number} ${url} -> ${status}${token ? "" : " (no token)"}`,
    );
  }
  console.log(
    `\nverify-proofs: checked=${checked} live=${live} unverified=${unverified} dead=${dead}`,
  );
  console.log(
    "Unverified is informational (login-gate/rate-limit), never evidence of removal.",
  );
}

const isMain = (process.argv[1] ?? "").endsWith("verify-proofs.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
