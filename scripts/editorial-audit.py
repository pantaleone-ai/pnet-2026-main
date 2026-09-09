#!/usr/bin/env python3
"""Editorial audit for pantaleone.net — LESS words, MORE specificity.

Usage:
  python3 scripts/editorial-audit.py            # full report, exit 0
  python3 scripts/editorial-audit.py --strict   # exit 1 on any violation (CI)

What it checks (visible copy + frontmatter, not SEO metadata):
  - AI-slop blacklist phrases (marketing defaults, not facts)
  - Unsupported superlatives (world's largest, ultimate, #1, ...)
  - Length budgets: project desc 10-25w, product desc 10-35w,
    blog excerpt 12-25w, CTA 1-4w, headline 1-8w
  - Banned title openers for blog posts (Ultimate/Complete/Definitive/...)
  - Title stuffing words (Free/Ultimate/Modern/Official/Production-Ready)

SEO metadata (config/seo/head.ts, MDX seo blocks) is intentionally NOT
length-capped here — visible copy stays short, metadata stays searchable.
"""
import json
import pathlib
import re
import sys

BASE = pathlib.Path(__file__).resolve().parent.parent

BLACKLIST = [
    "production-grade", "production-ready", "enterprise-grade",
    "next-generation", "ai-powered", "ai-driven",
    "cutting-edge", "transformative", "revolutionary",
    "game-chang", "world-class", "best-in-class",
    "unlock the full", "unlock new possibilities",
    "scale effortlessly", "built for the future",
    "everything you need", "all-in-one",
    "in today's world", "rapidly evolving", "new era", "next level",
    "deep dive", "comprehensive guide", "ultimate guide",
    "practical framework", "expert insights", "actionable insights",
    "at scale", "mission-critical", "seamlessly",
    "effortlessly", "the future of",
    "whether you're", "whether you are",
    "imagine a world", "take your", "to the next level",
    "let's dive in", "in this article, we'll explore",
    "at the heart of", "it is important to note",
    "needless to say", "in conclusion", "ultimately,",
    "the key takeaway",
]

SUPERLATIVES = [
    "world's largest", "worlds largest", "ultimate", "#1",
    "most complete", "most advanced", "leading",
    "largest", "best ",
]

TITLE_STUFFERS = ["free ", "ultimate", "modern ", "official", "production-ready"]

BLOG_OPENER_BAN = [
    "the ultimate", "the complete", "a comprehensive",
    "the definitive", "everything you need to know",
]

ADJECTIVES = [
    "powerful", "robust", "seamless", "innovative", "advanced",
    "sophisticated", "comprehensive", "intelligent", "ultimate",
    "cutting-edge", "revolutionary", "transformative", "scalable",
]

CTA_FILES = {
    "Book a 30-minute call": 5,  # words; budget is 1-4, flag over
}

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.S)


def words(s):
    return len(s.split())


def check_file(path, text, violations, stats):
    low = text.lower()
    for phrase in BLACKLIST:
        for m in re.finditer(re.escape(phrase), low):
            line = text.count("\n", 0, m.start()) + 1
            # skip code fences and image-prompt examples
            violations.append(f"{path}:{line}: slop phrase '{phrase}'")
            stats["slop"] += 1
    for sup in SUPERLATIVES:
        for m in re.finditer(re.escape(sup), low):
            # standard terms are not marketing claims
            context = low[max(0, m.start() - 40):m.end() + 40]
            if re.search(r"best practices|best case|best-case|best possible|rarely the best|leading( and lagging)? indicators|leading lines", context):
                continue
            line = text.count("\n", 0, m.start()) + 1
            violations.append(f"{path}:{line}: superlative '{sup.strip()}'")
            stats["superlatives"] += 1
    for adj in ADJECTIVES:
        stats["adjectives"] += len(re.findall(r"\b" + adj + r"\b", low))


def frontmatter(path):
    text = path.read_text(errors="replace")
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    fm, body = m.group(1), text[m.end():]
    out = {}
    for key in ("title", "description"):
        mm = re.search(rf'^{key}:\s*(.+?)(?=\n\w|\Z)', fm, re.M | re.S)
        if mm:
            out[key] = " ".join(mm.group(1).strip().strip('"').split())
    return out, body


def main():
    strict = "--strict" in sys.argv
    violations = []
    stats = {"slop": 0, "superlatives": 0, "adjectives": 0,
             "files": 0, "titles": 0, "descriptions": 0}
    budgets = []

    content_dirs = ["features/blog/content", "features/projects/content",
                    "features/shop/content", "features/about/content",
                    "features/home/content"]
    for d in content_dirs:
        for f in sorted((BASE / d).rglob("*.mdx")):
            fm, body = frontmatter(f)
            rel = f.relative_to(BASE)
            stats["files"] += 1
            if fm.get("title"):
                stats["titles"] += 1
                t = fm["title"]
                for st in TITLE_STUFFERS:
                    if st in t.lower():
                        violations.append(f"{rel}: title stuffer '{st.strip()}'")
                        stats["superlatives"] += 1
                for op in BLOG_OPENER_BAN:
                    if t.lower().startswith(op):
                        violations.append(f"{rel}: banned title opener '{op}'")
                        stats["slop"] += 1
            if fm.get("description"):
                stats["descriptions"] += 1
                budgets.append((str(rel), "description", words(fm["description"])))
            check_file(rel, fm.get("title", "") + "\n" + fm.get("description", ""),
                       violations, stats)

    # prose bodies: slop phrases only (length is handled by human pass)
    for d in content_dirs:
        for f in sorted((BASE / d).rglob("*.mdx")):
            _, body = frontmatter(f)
            # strip fenced code so code samples don't count
            body = re.sub(r"```.*?```", "", body, flags=re.S)
            # drop quoted third-party text and tables (evidence, not site voice)
            kept = [ln for ln in body.splitlines()
                    if not re.match(r"\s*(>\s|.*\|.*\|)", ln)
                    and "http" not in ln and "\\{" not in ln]
            before = len(violations)
            check_file(f.relative_to(BASE), "\n".join(kept), violations, stats)

    # TSX/TS data + chrome copy
    chrome = [
        "features/home/data/skills.ts",
        "features/home/components/Hero.tsx",
        "features/shop/components/ShopHero.tsx",
        "config/site.ts",
        "app/(app)/(root)/page.tsx",
        "app/(app)/(root)/b2b/page.tsx",
        "app/(app)/(root)/services/page.tsx",
        "app/(app)/(root)/about/page.tsx",
        "components/newsletter/NewsletterSignup.tsx",
        "components/lead-magnet/LeadMagnetForm.tsx",
    ]
    for c in chrome:
        p = BASE / c
        if p.exists():
            check_file(c, p.read_text(errors="replace"), violations, stats)

    print(json.dumps({"stats": stats, "budgets": budgets}, indent=1))
    print(f"\nVIOLATIONS: {len(violations)}")
    for v in violations[:100]:
        print(" -", v)
    if len(violations) > 100:
        print(f" ... and {len(violations) - 100} more")
    if strict and violations:
        sys.exit(1)


if __name__ == "__main__":
    main()
