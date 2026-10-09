#!/usr/bin/env bash
#
# Purge the Cloudflare edge cache for pantaleone.net.
#
# WHY: Cloudflare holds HTML with the origin's s-maxage (currently 86400s for
# HTML, 1yr for static feeds/assets) but has NO deploy integration — Vercel
# purges its own CDN on deploy, Cloudflare does not. Every production deploy
# MUST be followed by this purge, or visitors keep getting stale HTML.
# Automated via .github/workflows/cf-purge-on-deploy.yml; run manually here
# as backstop: ./scripts/cf-purge-zone.sh
#
# Required env (never commit values):
#   CLOUDFLARE_API_TOKEN   token with Cache Purge permission on the zone
#   CLOUDFLARE_ZONE_ID     (defaults to the pantaleone.net zone)
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-eea4609e8997339843da337d1f1b5314}"
TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"

curl -s --max-time 60 -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything": true}' \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('purge success:', d.get('success'), d.get('errors', [])); sys.exit(0 if d.get('success') else 1)"
