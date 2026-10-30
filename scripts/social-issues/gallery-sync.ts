// Nightly gallery sync: detect images that went live on synthetic.pics and
// create one FB + one IG + one Pinterest social issue per new artwork (status:queued).
// Detection is a free, unauthenticated poll of the public gallery API —
// zero changes to the synthetic.pics repo. Idempotent: skips artwork IDs
// already in SYN_CATALOG or already referenced by any social issue (FB/IG),
// and skips Pinterest when a pin issue already references the artwork.
// Copy is deterministic from real site fields (title/altText/tags/slug) and
// gated by the social audit (fail => skipped, never published).
// Run: npx tsx scripts/social-issues/gallery-sync.ts [--dry-run] [--apply] [--limit 10] [--platforms fb,ig,pin]
import { readFileSync, writeFileSync } from "node:fs";
import { gh, ghJson } from "../content-issues/gh";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
import { auditSocialCopy } from "@/lib/social-growth/social-audit";
import { stripTitlePrefix } from "@/lib/social-growth/caption";
import { AUTOMATION_POLICY } from "@/config/automation/policy";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

interface GalleryItem {
  id: string;
  slug: string;
  date: string;
  title: string;
  description: string;
  altText: string;
  tags: string[];
  imageUrl: string;
}

interface IssueRef {
  number: number;
  body: string;
  labels: Array<{ name: string }>;
}

const GALLERY_BASE = "https://www.synthetic.pics/api/gallery";

async function fetchPage(cursor?: string): Promise<{
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const url = cursor
    ? `${GALLERY_BASE}?limit=100&cursor=${encodeURIComponent(cursor)}`
    : `${GALLERY_BASE}?limit=100`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`gallery poll failed: HTTP ${res.status}`);
  return (await res.json()) as {
    items: GalleryItem[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

function baseId(id: string): string {
  return id.replace(/\.(avif|png|jpe?g|webp)$/i, "");
}

function slugWords(slug: string): string[] {
  return slug
    .replace(/^\d{4}-\d\d-\d\d-/, "")
    .split("-")
    .filter(Boolean);
}

function cap(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export { stripTitlePrefix };

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function inRange(s: string, min: number, max: number): boolean {
  const w = countWords(s);
  return w >= min && w <= max;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const limit = Number(flag("--limit") || "10");
  const platforms = (flag("--platforms") || "fb,ig,pin")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p === "fb" || p === "ig" || p === "pin");
  if (platforms.length === 0) {
    console.error("no valid platforms (want fb, ig and/or pin)");
    process.exit(1);
  }
  console.log(
    `gallery-sync policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} limit=${limit} platforms=${platforms.join(",")}`,
  );
  if (apply && !AUTOMATION_POLICY.social.nightly.enabled) {
    console.log(
      "nightly automation disabled by policy (social.nightly.enabled=false); dry-run only.",
    );
    return;
  }

  // 1. Poll gallery (newest first), stop at first fully-seen page.
  const catalogIds = new Set(SYN_CATALOG.map((a) => a.id));
  const seen: GalleryItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const { items, nextCursor, hasMore } = await fetchPage(cursor);
    if (items.length === 0) break;
    seen.push(...items);
    if (items.every((it) => catalogIds.has(baseId(it.id)))) break;
    if (!hasMore || !nextCursor) break;
    cursor = nextCursor;
  }
  console.log(`polled ${seen.length} artworks`);

  // 2. Artwork IDs already covered by any social issue (dedupe key).
  const issues = ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,body,labels",
  ]);
  const referenced = new Set<string>();
  const pinReferenced = new Set<string>();
  for (const i of issues) {
    const isPin = (i.labels ?? []).some(
      (l) => l.name === "platform:pinterest",
    );
    for (const m of i.body.matchAll(/20\d\d-\d\d-\d\d-[a-z0-9-]+/g)) {
      referenced.add(m[0]);
      if (isPin) pinReferenced.add(m[0]);
    }
  }

  const fresh = seen.filter(
    (it) => !catalogIds.has(baseId(it.id)) && !referenced.has(baseId(it.id)),
  );
  // Pinterest coverage is tracked separately: an artwork with FB/IG issues
  // but no pin still gets its pin (board strategy: every artwork gets a pin).
  const freshPin = seen.filter(
    (it) =>
      !catalogIds.has(baseId(it.id)) && !pinReferenced.has(baseId(it.id)),
  );
  // FIFO oldest-first: gallery returns newest first, so reverse.
  fresh.reverse();
  freshPin.reverse();
  // Union pool oldest-first (fresh first, then pin-only gaps).
  const pool: typeof seen = [];
  const pooled = new Set<string>();
  for (const it of [...fresh, ...freshPin]) {
    const k = baseId(it.id);
    if (!pooled.has(k)) {
      pooled.add(k);
      pool.push(it);
    }
  }
  console.log(`fresh artworks: ${fresh.length} (pin gaps: ${freshPin.length})`);
  if (pool.length === 0) {
    console.log("(nothing new)");
    return;
  }

  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  let created = 0;
  let skipped = 0;
  for (const item of pool.slice(0, limit)) {
    const slug = baseId(item.slug || item.id);
    const words = slugWords(slug);
    const title = item.title?.trim() || cap(words.slice(0, 3).join(" "));
    const tag0 = item.tags?.[0]?.trim() || words[0] || "gallery";
    let hook = `New in the gallery: ${title} in ${tag0}.`;
    if (hook.length > 100)
      hook = `New in the gallery: ${title.slice(0, 40).trimEnd()}.`;
    const alt = (item.altText ?? "").trim();
    const desc = (item.description ?? "").trim();
    const rawBody = inRange(alt, 6, 14)
      ? alt
      : inRange(desc, 6, 14)
        ? desc
        : `Now hanging in the gallery, ready to browse.`;
    // Rule: body never repeats the artwork name from the hook.
    const body = stripTitlePrefix(rawBody, title);
    const concept =
      (words[0] ?? "art")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12) || "ART";

    // Catalog entry first (so a later re-run never re-proposes).
    const format = (
      /\.([a-z0-9]+)$/i.exec(item.imageUrl ?? "")?.[1] ?? "avif"
    ).toLowerCase();
    const catalogEntry = {
      id: slug,
      imageUrl: item.imageUrl,
      firstSeen: item.date,
      descriptor: words.join(" "),
      format,
    };
    if (apply && !catalogIds.has(slug)) {
      const path = "config/social-growth/syn-catalog.ts";
      const src = readFileSync(path, "utf8");
      const entry = `  {\n    id: ${JSON.stringify(catalogEntry.id)},\n    imageUrl:\n      ${JSON.stringify(catalogEntry.imageUrl)},\n    firstSeen: ${JSON.stringify(catalogEntry.firstSeen)},\n    descriptor: ${JSON.stringify(catalogEntry.descriptor)},\n    format: ${JSON.stringify(catalogEntry.format)},\n  },\n];`;
      if (!src.includes(`id: ${JSON.stringify(slug)}`)) {
        writeFileSync(path, src.replace(/\];\s*$/, entry));
        console.log(`catalog += ${slug}`);
      }
      catalogIds.add(slug);
    }

    for (const p of platforms) {
      if (p !== "pin" && (catalogIds.has(slug) || referenced.has(slug)))
        continue;
      if (p === "pin" && (catalogIds.has(slug) || pinReferenced.has(slug)))
        continue;
      const platform =
        p === "ig" ? "instagram" : p === "fb" ? "facebook" : "pinterest";
      const contentId = `syn-${p}-${slug}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-");
      const tag = p === "ig" ? "IG" : p === "fb" ? "FB" : "PIN";
      const campaign = `SYN_${tag}_DISCOVERY_ARTBUYERS_US_${yyyymm}`;
      const creative = `SYN_${concept}_${tag}_V1`;
      const url = `https://www.synthetic.pics?utm_source=${platform}&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${creative}`;
      const pillar = p === "ig" ? "discovery" : p === "fb" ? "product" : "portfolio";
      const audit = await auditSocialCopy({
        hook,
        body,
        cta: "Explore the gallery",
        platform: (p === "pin" ? "facebook" : platform) as
          | "instagram"
          | "facebook",
        pillar,
        hashtags: [],
        sourceAsset: `Gallery artwork: ${slug}`,
        destinationUrl: url,
      });
      if (audit.verdict === "fail") {
        console.log(
          `skip ${slug}/${p}: audit fail: ${audit.reasons.join(" | ")}`,
        );
        skipped += 1;
        continue;
      }
      const title_ = `[Social] ${contentId} — ${hook.length > 60 ? `${hook.slice(0, 60).trimEnd()}…` : hook}`;
      const issueBody = [
        `**App:** \`synthetic-pics\``,
        `**Platform:** \`${platform}\``,
        `**Social pillar:** \`${pillar}\``,
        `**Content type:** \`${p === "ig" ? "photo" : p === "fb" ? "facebook-post" : "pin"}\``,
        `**Content ID:** \`${contentId}\``,
        `**Hook:** \`${hook}\``,
        `**Body:** \`${body}\``,
        `**CTA:** \`Explore the gallery\``,
        `**Destination:** \`${url}\``,
        `**Media:** \`${p === "ig" ? "Single 1080x1350 visual + short caption, native IG photo post (one artwork per post)" : p === "fb" ? "Single 1200x630 visual + short caption, photo post" : "Single 1000x1500 pin card from gallery artwork (portrait JPEG, native pin)"}\``,
        `**Campaign:** \`${campaign}\``,
        `**Creative:** \`${creative}\``,
        `**Priority:** \`p2\``,
        `**Audience:** \`Art browsers\``,
        `**Source asset:** \`Gallery artwork: ${slug}\``,
        ``,
        `Nightly gallery sync (policy ${AUTOMATION_POLICY.version}): artwork went live ${item.date}.` +
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
        "site:synthetic-pics",
        "--label",
        `platform:${platform}`,
        "--label",
        "status:queued",
        "--label",
        "spri:p2",
        "--label",
        `spillar:${pillar}`,
      ]);
      console.log(`created - ${out.trim()} : ${contentId}`);
      created += 1;
      referenced.add(slug);
      if (p === "pin") pinReferenced.add(slug);
    }
  }
  console.log(
    `done: created=${created} skipped=${skipped} (dry-run: no writes)`,
  );
}

const isMain = (process.argv[1] ?? "").endsWith("gallery-sync.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
