/**
 * Pure crawl helpers (P3). Sitemap discovery, robots.txt parsing, and
 * redirect policy live here so vitest covers them; the ingest worker
 * performs the actual fetching with per-hop SSRF revalidation.
 */

export interface RobotsRules {
  disallowed: string[];
}

/**
 * Minimal robots.txt parser with correct group precedence: the most
 * specific matching group wins (exact agent name beats `*`); `*` is only
 * the fallback when no exact group exists. Empty Disallow = allow.
 * No network here.
 */
export function parseRobotsTxt(body: string, agent = "pantaleonechatbot"): RobotsRules {
  const groups: { agents: string[]; disallows: string[] }[] = [];
  let current: { agents: string[]; disallows: string[] } | null = null;
  // Consecutive user-agent lines extend the same group until a rule appears.
  let sawRule = false;
  for (const rawLine of body.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (current && !sawRule) {
        current.agents.push(value.toLowerCase());
      } else {
        current = { agents: [value.toLowerCase()], disallows: [] };
        groups.push(current);
        sawRule = false;
      }
    } else if (field === "disallow" && current) {
      sawRule = true;
      if (value) current.disallows.push(value);
    }
  }
  const me = agent.toLowerCase();
  const exact = groups.find((g) => g.agents.includes(me));
  const winner = exact ?? groups.find((g) => g.agents.includes("*"));
  if (!winner) return { disallowed: [] };
  return { disallowed: [...winner.disallows] };
}

export function isRobotsAllowed(pathname: string, rules: RobotsRules): boolean {
  return !rules.disallowed.some((d) => d && pathname.startsWith(d));
}

export interface ParsedSitemap {
  /** Page URLs from a urlset. */
  urls: string[];
  /** Nested sitemap URLs from a sitemapindex. */
  nested: string[];
}

/** Regex sitemap parser (Workers-safe, no DOMParser needed). */
export function parseSitemapXml(xml: string): ParsedSitemap {
  const urls: string[] = [];
  const nested: string[] = [];
  const isIndex = /<\s*sitemapindex[\s>]/i.test(xml);
  const locRe = /<\s*loc\s*>\s*([^<]+?)\s*<\s*\/\s*loc\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) !== null) {
    const loc = (m[1] ?? "").trim();
    if (!loc) continue;
    if (isIndex) {
      if (!nested.includes(loc)) nested.push(loc);
    } else {
      if (!urls.includes(loc)) urls.push(loc);
    }
  }
  return { urls, nested };
}

/** Candidate sitemap locations for a website entry point, in try order. */
export function sitemapCandidates(entry: URL): string[] {
  return [
    new URL("/sitemap.xml", entry.origin).href,
    new URL("/sitemap_index.xml", entry.origin).href,
  ];
}

export const MAX_REDIRECT_HOPS = 5;

/**
 * Redirect policy for one hop: same scheme upgrade http->https is fine,
 * but the worker re-validates every target with SSRF checks before
 * following — this helper only decides whether the hop is worth
 * validating (same-origin preferred, off-origin allowed for www/root
 * consolidation, never downgrade to http, never non-http(s)).
 */
export function isFollowableRedirect(from: URL, to: URL): boolean {
  if (to.protocol !== "http:" && to.protocol !== "https:") return false;
  if (from.protocol === "https:" && to.protocol === "http:") return false;
  if (to.username || to.password) return false;
  return true;
}
