#!/usr/bin/env bash
#
# DRAFT (never auto-applies): Cloudflare Cache Response Rule to keep error
# responses out of the edge cache — the true-404 artifact.
#
# Problem: unknown-slug 404s render `not-found.tsx` with the 24h HTML block
# (`headers()` in next.config.mjs cannot condition on status, middleware runs
# pre-routing so it cannot see the 404). Both CDN layers pin the 404 body.
# The 410 Gone prefixes are already no-store at origin; this rule covers the
# residual 4xx/5xx at the Cloudflare layer via the `http_response_cache_settings`
# phase (Cache Response Rules evaluate the ORIGIN RESPONSE, unlike
# scripts/cf-cache-rules.sh which is request-phase only).
#
# This script is DRY-RUN ONLY by design: it prints the exact payload +
# manual apply steps and never touches the API. A blind PUT here would
# replace the whole response-phase ruleset (same atomic-replace semantics
# as the request phase), so a human must review foreign rules first.
#
# References (verified 2026-10 against developers.cloudflare.com):
# - Phase: `http_response_cache_settings`; action `set_cache_control` with
#   `"no-store": {"operation": "set"}` makes an eligible asset non-cacheable.
# - Expression field `http.response.code` (e.g. `http.response.code eq 200`).
# - Available on Free (10 rules). Response rules take precedence on conflict.
#
# Residual risk AFTER applying: the Vercel (inner) layer still caches 404s
# for 24h via `Vercel-CDN-Cache-Control` — this rule only fixes Cloudflare.
# Keep the "purge the slug on publish/rename" mitigation regardless.
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-eea4609e8997339843da337d1f1b5314}"

# Explicit status set (`in {...}`) instead of a range comparison — `in` with
# an integer set is documented rules-language; avoids depending on `ge`.
EXPR='(http.host contains "pantaleone.net" and http.response.code in {400 401 403 404 405 410 429 500 502 503})'

PAYLOAD="$(python3 -c "
import json
print(json.dumps({'rules': [
  {
    'description': '[pnet-2026] error responses are never cached (true-404 artifact)',
    'expression': '''${EXPR}''',
    'action': 'set_cache_control',
    'action_parameters': {
      'no-store': {'operation': 'set'},
    },
    'enabled': True,
  },
]}))")"

echo "--- DRY RUN ONLY: payload that a human would PUT (never auto-applied) ---"
echo "${PAYLOAD}" | python3 -m json.tool
echo "${PAYLOAD}" | python3 -c "
import json, sys
r = json.load(sys.stdin)['rules'][0]
assert r['description'].startswith('[pnet-2026]'), 'owned prefix required'
assert r['action'] == 'set_cache_control', 'response-phase action'
assert r['action_parameters'] == {'no-store': {'operation': 'set'}}
print('draft ok: 1 owned rule, no-store on error statuses, no network touched')
"
cat <<EOF

Manual apply (human only):
  1. Dashboard: Caching > Cache Rules > (response rules tab) > Create rule,
     name "[pnet-2026] error responses are never cached", expression:
       ${EXPR}
     Then: Cache-Control > set "no-store". Save, then Trace a 404 URL.
  2. Or API (after listing the phase ruleset and preserving foreign rules):
     curl "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_response_cache_settings/entrypoint" \\
       -X PUT -H "Authorization: Bearer \$CLOUDFLARE_API_TOKEN" \\
       -H "Content-Type: application/json" --data '<payload above merged with existing owned rules>'
  3. Verify: curl a bad slug twice -> 2nd request cf-cache-status BYPASS/DYNAMIC,
     never HIT. Vercel layer will STILL show x-vercel-cache HIT (residual).
EOF
