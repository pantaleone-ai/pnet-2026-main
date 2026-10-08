#!/usr/bin/env python3
"""Pantaleone language gate — report-only editorial consistency checker.

Not an AI detector. Flags stylistic patterns that make correct writing
feel synthetic, overproduced, or formulaic. Warnings are actionable;
no auto-rewrite. Skips code fences, blockquotes, tables, frontmatter.

Usage:
  python3 scripts/language-gate.py            # report, exit 0
  python3 scripts/language-gate.py --strict   # exit 1 if warnings exceed budget
"""
import json
import pathlib
import re
import sys

BASE = pathlib.Path(__file__).resolve().parent.parent
VOICE_DIR = BASE / "config" / "voice" / "anti-patterns.json"

with open(VOICE_DIR) as f:
    PATTERNS = json.load(f)

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---", re.S)


def strip_protected(body: str) -> str:
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    kept = []
    for ln in body.splitlines():
        if re.match(r"\s*(>\s|.*\|.*\|)", ln):
            continue
        if "http" in ln or "\\{" in ln:
            continue
        kept.append(ln)
    return "\n".join(kept)


def analyze(path_str: str, text: str) -> list:
    warns = []
    low = text.lower()
    lines = text.splitlines()

    for cat in ("marketing_hype", "generic_openers", "filler_transitions",
                "contrast_cliches", "rhetorical_closers"):
        for phrase in PATTERNS.get(cat, []):
            c = low.count(phrase.lower())
            if c > 0:
                warns.append(f"{path_str}: [{cat}] '{phrase}' x{c}")

    # Repeated sentence openings (first 3 words)
    opens: dict = {}
    for ln in lines:
        for s in re.split(r"[.!?]\s+", ln.strip()):
            words = s.split()[:3]
            if len(words) == 3 and len(s) > 20:
                key = " ".join(words).lower()
                opens[key] = opens.get(key, 0) + 1
    for k, c in opens.items():
        if c >= 4:
            warns.append(f"{path_str}: [repetition] opening '{k}...' x{c}")

    # Contrast-structure density: "X is not Y. It is Z" family
    contrast = len(re.findall(
        r"(is not|isn't|aren't|don't|stop \w+).{0,60}(it is|it['’]s|they are|do \w+)",
        low))
    if contrast >= 3:
        warns.append(f"{path_str}: [contrast] {contrast} not-X-but-Y structures")

    # Slogan fragments: many very short paragraphs
    short_paras = sum(1 for ln in lines if 0 < len(ln.split()) <= 6)
    if short_paras >= 8:
        warns.append(f"{path_str}: [fragments] {short_paras} very short lines")

    # Em-dash / colon / semicolon density
    for char, label in (("—", "em-dash"), (":", "colon"), (";", "semicolon")):
        c = text.count(char)
        words = max(1, len(text.split()))
        if c / words > 0.015:
            warns.append(f"{path_str}: [{label}] {c} uses in {words} words")

    # Adjective / abstraction density
    hype_hits = sum(low.count(p.lower()) for p in PATTERNS.get("marketing_hype", []))
    words = max(1, len(text.split()))
    if hype_hits / words > 0.01:
        warns.append(f"{path_str}: [hype-density] {hype_hits} hype terms in {words} words")

    return warns


def main():
    strict = "--strict" in sys.argv
    all_warns = []
    files = sorted((BASE / "features/blog/content").rglob("*.mdx"))
    for f in files:
        raw = f.read_text(errors="replace")
        m = FRONTMATTER_RE.match(raw)
        body = raw[m.end():] if m else raw
        prose = strip_protected(body)
        all_warns.extend(analyze(str(f.relative_to(BASE)), prose))

    print(f"LANGUAGE GATE: {len(all_warns)} warnings across {len(files)} posts")
    for w in all_warns[:80]:
        print(" -", w)
    if len(all_warns) > 80:
        print(f" ... and {len(all_warns) - 80} more")
    # Report-only by default; strict budget is generous to avoid homogenization
    if strict and len(all_warns) > 120:
        sys.exit(1)


if __name__ == "__main__":
    main()
