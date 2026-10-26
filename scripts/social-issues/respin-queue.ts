// Respin queue: repost OLD catalog art / recipes with a fresh spin.
// Weekends + off-hours grids create slot capacity; respins fill it without
// waiting on new intake. Every respin gets: a rotated hook angle, an
// alternate body sentence, a top-anchored crop (pixel-different card), a new
// contentId (`-r2`/`-r3`), a versioned creative (`_V2`/`_V3`), and a
// `**Respin-Of:**` trace back to the original contentId.
//
// Guards (all must pass, else skipped, never published):
// - nothing open already referencing the slug (no queue pile-up)
// - newest referencing issue is --min-age-days old (default 30)
// - exposure cap: max 3 uses/quarter per artwork/slug (shared ledger)
// - hero/source still live (HEAD check; stubs fail like intake)
// - full copy audit gate (fail => skip)
// Run: npx tsx scripts/social-issues/respin-queue.ts [--site all|synthetic-pics|mixphd] [--limit 1] [--min-age-days 30] [--dry-run] [--apply]
import { gh, ghJson } from "../content-issues/gh";
import { SYN_CATALOG } from "@/config/social-growth/syn-catalog";
import { auditSocialCopy } from "@/lib/social-growth/social-audit";
import { eligible, readLedger, recordUse } from "@/lib/social-growth/exposure";
import { AUTOMATION_POLICY } from "@/config/automation/policy";
import {
  firstSentence,
  heroOk,
  inRange,
  pageMeta,
  sitemapRecipes,
} from "./recipe-sync";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

interface IssueRef {
  number: number;
  body: string;
  updatedAt: string;
}

/** Rotated hook angles. Index 0 doubles as the first post for never-posted backlog. */
export function respinHookSyn(
  angle: number,
  title: string,
  tag: string,
): string {
  const t = title.length > 40 ? `${title.slice(0, 37).trimEnd()}…` : title;
  const hooks = [
    `From the archive: ${t} in ${tag}.`,
    `Back by request: ${t}.`,
    `Weekend walls: ${t} in ${tag}.`,
  ];
  return hooks[angle % hooks.length] ?? hooks[0]!;
}

export function respinHookMix(angle: number, name: string): string {
  const n = name.length > 40 ? `${name.slice(0, 37).trimEnd()}…` : name;
  const hooks = [
    `From the recipe box: ${n}.`,
    `Back by request: ${n}.`,
    `Weekend pour: ${n}.`,
  ];
  return hooks[angle % hooks.length] ?? hooks[0]!;
}

/** Version number from prior issue count: 1 prior issue -> r2/V2. */
export function respinVersion(priorCount: number): number {
  return Math.max(1, priorCount + 1);
}

export function respinContentId(base: string, version: number): string {
  return version <= 1 ? base : `${base}-r${version}`;
}

export function respinCreativeVariant(version: number): string {
  return `_V${Math.min(Math.max(version, 1), 9)}`;
}

function cap(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function slugWords(slug: string): string[] {
  return slug
    .replace(/^\d{4}-\d\d-\d\d-/, "")
    .replace(/-cocktail-recipe$/, "")
    .split("-")
    .filter(Boolean);
}

function sentences(s: string): string[] {
  return (
    s
      .match(/[^.!?]+[.!?]/g)
      ?.map((x) => x.trim())
      .filter(Boolean) ?? []
  );
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  if (apply && !AUTOMATION_POLICY.social.nightly.enabled) {
    console.log(
      "nightly automation disabled by policy (social.nightly.enabled=false); dry-run only.",
    );
    return;
  }
  const siteArg = (flag("--site") ?? "all").toLowerCase();
  const sites =
    siteArg === "all"
      ? ["synthetic-pics", "mixphd"]
      : siteArg === "mixphd"
        ? ["mixphd"]
        : ["synthetic-pics"];
  const limit = Number(flag("--limit") || "1");
  const minAgeDays = Number(flag("--min-age-days") || "30");
  const cutoff = Date.now() - minAgeDays * 86400000;
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "");
  console.log(
    `respin-queue policy=${AUTOMATION_POLICY.version} mode=${apply ? "APPLY" : "dry-run"} sites=${sites.join(",")} limit=${limit}/site min-age=${minAgeDays}d`,
  );

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
    "number,body,updatedAt",
  ]);
  const ledger = readLedger();

  for (const site of sites) {
    if (site === "synthetic-pics") {
      await respinSyn(issues, ledger, { limit, cutoff, yyyymm, apply });
    } else {
      await respinMix(issues, ledger, { limit, cutoff, yyyymm, apply });
    }
  }
}

function refsTo(slug: string, issues: IssueRef[]): IssueRef[] {
  return issues.filter((i) => i.body.includes(slug));
}

async function respinSyn(
  issues: IssueRef[],
  ledger: ReturnType<typeof readLedger>,
  opts: { limit: number; cutoff: number; yyyymm: string; apply: boolean },
): Promise<void> {
  const ranked = SYN_CATALOG.map((c) => {
    const refs = refsTo(c.id, issues);
    const last = refs
      .map((r) => new Date(r.updatedAt).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => b - a)[0];
    return { c, refs, last };
  })
    .filter((r) => {
      // No open issue already carrying this artwork.
      if (
        issues.some(
          (i) =>
            i.body.includes(r.c.id) &&
            /status:packet-ready|status:queued|status:in-progress/.test(i.body),
        )
      )
        return false;
      // Rest long enough (or never posted).
      if (r.last !== undefined && r.last > opts.cutoff) return false;
      // Exposure cap.
      if (!eligible(ledger, r.c.id)) return false;
      return true;
    })
    .sort((a, b) => (a.last ?? 0) - (b.last ?? 0));
  console.log(`synthetic-pics respin candidates: ${ranked.length}`);
  let created = 0;
  let started = 0;
  for (const { c, refs, last } of ranked) {
    if (started >= opts.limit) break;
    let itemOk = false;
    const words = slugWords(c.id);
    const title = cap(words.slice(0, 3).join(" ") || "gallery piece");
    const tag = words[0] ?? "gallery";
    const version = respinVersion(refs.length);
    const angle = (version - 1) % 3;
    const bodies = [
      `“${title}” returns to the gallery.`,
      `Back on the wall: ${title}.`,
      `Still turning heads: ${title} in ${tag}.`,
    ];
    const body = bodies[angle] ?? bodies[0]!;
    for (const p of ["ig", "fb"] as const) {
      const platform = p === "ig" ? "instagram" : "facebook";
      const base = `syn-${p}-${c.id}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-");
      const contentId = respinContentId(base, version);
      const hook = respinHookSyn(angle, title, tag);
      const concept =
        (words[0] ?? "art")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 12) || "ART";
      const campaign = `SYN_${p === "ig" ? "IG" : "FB"}_DISCOVERY_ARTBUYERS_US_${opts.yyyymm}`;
      const creative = `SYN_${concept}_${p === "ig" ? "IG" : "FB"}${respinCreativeVariant(version)}`;
      const url = `https://www.synthetic.pics?utm_source=${platform}&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${creative}`;
      const audit = await auditSocialCopy({
        hook,
        body,
        cta: "Explore the gallery",
        platform: platform as "instagram" | "facebook",
        pillar: p === "ig" ? "discovery" : "product",
        hashtags: [],
        sourceAsset: `Gallery artwork: ${c.id}`,
        destinationUrl: url,
      });
      const { titleMatchesArtwork } =
        await import("@/lib/social-growth/media-registry");
      if (
        !titleMatchesArtwork(hook, [c.descriptor]) &&
        !titleMatchesArtwork(body, [c.descriptor])
      ) {
        console.log(
          `skip ${c.id} [${p}]: hook+body match no artwork vocabulary`,
        );
        continue;
      }
      if (audit.verdict === "fail") {
        console.log(
          `skip ${c.id} [${p}]: audit fail: ${audit.reasons.join(" | ")}`,
        );
        continue;
      }
      const title_ = `[Social] ${contentId} — ${hook.length > 60 ? `${hook.slice(0, 60).trimEnd()}…` : hook}`;
      const issueBody = [
        `**App:** \`synthetic-pics\``,
        `**Platform:** \`${platform}\``,
        `**Social pillar:** \`${p === "ig" ? "discovery" : "product"}\``,
        `**Content type:** \`${p === "ig" ? "photo" : "facebook-post"}\``,
        `**Content ID:** \`${contentId}\``,
        `**Hook:** \`${hook}\``,
        `**Body:** \`${body}\``,
        `**CTA:** \`Explore the gallery\``,
        `**Destination:** \`${url}\``,
        `**Media:** \`${p === "ig" ? "Single 1080x1350 visual (top crop, fresh framing), native IG photo post" : "Single 1200x630 visual + short caption, photo post"}\``,
        `**Crop:** \`top\``,
        `**Campaign:** \`${campaign}\``,
        `**Creative:** \`${creative}\``,
        `**Priority:** \`p2\``,
        `**Audience:** \`Art browsers\``,
        `**Source asset:** \`Gallery artwork: ${c.id}\``,
        `**Respin-Of:** \`${base}\``,
        ``,
        `Nightly respin (policy ${AUTOMATION_POLICY.version}): original rested ${last !== undefined ? `${Math.floor((Date.now() - last) / 86400000)}d` : "never-posted backlog"}. Fresh angle v${version}, top-crop card.` +
          (audit.verdict === "warn"
            ? ` Copy audit: warn (${audit.reasons.join("; ")}).`
            : ""),
      ].join("\n");
      if (!opts.apply) {
        console.log(
          `would-create-respin - ${title_} [${p}]${audit.verdict === "warn" ? " (warn)" : ""}`,
        );
        itemOk = true;
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
        `spillar:${p === "ig" ? "discovery" : "product"}`,
      ]);
      console.log(`created-respin - ${out.trim()} : ${contentId}`);
      recordUse(c.id, {
        issue: Number(out.trim().split("/").pop() ?? "0") || 0,
        creativeId: creative,
        date: new Date().toISOString(),
      });
      created += 1;
      itemOk = true;
    }
    if (itemOk) started += 1;
  }
  console.log(
    `synthetic-pics respins done: started=${started} created=${created}`,
  );
}

async function respinMix(
  issues: IssueRef[],
  ledger: ReturnType<typeof readLedger>,
  opts: { limit: number; cutoff: number; yyyymm: string; apply: boolean },
): Promise<void> {
  const all = await sitemapRecipes();
  const ranked = all
    .map((r) => {
      const refs = refsTo(r.slug, issues);
      const last = refs
        .map((x) => new Date(x.updatedAt).getTime())
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => b - a)[0];
      return { r, refs, last };
    })
    .filter((x) => {
      if (
        issues.some(
          (i) =>
            i.body.includes(x.r.slug) &&
            /status:packet-ready|status:queued|status:in-progress/.test(i.body),
        )
      )
        return false;
      if (x.last !== undefined && x.last > opts.cutoff) return false;
      if (!eligible(ledger, `mix:${x.r.slug}`)) return false;
      return true;
    })
    .sort((a, b) => {
      const ta = a.last ?? new Date(a.r.lastmod).getTime();
      const tb = b.last ?? new Date(b.r.lastmod).getTime();
      return ta - tb;
    });
  console.log(`mixphd respin candidates: ${ranked.length} of ${all.length}`);
  let created = 0;
  let started = 0;
  for (const { r, refs, last } of ranked) {
    if (started >= opts.limit) break;
    let itemOk = false;
    const hero = await heroOk(r.image);
    if (!hero.ok) {
      console.log(`skip ${r.slug}: ${hero.reason}`);
      continue;
    }
    let meta = { title: "", description: "" };
    try {
      meta = await pageMeta(r.url);
    } catch (e) {
      console.log(
        `skip ${r.slug}: ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }
    const slugWords_ = slugWords(r.slug);
    const rawName = meta.title || slugWords_.map((w) => cap(w)).join(" ");
    const name =
      rawName.replace(/\s+(cocktail\s+)?recipe$/i, "").trim() || rawName;
    const version = respinVersion(refs.length);
    const angle = (version - 1) % 3;
    const hook = respinHookMix(angle, name);
    const sents = sentences(meta.description);
    const alt = sents[1] ?? "";
    const first = firstSentence(meta.description);
    const body = inRange(alt, 6, 14)
      ? alt
      : inRange(first, 6, 14)
        ? first
        : `A house-favorite ${slugWords_.slice(0, 2).join(" ") || "pour"} worth a second look.`;
    const descriptors = [
      ...slugWords_,
      ...name
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    ];
    for (const p of ["ig", "fb"] as const) {
      const platform = p === "ig" ? "instagram" : "facebook";
      const base = `mix-${p}-${r.slug}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-");
      const contentId = respinContentId(base, version);
      const concept =
        (slugWords_[0] ?? "mix")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 12) || "MIX";
      const campaign = `MIX_${p === "ig" ? "IG" : "FB"}_TRAFFIC_HOMEBAR_US_${opts.yyyymm}`;
      const creative = `MIX_${concept}_${p === "ig" ? "IG" : "FB"}${respinCreativeVariant(version)}`;
      const url = `${r.url}?utm_source=${platform}&utm_medium=organic_social&utm_campaign=${campaign}&utm_content=${creative}`;
      const audit = await auditSocialCopy({
        hook,
        body,
        cta: "Read the recipe",
        platform: platform as "instagram" | "facebook",
        pillar: p === "ig" ? "discovery" : "how-to",
        hashtags: [],
        destinationUrl: url,
      });
      const { titleMatchesArtwork } =
        await import("@/lib/social-growth/media-registry");
      if (
        !titleMatchesArtwork(hook, descriptors) &&
        !titleMatchesArtwork(body, descriptors)
      ) {
        console.log(
          `skip ${r.slug} [${p}]: hook+body match no slug vocabulary`,
        );
        continue;
      }
      if (audit.verdict === "fail") {
        console.log(
          `skip ${r.slug} [${p}]: audit fail: ${audit.reasons.join(" | ")}`,
        );
        continue;
      }
      const title_ = `[Social] ${contentId} — ${hook.length > 60 ? `${hook.slice(0, 60).trimEnd()}…` : hook}`;
      const rested =
        last !== undefined
          ? `${Math.floor((Date.now() - last) / 86400000)}d`
          : "never-posted backlog";
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
        `**Media:** \`${p === "ig" ? "Single 1080x1350 visual (top crop, fresh framing), native IG photo post" : "Single 1200x630 visual (top crop, fresh framing), photo post"}\``,
        `**Crop:** \`top\``,
        `**Campaign:** \`${campaign}\``,
        `**Creative:** \`${creative}\``,
        `**Priority:** \`p2\``,
        `**Audience:** \`Home bartenders\``,
        `**Source asset:** \`Recipe: ${r.slug}\``,
        `**Hero image:** \`${r.image}\``,
        `**Respin-Of:** \`${base}\``,
        ``,
        `Nightly respin (policy ${AUTOMATION_POLICY.version}): original ${rested}. Fresh angle v${version}, top-crop card. Hero: ${hero.reason}.` +
          (audit.verdict === "warn"
            ? ` Copy audit: warn (${audit.reasons.join("; ")}).`
            : ""),
      ].join("\n");
      if (!opts.apply) {
        console.log(
          `would-create-respin - ${title_} [${p}]${audit.verdict === "warn" ? " (warn)" : ""}`,
        );
        itemOk = true;
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
        `spri:p2`,
        "--label",
        `spillar:${p === "ig" ? "discovery" : "how-to"}`,
      ]);
      console.log(`created-respin - ${out.trim()} : ${contentId}`);
      recordUse(`mix:${r.slug}`, {
        issue: Number(out.trim().split("/").pop() ?? "0") || 0,
        creativeId: creative,
        date: new Date().toISOString(),
      });
      created += 1;
      itemOk = true;
    }
    if (itemOk) started += 1;
  }
  console.log(`mixphd respins done: started=${started} created=${created}`);
}

const isMain = (process.argv[1] ?? "").endsWith("respin-queue.ts");
if (isMain) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
