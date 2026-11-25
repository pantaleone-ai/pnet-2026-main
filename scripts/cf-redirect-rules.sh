#!/usr/bin/env bash
#
# Idempotent applier for the pantaleone.net Cloudflare Single Redirects.
#
# Owns ONLY rules tagged "[pnet-2026]" in the http_request_dynamic_redirect
# phase. Any foreign (untagged, unknown) rule aborts the run — foreign
# rules are preserved via read-modify-write, never blind PUT... except the
# initial create: the phase entrypoint does not exist yet (verified
# 2026-10-28), so the first apply POSTs a new zone ruleset.
#
# Why this exists: legacy `/blog/post/*` URLs (old photo-blog prefix) must
# 301 to `/blog/*` at the EDGE, and retired `/nft-art/*` URLs must 301 to
# https://www.synthetic.pics (permanent cross-domain move, GA-tagged).
# middleware.ts already does this, but every cache MISS re-hits origin
# (Vercel Fluid CPU) and 504s with the origin when Vercel is sick (observed
# 2026-10: ~1.8k MISS 504s on the veo3 slug wave). An edge Single Redirect
# serves the 301 with zero origin traffic. middleware.ts stays as backstop
# (localhost, preview, CF bypass).
#
# Required env (never commit values — export locally or use a secret manager):
#   CLOUDFLARE_API_TOKEN   token with Single Redirect edit on the zone
#   CLOUDFLARE_ZONE_ID     (defaults to the pantaleone.net zone)
#
# Usage:
#   ./scripts/cf-redirect-rules.sh          # apply
#   DRY_RUN=1 ./scripts/cf-redirect-rules.sh # validate expressions only
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-eea4609e8997339843da337d1f1b5314}"
if [ "${DRY_RUN:-0}" != "1" ]; then
  TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
else
  TOKEN="${CLOUDFLARE_API_TOKEN:-dry-run-no-token}"
fi
API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}"

# Exact apex+www match (fleet standard — never `contains`, which would also
# match img/imgsquash.pantaleone.net + lookalikes).
# Two rules: bare `/blog/post` (static target) + `/blog/post/*` (dynamic
# suffix preservation). Query strings preserved via preserve_query_string
# (owner-confirmed 2026-10-28).
# NOTE: regex_replace() requires Business/WAF-Advanced — substring() works
# on all plans, so the prefix rule uses substring off the known 11-char
# "/blog/post/" prefix instead.
#
# NFT-ART 2026-11-25: permanent cross-domain move `/nft-art/*` ->
# https://www.synthetic.pics (owner-confirmed). SEO: 301 (not 302/308) so
# link equity transfers and Google drops the old URLs. Single static target
# (root, not path-preserving — synthetic.pics has no matching slugs, so
# preserving would 404). GA filter: utm_source=pantaleone.net &
# utm_medium=redirect & utm_campaign=nft-art-legacy.
# CF GOTCHA (probe-verified 2026-11-25 + docs): preserve_query_string=true
# DISCARDS the target URL's own query — even when the request has no query.
# So this rule MUST use preserve=false with the UTM baked into the static
# target. Legacy `?add-to-cart=2614` is intentionally dropped (Woo noise).
BLOG_POST_BARE_EXPR='(http.host in {"www.pantaleone.net" "pantaleone.net"} and http.request.uri.path eq "/blog/post")'
BLOG_POST_PREFIX_EXPR='(http.host in {"www.pantaleone.net" "pantaleone.net"} and starts_with(http.request.uri.path, "/blog/post/"))'
NFT_ART_EXPR='(http.host in {"www.pantaleone.net" "pantaleone.net"} and (http.request.uri.path eq "/nft-art" or http.request.uri.path eq "/nft-art/" or starts_with(http.request.uri.path, "/nft-art/")))'
NFT_ART_TARGET='https://www.synthetic.pics/?utm_source=pantaleone.net&utm_medium=redirect&utm_campaign=nft-art-legacy'

# "/blog/post/" is 11 chars (indices 0-10); remainder starts at 11.
BLOG_POST_PREFIX_TARGET='concat("https://www.pantaleone.net/blog/", substring(http.request.uri.path, 11))'

PAYLOAD_FILE="$(mktemp)"; trap 'rm -f "${PAYLOAD_FILE}"' EXIT
export BLOG_POST_BARE_EXPR BLOG_POST_PREFIX_EXPR BLOG_POST_PREFIX_TARGET NFT_ART_EXPR NFT_ART_TARGET
python3 -c "
import json, os
print(json.dumps({'rules': [
  {
    'ref': 'pnet2026_blog_post_bare',
    'description': '[pnet-2026] blog/post bare -> /blog (edge 301, query preserved)',
    'expression': os.environ['BLOG_POST_BARE_EXPR'],
    'action': 'redirect',
    'action_parameters': {
      'from_value': {
        'target_url': {'value': 'https://www.pantaleone.net/blog'},
        'status_code': 301,
        'preserve_query_string': True,
      },
    },
    'enabled': True,
  },
  {
    'ref': 'pnet2026_blog_post_prefix',
    'description': '[pnet-2026] blog/post/* prefix -> /blog/* (edge 301, query preserved)',
    'expression': os.environ['BLOG_POST_PREFIX_EXPR'],
    'action': 'redirect',
    'action_parameters': {
      'from_value': {
        'target_url': {'expression': os.environ['BLOG_POST_PREFIX_TARGET']},
        'status_code': 301,
        'preserve_query_string': True,
      },
    },
    'enabled': True,
  },
  {
    'ref': 'pnet2026_nft_art_to_synthetic',
    'description': '[pnet-2026] nft-art/* -> synthetic.pics (edge 301, GA tagged, legacy query dropped)',
    'expression': os.environ['NFT_ART_EXPR'],
    'action': 'redirect',
    'action_parameters': {
      'from_value': {
        'target_url': {'value': os.environ['NFT_ART_TARGET']},
        'status_code': 301,
        'preserve_query_string': False,
      },
    },
    'enabled': True,
  },
]}))" > "${PAYLOAD_FILE}"
PAYLOAD="$(cat "${PAYLOAD_FILE}")"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "--- DRY RUN: payload that would be POST/PUT ---"
  echo "${PAYLOAD}" | python3 -m json.tool
  echo "${PAYLOAD}" | python3 -c "
import json, sys
p = json.load(sys.stdin)
rules = p['rules']
assert all(r['description'].startswith('[pnet-2026]') for r in rules), 'all rules must carry the owned prefix'
assert len(rules) == 3, f'expected 3 owned rules, payload has {len(rules)}'
assert all(r['action'] == 'redirect' for r in rules), 'single-redirect action'
assert all(r['action_parameters']['from_value']['status_code'] == 301 for r in rules), 'permanent redirect to match middleware'
blog = [r for r in rules if 'blog/post' in r['description']]
assert all(r['action_parameters']['from_value']['preserve_query_string'] is True for r in blog), 'blog rules must preserve query'
nft = [r for r in rules if 'nft-art' in r['description']]
assert len(nft) == 1, 'nft-art rule missing'
assert nft[0]['action_parameters']['from_value']['preserve_query_string'] is False, 'nft-art must use preserve=false so CF keeps the UTM (CF discards target query when preserve=true)'
assert 'utm_campaign=nft-art-legacy' in nft[0]['action_parameters']['from_value']['target_url']['value'], 'GA campaign tag missing'
assert 'synthetic.pics' in nft[0]['action_parameters']['from_value']['target_url']['value'], 'target must be synthetic.pics'
print('dry-run ok: 3 owned rules, edge 301, blog query preserved, nft-art GA-tagged (preserve=false), no network touched')
"
  exit 0
fi

# Live: resolve entrypoint. Missing entrypoint (code 10003 / success:false)
# means first apply -> POST create. Existing -> merge owned + preserve
# foreign, then PUT update (PUT replaces the whole ruleset, so foreign
# rules like [migration] / [fix-404] must be re-sent or they are deleted).
ENTRYPOINT_RS="$(curl -s --max-time 30 -H "Authorization: Bearer ${TOKEN}" \
  "${API}/rulesets/phases/http_request_dynamic_redirect/entrypoint" || true)"
if echo "${ENTRYPOINT_RS}" | python3 -c "import json,sys; sys.exit(0 if json.load(sys.stdin).get('success') else 1)"; then
  RS_ID="$(echo "${ENTRYPOINT_RS}" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['id'])")"
  echo "${ENTRYPOINT_RS}" | python3 -c "
import json, sys
rules = json.load(sys.stdin)['result'].get('rules', [])
owned = [r for r in rules if r.get('description','').startswith('[pnet-2026]')]
foreign = [r for r in rules if not r.get('description','').startswith('[pnet-2026]')]
print(f'merge plan: {len(owned)} owned will be replaced, {len(foreign)} foreign preserved')
for r in foreign:
    print(f\"  preserve foreign: {r.get('description')!r}\")
"
  # Build merged payload: our 3 owned rules + existing foreign rules verbatim
  # (stripped to writable fields). Atomic PUT — 400 changes nothing.
  MERGED_FILE="$(mktemp)"; trap 'rm -f "${PAYLOAD_FILE}" "${MERGED_FILE}"' EXIT
  echo "${ENTRYPOINT_RS}" | python3 -c "
import json, sys
with open('${PAYLOAD_FILE}') as f:
    owned = json.load(f)['rules']
entry = json.load(sys.stdin)['result']
foreign = []
for r in entry.get('rules', []):
    if r.get('description','').startswith('[pnet-2026]'):
        continue
    # Re-send foreign rules with only writable keys (drop id/version/etc.
    # except ref which the API accepts for stable identity).
    keep = {k: r[k] for k in ('ref','description','expression','action','action_parameters','enabled') if k in r}
    if 'ref' not in keep and r.get('ref'):
        keep['ref'] = r['ref']
    foreign.append(keep)
print(json.dumps({'rules': owned + foreign}))
" > "${MERGED_FILE}"
  echo "--- MERGED payload (owned + foreign preserved) ---"
  python3 -m json.tool "${MERGED_FILE}" | head -120
  RESP="$(curl -s --max-time 30 -X PUT -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" --data @"${MERGED_FILE}" \
    "${API}/rulesets/${RS_ID}")"
else
  echo "no entrypoint ruleset — creating via POST"
  FULL_PAYLOAD="$(python3 -c "
import json
with open('${PAYLOAD_FILE}') as f:
    owned = json.load(f)['rules']
print(json.dumps({
  'name': 'Redirect rules ruleset',
  'kind': 'zone',
  'phase': 'http_request_dynamic_redirect',
  'rules': owned,
}))
")"
  RESP="$(curl -s --max-time 30 -X POST -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" --data "${FULL_PAYLOAD}" \
    "${API}/rulesets")"
fi

echo "${RESP}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if not d.get('success'):
    print('WRITE FAILED — no rules changed (atomic). Errors:')
    for e in d.get('errors', []):
        print(' -', e.get('code'), e.get('message'))
    sys.exit(1)
for r in d['result']['rules']:
    print('ok:', r['description'], '| action:', r['action'], '| enabled:', r['enabled'])
"
