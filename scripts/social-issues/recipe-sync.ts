// Nightly mixphd intake: poll the public sitemap for recipes published in the
// last ~72h, verify the hero image, and create one FB + one IG social issue
// per recipe (status:queued). Zero changes to the mixphd repo — sitemap poll
// only (free, unauthenticated). FIFO oldest-first, deduped on recipe slug,
// copy audited (fail => skip, never publish).
// Run: npx tsx scripts/social-issues/recipe-sync.ts [--dry-run] [--apply] [--limit 2] [--platforms fb,ig] [--since-hours 72]
import { gh, ghJson } from "../content-issues/gh";
import { auditSocialCopy } from "@/lib/social-growth/social-audit";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

export interface SitemapRecipe {
  url: string;
  slug: string;
  lastmod: string;
  image: string;
}

const SITE = "https://www.mixphd.com";
const MIN_IMAGE_BYTES = 30 * 1024;

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

export function inRange(s: string, min: number, max: number): boolean {
  const w = countWords(s);
  return w >= min && w <= max;
}

export async function sitemapRecipes(): Promise<SitemapRecipe[]> {
  // Browser-like UA: Cloudflare on mixphd 403s datacenter/bot UAs (GH runners
  // hit this, local dev does not). Full Chrome UA + browser headers passes.
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
  };
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(`${SITE}/sitemap.xml`, {
        signal: AbortSignal.timeout(60000),
        headers,
      });
      if (res.status === 403 || res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter
          ? Number(retryAfter) * 1000
          : attempt * 5000;
        console.log(
          `sitemap fetch HTTP ${res.status} (attempt ${attempt}/3, Cloudflare/bot-guard?) — retrying in ${Math.round(waitMs / 1000)}s`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        lastError = new Error(`sitemap fetch failed: HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
      const xml = await res.text();
      const out: SitemapRecipe[] = [];
      for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
        const body = block[1] ?? "";
        const loc = /<loc>([^<]+)<\/loc>/.exec(body)?.[1]?.trim() ?? "";
        if (!loc.startsWith(`${SITE}/recipes/`)) continue;
        const slug = loc.slice(`${SITE}/recipes/`.length).replace(/\/$/, "");
        if (!slug || slug === "categories" || slug === "tags" || slug.includes("/"))
          continue;
        const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(body)?.[1]?.trim() ?? "";
        const image =
          /<image:loc>([^<]+)<\/image:loc>/.exec(body)?.[1]?.trim() ?? "";
        out.push({ url: loc, slug, lastmod, image });
      }
      return out;
    } catch (e) {
      lastError = e;
      if (attempt < 3) {
        console.log(
          `sitemap fetch error (attempt ${attempt}/3): ${e instanceof Error ? e.message.split("\n")[0] : String(e)} — retrying`,
        );
        await new Promise((r) => setTimeout(r, attempt * 5000));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`sitemap fetch failed after 3 attempts`);
}

export async function pageMeta(
  url: string,
): Promise<{ title: string; description: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`recipe page fetch failed: HTTP ${res.status}`);
  const html = await res.text();
  const ogTitle =
    /<meta[^>]+property="og:title"[^>]+content="([^"]*)"/.exec(html)?.[1] ??
    /<title>([^<]*)<\/title>/.exec(html)?.[1] ??
    "";
  const desc =
    /<meta name="description"[^>]*content="([^"]*)"/.exec(html)?.[1] ??
    /<meta[^>]*property="og:description"[^>]*content="([^"]*)"/.exec(
      html,
    )?.[1] ??
    "";
  const title = decodeEntities(ogTitle)
    .replace(/\s*[|–—-]\s*MixPHD.*$/i, "")
    .trim();
  return { title, description: decodeEntities(desc) };
}

export function firstSentence(s: string): string {
  const m = s.match(/^[^.!?]+[.!?]/);
  return (m?.[0] ?? s).trim();
}

export async function heroOk(
  url: string,
): Promise<{ ok: boolean; reason: string }> {
  if (!url) return { ok: false, reason: "no hero image in sitemap" };
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) return { ok: false, reason: `hero HEAD ${res.status}` };
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > 0 && len < MIN_IMAGE_BYTES)
      return {
        ok: false,
        reason: `hero too small (${len} bytes, stub likely)`,
      };
    return {
      ok: true,
      reason: len > 0 ? `${len} bytes` : "no content-length, assuming live",
    };
  } catch (e) {
    return {
      ok: false,
      reason: `hero fetch failed: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`,
    };
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const nightly = AUTOMATION_POLICY.social.nightly as unknown as {
    enabled: boolean;
    mixphd?: { enabled: boolean; intakeLimit: number };
  };
  if (apply && (!nightly.enabled || nightly.mixphd?.enabled === false)) {
    console.log(
      "nightly mixphd automation disabled by policy (social.nightly.enabled/social.nightly.mixphd.enabled=false); dry-run only.",
    );
    return;
  }
  const limit = Number(flag("--limit") || "2");
  const sinceHours = Number(flag("--since-hours") || "72");
  const platforms = (flag("--platforms") || "fb,ig")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p === "fb" || p === "ig");
  if (platforms.length === 0) {
    console.error("no valid platforms (want fb and/or ig)");
    process.exit(1);
  }
  console.log(
    `recipe-sync policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} limit=${limit} platforms=${platforms.join(",")}`,
  );

  const cutoff = Date.now() - sinceHours * 3600000;
  const all = await sitemapRecipes();
  console.log(`sitemap recipes: ${all.length}`);
  const fresh = all.filter((r) => {
    const t = new Date(r.lastmod).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  });
  console.log(`published in last ${sinceHours}h: ${fresh.length}`);
  if (fresh.length === 0) {
    console.log("(nothing new)");
    return;
  }

  const existing = ghJson<Array<{ body: string }>>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "body",
  ]);
  const referenced = new Set<string>();
  for (const i of existing) {
    const m = i.body.match(/\*\*Source asset:\*\*\s*`Recipe:\s*([^`]+)`/);
    if (m?.[1]) referenced.add(m[1].trim());
  }
  const candidates = fresh
    .filter((r) => !referenced.has(r.slug))
    .sort(
      (a, b) => new Date(a.lastmod).getTime() - new Date(b.lastmod).getTime(),
    );
  console.log(`not yet queued: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log("(all fresh recipes already have issues)");
    return;
  }

  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  let created = 0;
  let skipped = 0;
  for (const r of candidates.slice(0, limit)) {
    const slugWords = r.slug
      .replace(/-cocktail-recipe$/, "")
      .split("-")
      .filter(Boolean);
    const hero = await heroOk(r.image);
    if (!hero.ok) {
      console.log(`skip ${r.slug}: ${hero.reason}`);
      skipped += 1;
      continue;
    }
    let meta = { title: "", description: "" };
    try {
      meta = await pageMeta(r.url);
    } catch (e) {
      console.log(
        `skip ${r.slug}: ${e instanceof Error ? e.message : String(e)}`,
      );
      skipped += 1;
      continue;
    }
    const rawName =
      meta.title ||
      slugWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const name =
      rawName.replace(/\s+(cocktail\s+)?recipe$/i, "").trim() || rawName;
    const hook = `New recipe: ${name.length > 40 ? `${name.slice(0, 37).trimEnd()}…` : name}.`;
    const first = firstSentence(meta.description);
    const fallbackWords = slugWords.slice(0, 2);
    const body = inRange(first, 6, 14)
      ? first
      : `A new ${fallbackWords.join(" ") || "house"} pour to try tonight.`;
    const descriptors = [
      ...slugWords,
      ...name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    ];
    for (const p of platforms) {
      const platform = p === "ig" ? "instagram" : "facebook";
      const contentId = `mix-${p}-${r.slug}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-");
      const campaign = `MIX_${p === "ig" ? "IG" : "FB"}_TRAFFIC_HOMEBAR_US_${yyyymm}`;
      const concept =
        (slugWords[0] ?? "mix")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 12) || "MIX";
      const creative = `MIX_${concept}_${p === "ig" ? "IG" : "FB"}_V1`;
      const url = `${r.url}?utm_source=${platform}&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${creative}`;
      const audit = await auditSocialCopy({
        hook,
        body,
        cta: "Read the recipe",
        platform: platform as "instagram" | "facebook",
        pillar: p === "ig" ? "discovery" : "how-to",
        hashtags: [],
        sourceAsset: undefined,
        destinationUrl: url,
      });
      // Fidelity against slug words (same titleMatchesArtwork rule, recipe descriptors).
      const { titleMatchesArtwork } =
        await import("@/lib/social-growth/media-registry");
      if (
        !titleMatchesArtwork(hook, descriptors) &&
        !titleMatchesArtwork(body, descriptors)
      ) {
        console.log(
          `skip ${r.slug} [${p}]: hook+body match no slug vocabulary`,
        );
        skipped += 1;
        continue;
      }
      if (audit.verdict === "fail") {
        console.log(
          `skip ${r.slug} [${p}]: audit fail: ${audit.reasons.join(" | ")}`,
        );
        skipped += 1;
        continue;
      }
      const title_ = `[Social] ${contentId} — ${hook.length > 60 ? `${hook.slice(0, 60).trimEnd()}…` : hook}`;
      const issueBody = [
        `**App:** \`mixphd\``,
        `**Platform:** \`${platform}\``,
        `**Social pillar:** \`${p === "ig" ? "discovery" : "how-to"}\``,
        `**Content type:** \`${p === "ig" ? "photo" : "facebook-post"}\``,
        `**Content ID:** \`${contentId}\``,
        `**Hook:** \`${hook}\``,
        `**Body:** \`${body}\``,
        `**CTA:** \`Read the recipe\``,
        `**Destination:** \`${url}\``,
        `**Media:** \`${p === "ig" ? "Single 1080x1350 visual + short caption, native IG photo post (one recipe hero per post)" : "Single 1200x630 visual + short caption, photo post"}\``,
        `**Campaign:** \`${campaign}\``,
        `**Creative:** \`${creative}\``,
        `**Priority:** \`p2\``,
        `**Audience:** \`Home bartenders\``,
        `**Source asset:** \`Recipe: ${r.slug}\``,
        `**Hero image:** \`${r.image}\``,
        ``,
        `Nightly mixphd sync (policy ${AUTOMATION_POLICY.version}): recipe went live ${r.lastmod.slice(0, 10)}. Hero: ${hero.reason}.` +
          (audit.verdict === "warn"
            ? ` Copy audit: warn (${audit.reasons.join("; ")}).`
            : ""),
      ].join("\n");
      if (!apply) {
        console.log(
          `would-create - ${title_} [${p}]${audit.verdict === "warn" ? " (warn)" : ""}`,
        );
        continue;
      }
      const out = gh([
        "issue",
        "create",
        "--title",
        title_,
        "--body",
        issueBody,
        "--label",
        "social",
        "--label",
        "site:mixphd",
        "--label",
        `platform:${platform}`,
        "--label",
        "status:queued",
        "--label",
        "spri:p2",
        "--label",
        `spillar:${p === "ig" ? "discovery" : "how-to"}`,
      ]);
      console.log(`created - ${out.trim()} : ${contentId}`);
      created += 1;
      referenced.add(r.slug);
    }
  }
  console.log(
    `done: created=${created} skipped=${skipped} (dry-run: no writes)`,
  );
}

const isMain = (process.argv[1] ?? "").endsWith("recipe-sync.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
