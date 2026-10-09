#!/usr/bin/env bash
#
# Regression assertions for origin cache headers (pantaleone.net).
#
# Verifies the next.config.mjs HTML 24h/1yr split, the flight no-store
# backstop (3x `has:` blocks), the 410 no-store, and the /api/search 60s
# carve-out — without depending on CDN HIT/MISS state, so it runs unchanged
# against local `next start` and production.
#
# Usage:
#   ./scripts/check-cache-headers.sh                       # local :3000
#   BASE=https://www.pantaleone.net ./scripts/check-cache-headers.sh
#
# NOTE: this asserts ORIGIN headers only. Cloudflare behavior (HIT/DYNAMIC,
# OG edge-TTL override) is covered by docs/cf-edge-cache-runbook.md's matrix.
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
FAIL=0

# Vercel consumes `Vercel-CDN-Cache-Control` at its edge (it never reaches
# clients through the CDN), so that header is only assertable origin-direct
# (local `next start`). Public `Cache-Control` passes through everywhere.
case "${BASE}" in
  *localhost*|*127.0.0.1*) ASSERT_VCC=1 ;;
  *) ASSERT_VCC=0; echo "note: ${BASE} is behind the CDN; Vercel-CDN-Cache-Control assertions skipped (edge-consumed)" ;;
esac

hval() { # $1 = header file, $2 = header name (case-insensitive) -> value
  grep -i "^$2:" "$1" | head -1 | tr -d '\r' | cut -d: -f2- | sed 's/^ *//;s/ *$//'
}

check() { # $1 = label, $2 = expected, $3 = actual
  if [ "$2" = "$3" ]; then
    echo "ok: $1"
  else
    echo "FAIL: $1 -- expected [$2], got [$3]"
    FAIL=1
  fi
}

vcc_check() { # $1 = label, $2 = expected, $3 = actual (skipped behind CDN)
  if [ "${ASSERT_VCC}" = "1" ]; then check "$1" "$2" "$3";
  else echo "SKIP (CDN): $1"; fi
}

TMP="$(mktemp -d)"; trap 'rm -rf "${TMP}"' EXIT
HDR="${TMP}/h.txt"

# 1. Plain navigation keeps the 24h/1yr split (flight blocks must not leak).
curl -s -D "${HDR}" -o /dev/null "${BASE}/"
check "GET / cache-control" \
  "public, s-maxage=86400, stale-while-revalidate=86400" "$(hval "${HDR}" cache-control)"
vcc_check "GET / vercel-cdn-cache-control" \
  "public, s-maxage=31536000, stale-while-revalidate=31536000" "$(hval "${HDR}" vercel-cdn-cache-control)"

# 2. Flight request: no-store on both layers + Vary + flight content type.
curl -s -D "${HDR}" -o /dev/null -H "RSC: 1" "${BASE}/"
check "RSC:1 cache-control" "no-store" "$(hval "${HDR}" cache-control)"
vcc_check "RSC:1 vercel-cdn-cache-control" "no-store" "$(hval "${HDR}" vercel-cdn-cache-control)"
check "RSC:1 content-type" "text/x-component" "$(hval "${HDR}" content-type)"
if hval "${HDR}" vary | grep -qi rsc; then echo "ok: RSC:1 vary contains rsc"; else
  echo "FAIL: RSC:1 vary missing rsc -- got [$(hval "${HDR}" vary)]"; FAIL=1; fi

# 3. Prefetch request: no-store.
curl -s -D "${HDR}" -o /dev/null -H "Next-Router-Prefetch: 1" "${BASE}/blog"
check "prefetch cache-control" "no-store" "$(hval "${HDR}" cache-control)"
vcc_check "prefetch vercel-cdn-cache-control" "no-store" "$(hval "${HDR}" vercel-cdn-cache-control)"

# 4. ?_rsc= query: no-store.
curl -s -D "${HDR}" -o /dev/null "${BASE}/?slug&_rsc=1abc2"
check "_rsc cache-control" "no-store" "$(hval "${HDR}" cache-control)"
vcc_check "_rsc vercel-cdn-cache-control" "no-store" "$(hval "${HDR}" vercel-cdn-cache-control)"

# 5. 410 Gone prefix: 410 + no-store on both CDN headers.
CODE="$(curl -s -D "${HDR}" -o /dev/null -w "%{http_code}" "${BASE}/p/some-dead-post")"
check "410 status" "410" "${CODE}"
check "410 cache-control" "no-store" "$(hval "${HDR}" cache-control)"
vcc_check "410 vercel-cdn-cache-control" "no-store" "$(hval "${HDR}" vercel-cdn-cache-control)"

# 6. Search carve-out intact (api/* excluded from both the HTML block and
# the flight blocks; route sets its own 60s TTL).
curl -s -D "${HDR}" -o /dev/null "${BASE}/api/search?query=test"
check "search cache-control" \
  "public, s-maxage=60, stale-while-revalidate=300" "$(hval "${HDR}" cache-control)"

# 7. OG informational: the file-route ignores the next.config 1yr block, so
# origin MUST still emit max-age=0 — the Cloudflare OG pin rule (not this
# repo) is what caches it. If this ever flips to 1yr, the CF override
# becomes redundant but harmless; update the runbook.
# Best-effort: local `next start` cannot render the wOFF2 font (@vercel/og
# rejects it outside the Vercel edge runtime), so a local failure SKIPS.
OG_CODE="$(curl -s -D "${HDR}" -o /dev/null -w "%{http_code}" --max-time 30 "${BASE}/opengraph-image" || true)"
if [ "${OG_CODE}" = "200" ]; then
  check "og origin cache-control (expect max-age=0; CF pin is authoritative)" \
    "public, max-age=0, must-revalidate" "$(hval "${HDR}" cache-control)"
else
  echo "SKIP: og render unavailable here (http ${OG_CODE:-000}); assert in prod"
fi

if [ "${FAIL}" = "0" ]; then echo "ALL HEADER CHECKS PASSED"; else
  echo "HEADER CHECKS FAILED"; exit 1; fi
