import { describe, expect, it } from "vitest";

import {
  isFollowableRedirect,
  isRobotsAllowed,
  parseRobotsTxt,
  parseSitemapXml,
  sitemapCandidates,
} from "./crawl";

describe("parseRobotsTxt", () => {
  it("collects wildcard disallows, ignores comments and blanks", () => {
    const rules = parseRobotsTxt(
      "# comment\nUser-agent: *\nDisallow: /admin\nDisallow: /private\n",
    );
    expect(isRobotsAllowed("/admin/panel", rules)).toBe(false);
    expect(isRobotsAllowed("/private", rules)).toBe(false);
    expect(isRobotsAllowed("/blog/post", rules)).toBe(true);
  });

  it("honors agent-specific groups and empty-disallow allow", () => {
    const rules = parseRobotsTxt(
      "User-agent: pantaleonechatbot\nDisallow: /drafts\n\nUser-agent: *\nDisallow: /",
    );
    expect(isRobotsAllowed("/drafts/x", rules)).toBe(false);
    expect(isRobotsAllowed("/public", rules)).toBe(true);
  });

  it("allows everything when no group matches", () => {
    const rules = parseRobotsTxt("User-agent: otherbot\nDisallow: /");
    expect(isRobotsAllowed("/anything", rules)).toBe(true);
  });
});

describe("parseSitemapXml", () => {
  it("parses urlsets and dedupes", () => {
    const { urls, nested } = parseSitemapXml(
      `<?xml version="1.0"?><urlset><url><loc>https://a.com/1</loc></url><url><loc>https://a.com/1</loc></url><url><loc>https://a.com/2</loc></url></urlset>`,
    );
    expect(urls).toEqual(["https://a.com/1", "https://a.com/2"]);
    expect(nested).toEqual([]);
  });

  it("parses sitemap indexes into nested", () => {
    const { urls, nested } = parseSitemapXml(
      `<sitemapindex><sitemap><loc>https://a.com/s1.xml</loc></sitemap><sitemap><loc>https://a.com/s2.xml</loc></sitemap></sitemapindex>`,
    );
    expect(urls).toEqual([]);
    expect(nested).toEqual(["https://a.com/s1.xml", "https://a.com/s2.xml"]);
  });
});

describe("sitemapCandidates", () => {
  it("probes the standard locations at the origin", () => {
    expect(sitemapCandidates(new URL("https://a.com/docs/start"))).toEqual([
      "https://a.com/sitemap.xml",
      "https://a.com/sitemap_index.xml",
    ]);
  });
});

describe("isFollowableRedirect", () => {
  it("allows https upgrades and same-origin moves", () => {
    expect(
      isFollowableRedirect(new URL("http://a.com/"), new URL("https://a.com/")),
    ).toBe(true);
  });

  it("rejects downgrades, credentials, and non-http schemes", () => {
    expect(
      isFollowableRedirect(new URL("https://a.com/"), new URL("http://a.com/")),
    ).toBe(false);
    expect(
      isFollowableRedirect(new URL("https://a.com/"), new URL("https://u:p@a.com/")),
    ).toBe(false);
    expect(
      isFollowableRedirect(new URL("https://a.com/"), new URL("ftp://a.com/")),
    ).toBe(false);
  });
});
