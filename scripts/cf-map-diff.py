#!/usr/bin/env python3
"""Map a merge diff to Cloudflare edge URLs + cache tags.

Vendored from pantaleone-ai/cloudflare-cache-controller scripts/.

Env:
  DIFF       newline-separated changed file paths (git diff --name-only)
  EXTRA      extra space/comma-separated URL paths to purge (manual runs)
  APP_PREFIX repo path prefix to strip (e.g. "apps/nextjs/"), else ""
  ROUTE_ROOT app-router dir after stripping (e.g. "app" or "src/app")
  HOSTS      space-separated hostnames (e.g. "www.x.com x.com")
  AGG_PATHS  space-separated aggregate URL paths (e.g. "/ /sitemap.xml")
  PFX        cache-tag prefix (e.g. "pnet" -> "pnet-html")
  DATA_TAG   section tag for catalog-data changes (may be empty)
  GITHUB_OUTPUT path to append files_json/count/tags_csv

Cap: 1000 URLs. Never emits purge_everything.
"""
import json
import os
import sys

CONTENT_TOPS = {"data", "content", "contents", "posts", "blog", "articles",
                "mdx", "recipes_mdx"}
# Blog posts live under features/blog/content/<slug>.mdx and render at both
# the HTML page (/blog/<slug>) and the LLM text route (/blog.mdx/<slug>).
# Map them explicitly so content edits purge the affected post URLs instead
# of only the aggregate set.
BLOG_CONTENT_PREFIX = "features/blog/content/"
PAGE_LEAVES = {"page", "route", "layout", "loading", "error", "not-found",
               "template", "default"}
SKIP_TOPS = {"admin"}


def main() -> int:
    prefix = os.environ.get("APP_PREFIX", "")
    rroot = os.environ.get("ROUTE_ROOT", "app")
    hosts = os.environ.get("HOSTS", "").split()
    aggs = os.environ.get("AGG_PATHS", "/ /sitemap.xml").split()
    pfx = os.environ.get("PFX", "site")
    data_tag = os.environ.get("DATA_TAG", "").strip()
    files = [l for l in os.environ.get("DIFF", "").splitlines() if l.strip()]
    extra = [p.strip() for p in os.environ.get("EXTRA", "").replace(",", " ").split()
             if p.strip()]
    if not hosts:
        print("::error::HOSTS env is empty", file=sys.stderr)
        return 1

    urls: set[str] = set()
    code_hit = False
    data_hit = False

    def add(path: str) -> None:
        if not path.startswith("/"):
            path = "/" + path
        for h in hosts:
            urls.add(f"https://{h}{path}")
            if path != "/":
                urls.add(f"https://{h}{path.rstrip('/')}/")

    def add_aggs() -> None:
        for a in aggs:
            add(a)

    for f in files:
        if prefix:
            if not f.startswith(prefix):
                code_hit = True
                add_aggs()
                continue
            g = f[len(prefix):]
        else:
            g = f
        if g.startswith("public/"):
            add(g[len("public/"):])
            continue
        if g.startswith(rroot + "/"):
            rel = g[len(rroot) + 1:]
            parts = [p for p in rel.split("/")
                     if not (p.startswith("(") and p.endswith(")"))]
            if not parts:
                code_hit = True
                add_aggs()
                continue
            leaf, d = parts[-1], "/".join(parts[:-1])
            base = leaf.rsplit(".", 1)[0] if "." in leaf else leaf
            if base in PAGE_LEAVES:
                url = "/" + d if d else "/"
            elif base == "sitemap":
                url = "/sitemap.xml"
            elif base == "robots":
                url = "/robots.txt"
            elif base == "manifest":
                url = "/manifest.webmanifest"
            elif leaf in ("favicon.ico", "icon.png", "icon1.png", "icon2.png",
                          "apple-touch-icon.png"):
                url = ("/" + d + "/" + leaf) if d else ("/" + leaf)
            elif base in ("feed", "rss") or leaf in ("feed.xml", "rss.xml", "feed.json"):
                url = ("/" + d + "/" + leaf) if d else ("/" + leaf)
            elif leaf in ("llms.txt", "llms-full.txt", "agents.txt", "agents.md",
                          "agents.json", "openapi.json"):
                url = ("/" + d + "/" + leaf) if d else ("/" + leaf)
            elif base in ("opengraph-image", "twitter-image"):
                url = ("/" + d + "/" + base) if d else ("/" + base)
            else:
                url = "/" + d if d else "/"
            if "[" in url:  # dynamic segment -> section prefix
                url = url.split("[")[0].rstrip("/") or "/"
            add(url)
            continue
        top = g.split("/")[0]
        if g.startswith(BLOG_CONTENT_PREFIX) and g.endswith(".mdx"):
            slug = g[len(BLOG_CONTENT_PREFIX):-len(".mdx")]
            if slug and "/" not in slug:
                data_hit = True
                add(f"/blog/{slug}")
                add(f"/blog.mdx/{slug}")
                continue
        if top in CONTENT_TOPS:
            data_hit = True
            add_aggs()
            continue
        if g.startswith("api/") or "/api/" in g or top in SKIP_TOPS:
            continue  # not edge-cached page content
        code_hit = True
        add_aggs()

    for p in extra:
        add(p)

    tags = []
    if code_hit:
        tags.append(f"{pfx}-html")
    if data_hit and data_tag:
        tags.append(data_tag)

    out = sorted(urls)[:1000]
    print(f"Mapped {len(files)} changed file(s) -> {len(out)} URL(s), tags={tags or 'none'}")
    out_path = os.environ.get("GITHUB_OUTPUT")
    if not out_path:
        print("::error::GITHUB_OUTPUT is not set", file=sys.stderr)
        return 1
    with open(out_path, "a") as fh:
        fh.write("files_json=" + json.dumps(out, separators=(",", ":")) + "\n")
        fh.write(f"count={len(out)}\n")
        fh.write("tags_csv=" + ",".join(tags) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
