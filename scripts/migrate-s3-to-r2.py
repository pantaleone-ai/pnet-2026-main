#!/usr/bin/env python3
"""
One-time migration: rewrite AWS S3 image URLs to Cloudflare R2.

Maps https://pantaleone-net.s3.us-west-1.amazonaws.com/<key>
  -> https://img.pantaleone.net/<key>  (same directory structure)

Kept committed for auditability. Safe to re-run (idempotent: S3 host
strings are gone after the first pass, so subsequent runs are no-ops).

Usage:
    python3 scripts/migrate-s3-to-r2.py [--check]
    --check exits non-zero if any legacy S3 URLs remain.
"""

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIRS = ["features", "app", "components", "lib", "config", "public"]
EXTENSIONS = {".mdx", ".md", ".ts", ".tsx", ".mjs", ".js", ".json"}

S3_HOST = "https://pantaleone-net.s3.us-west-1.amazonaws.com/"
R2_BASE = "https://img.pantaleone.net/"
PATTERN = re.compile(re.escape(S3_HOST))

# Any other S3 host variants that must never silently survive.
STRICT_PATTERN = re.compile(r"https://[A-Za-z0-9._-]*s3[._][^\"' )]*amazonaws\.com/")


def migrate(check_only=False):
    changed_files = []
    total_replacements = 0
    for target in TARGET_DIRS:
        root = PROJECT_ROOT / target
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix not in EXTENSIONS:
                continue
            text = path.read_text(encoding="utf-8", errors="strict")
            new_text, count = PATTERN.subn(R2_BASE, text)
            if count:
                total_replacements += count
                changed_files.append((str(path.relative_to(PROJECT_ROOT)), count))
                if not check_only:
                    path.write_text(new_text, encoding="utf-8")

    print(f"Files changed: {len(changed_files)}")
    for rel, count in changed_files:
        print(f"  {rel} ({count})")
    print(f"Total replacements: {total_replacements}")

    leftovers = []
    for target in TARGET_DIRS:
        root = PROJECT_ROOT / target
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix not in EXTENSIONS:
                continue
            hits = STRICT_PATTERN.findall(
                path.read_text(encoding="utf-8", errors="ignore")
            )
            if hits:
                leftovers.append((str(path.relative_to(PROJECT_ROOT)), set(hits)))

    if leftovers:
        print("REMAINING S3 URLS:")
        for rel, hits in leftovers:
            for h in sorted(hits):
                print(f"  {rel}: {h}")
        return 1
    print("No S3 URLs remain in content.")
    return 0


if __name__ == "__main__":
    sys.exit(migrate(check_only="--check" in sys.argv))
