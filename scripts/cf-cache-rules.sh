#!/usr/bin/env bash
#
# Idempotent applier for the pantaleone.net Cloudflare Cache Rules.
#
# Owns ONLY rules tagged "[pnet-2026]" in the http_request_cache_settings
# phase. Any foreign (untagged, unknown) rule aborts the run — foreign
# rules are preserved via read-modify-write, never blind PUT... except the
# two legacy rules created 2026-09-29 ("HTML pages - respect origin,
# bypass _rsc/api", "Static assets - 1 month edge"), which are replaced by
# their [pnet-2026] successors below (same intent + RSC-header bypass fix).
#
# Required env (never commit values — export locally or use a secret manager):
#   CLOUDFLARE_API_TOKEN   token with Cache Rules edit on the zone
#   CLOUDFLARE_ZONE_ID     (defaults to the pantaleone.net zone)
#
# Usage:
#   ./scripts/cf-cache-rules.sh          # apply
#   DRY_RUN=1 ./scripts/cf-cache-rules.sh # validate expressions only
#                                         # (PUT is atomic: a 400 changes nothing)
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-eea4609e8997339843da337d1f1b5314}"
# DRY_RUN=1 validates the payload offline without secrets or network (used in
# CI / local checks). Live applies still require the token (phase read +
# foreign-rule guard + atomic PUT).
if [ "${DRY_RUN:-0}" != "1" ]; then
  TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
else
  TOKEN="${CLOUDFLARE_API_TOKEN:-dry-run-no-token}"
fi
API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}"

if [ "${DRY_RUN:-0}" != "1" ]; then
PHASE_RS="$(curl -s --max-time 30 -H "Authorization: Bearer ${TOKEN}" \
  "${API}/rulesets/phases/http_request_cache_settings/entrypoint")"
echo "${PHASE_RS}" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('success'), d; print('phase ruleset:', d['result']['id'])" \
  || { echo "ABORT: cannot read cache-settings entrypoint"; exit 1; }
RS_ID="$(echo "${PHASE_RS}" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['id'])")"

# Guard: refuse to overwrite rules we do not own.
echo "${PHASE_RS}" | python3 -c "
import json, sys
rules = json.load(sys.stdin)['result'].get('rules', [])
known_legacy = {
  'HTML pages - respect origin, bypass _rsc/api',
  'Static assets - 1 month edge',
}
for r in rules:
    desc = r.get('description', '')
    if desc.startswith('[pnet-2026]') or desc in known_legacy:
        continue
    print(f\"ABORT: foreign rule present: {desc!r} — preserve it manually first\")
    sys.exit(1)
print(f'guard ok: {len(rules)} existing rule(s) are ours')
"
fi # end live-only phase read + foreign-rule guard (dry-run skips network)

# NOTE: http.cookie is NOT a valid field in the cache-settings phase, and
# contains is an INFIX operator (not a function) — both probe-verified
# 2026-09-29 via atomic PUT rejections (no rules changed on 400).
#
# DECISION 2026-10 (cost): carve GET /api/search out of the bypass.
# Old state (Vercel 60s + Cloudflare cache:false) = origin on every search.
# CDN keys on the full URL incl. ?query=, so per-query 60s HITs are safe
# (no cross-query poisoning); errors/429s stay no-store at origin and are
# respected via respect_origin. POST/PUT/etc. still bypass (405 no-store).
# HTML rule below is respect_origin, so carved GETs inherit the origin 60s
# TTL with zero new rules. Revert: delete the trailing `and not (...)`.
BYPASS_EXPR='(http.host contains "pantaleone.net" and (http.request.headers["rsc"][0] == "1" or http.request.headers["next-router-prefetch"][0] == "1" or http.request.uri.query contains "_rsc=" or starts_with(http.request.uri.path, "/api/") or starts_with(http.request.uri.path, "/_next/data/") or starts_with(http.request.uri.path, "/checkout") or http.request.headers["cookie"][0] contains "__prerender_bypass" or http.request.headers["cookie"][0] contains "__next_preview_data") and not (starts_with(http.request.uri.path, "/api/search") and http.request.method == "GET"))'
HTML_EXPR='(http.host contains "pantaleone.net")'
STATIC_EXPR='(http.host contains "pantaleone.net" and (starts_with(http.request.uri.path, "/_next/static/") or starts_with(http.request.uri.path, "/_next/image") or starts_with(http.request.uri.path, "/images/") or starts_with(http.request.uri.path, "/fonts/") or starts_with(http.request.uri.path, "/favicons/") or starts_with(http.request.uri.path, "/files/")))'

# RULE ORDER IS LOAD-BEARING (probe-verified 2026-09-29): in this phase the
# LAST matching set_cache_settings rule wins — a host-wide eligible rule
# placed after the bypass silently re-enables caching. Eligible rules go
# first, the bypass goes LAST.
PAYLOAD="$(python3 -c "
import json
print(json.dumps({'rules': [
  {
    'description': '[pnet-2026] immutable static assets, 1 month edge',
    'expression': '''${STATIC_EXPR}''',
    'action': 'set_cache_settings',
    'action_parameters': {
      'cache': True,
      'edge_ttl': {'mode': 'override_origin', 'default': 2592000},
      'browser_ttl': {'mode': 'respect_origin'},
    },
    'enabled': True,
  },
  {
    'description': '[pnet-2026] HTML + feeds respect origin (24h HTML, 1yr static feeds)',
    'expression': '''${HTML_EXPR}''',
    'action': 'set_cache_settings',
    'action_parameters': {
      'cache': True,
      'edge_ttl': {'mode': 'respect_origin'},
      'browser_ttl': {'mode': 'respect_origin'},
    },
    'enabled': True,
  },
  {
    'description': '[pnet-2026] bypass dynamic + RSC/prefetch (App Router flight data must never cache)',
    'expression': '''${BYPASS_EXPR}''',
    'action': 'set_cache_settings',
    'action_parameters': {'cache': False},
    'enabled': True,
  },
]}))")"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "--- DRY RUN: payload that would be PUT ---"
  echo "${PAYLOAD}" | python3 -m json.tool | head -60
  echo "${PAYLOAD}" | python3 -c "
import json, sys
p = json.load(sys.stdin)
rules = p['rules']
assert all(r['description'].startswith('[pnet-2026]') for r in rules), 'all rules must carry the owned prefix'
assert rules[-1]['description'].startswith('[pnet-2026] bypass'), 'bypass rule must be LAST (last-match-wins)'
assert rules[-1]['action_parameters'] == {'cache': False}, 'bypass must set cache:false'
print(f'dry-run ok: {len(rules)} owned rule(s), bypass last, no network touched')
"
  exit 0
fi

RESP="$(curl -s --max-time 30 -X PUT -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" --data "${PAYLOAD}" \
  "${API}/rulesets/${RS_ID}")"
echo "${RESP}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if not d.get('success'):
    print('PUT FAILED — no rules changed (atomic). Errors:')
    for e in d.get('errors', []):
        print(' -', e.get('code'), e.get('message'))
    sys.exit(1)
for r in d['result']['rules']:
    print('ok:', r['description'], '| enabled:', r['enabled'])
"
