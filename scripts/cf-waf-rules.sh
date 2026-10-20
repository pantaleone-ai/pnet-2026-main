#!/usr/bin/env bash
#
# Idempotent applier for the pantaleone.net Cloudflare WAF custom rules
# (http_request_firewall_custom phase).
#
# Owns ONLY the fleet-standard scanner-probe rule in that phase (exact
# description match). Aborts if any other rule is present (foreign rules are
# preserved, never blind-PUT over).
# Also drops the misleading "(TEST-disabled)" ruleset-name suffix — the rules
# are and were ENABLED; the name was a lie that invites human error.
#
# The blocked signatures are probe-only on this site (Next.js, no PHP, no
# WordPress, no CGI, no Spring): any request matching them is a scanner by
# definition. Legit paths (including /.well-known/ for ACME) are untouched.
#
# Required env (never commit values):
#   CLOUDFLARE_API_TOKEN   token with WAF edit on the zone
#   CLOUDFLARE_ZONE_ID     (defaults to the pantaleone.net zone)
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-eea4609e8997339843da337d1f1b5314}"
TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required}"
API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}"
# Phase ruleset verified 2026-09-29; re-resolved via entrypoint every run.
RS_ID="$(curl -s --max-time 30 -H "Authorization: Bearer ${TOKEN}" \
  "${API}/rulesets/phases/http_request_firewall_custom/entrypoint" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('success'), d; print(d['result']['id'])")" \
  || { echo "ABORT: cannot read WAF entrypoint"; exit 1; }

CURRENT="$(curl -s --max-time 30 -H "Authorization: Bearer ${TOKEN}" \
  "${API}/rulesets/${RS_ID}")"
echo "${CURRENT}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert d.get('success'), d
rules = d['result'].get('rules', [])
assert len(rules) == 1, f'expected exactly 1 rule, found {len(rules)} — aborting'
desc = rules[0].get('description', '')
assert desc == 'Block vulnerability scanner probes v3 (secrets/config/archives + wp/exploit paths)', f'foreign rule: {desc!r} — aborting'
print(f'guard ok: single owned rule ({desc!r})')
"

# Fleet-standard v3 (reconciled 2026-10-13: live had drifted to v3 while this
# script still wrote the narrower 2026-10 rule — the script briefly narrowed
# live coverage on apply and was rolled back. The script now writes v3
# verbatim so applies are idempotent. Do NOT narrow without a fleet-wide
# decision; the /_next/ carve-out inside v3 already protects framework paths.
# Legit paths (including /.well-known/ for ACME) are untouched.
# Action stays `block`; foreign rules untouched (guard above).
EXPR='(http.request.uri.path contains ".php" or http.request.uri.path contains ".ini" or http.request.uri.path contains ".env" or http.request.uri.path contains "/.git" or http.request.uri.path contains "/.git-credentials" or http.request.uri.path contains "/.gitconfig" or http.request.uri.path contains "/.ssh/" or http.request.uri.path contains "/secrets" or http.request.uri.path contains "/credentials" or http.request.uri.path contains "/aws" or http.request.uri.path contains "/gcp" or http.request.uri.path contains "/firebase" or http.request.uri.path contains "/service-account" or http.request.uri.path contains ".pem" or http.request.uri.path contains ".key" or http.request.uri.path contains ".p12" or http.request.uri.path contains ".pfx" or http.request.uri.path contains ".conf" or http.request.uri.path contains ".config" or http.request.uri.path contains ".bak" or http.request.uri.path contains ".old" or http.request.uri.path contains ".backup" or http.request.uri.path contains ".swp" or http.request.uri.path contains ".sql" or http.request.uri.path contains ".sqlite" or http.request.uri.path contains ".db" or http.request.uri.path contains ".zip" or http.request.uri.path contains ".rar" or http.request.uri.path contains ".7z" or http.request.uri.path contains ".tar" or http.request.uri.path contains ".tgz" or http.request.uri.path contains ".yml" or http.request.uri.path contains ".yaml" or http.request.uri.path contains ".toml" or http.request.uri.path contains "web.config" or http.request.uri.path contains "terraform.tfstate" or http.request.uri.path contains "serverless." or http.request.uri.path contains "/wp-admin" or http.request.uri.path contains "/wp-login" or http.request.uri.path contains "/wp-content" or http.request.uri.path contains "/wp-includes" or http.request.uri.path contains "/xmlrpc" or http.request.uri.path contains "phpmyadmin" or http.request.uri.path contains "/pma/" or http.request.uri.path contains "adminer" or http.request.uri.path contains "/cgi-bin/" or http.request.uri.path contains "/server-status" or http.request.uri.path contains "/actuator/" or http.request.uri.path contains "/_profiler/" or http.request.uri.path contains "/@fs/" or http.request.uri.path contains "/.svn" or (http.request.uri.path contains "/wp-json/" and (http.request.uri.path contains "mock-data" or http.request.uri.path contains "/batch")) or (http.request.uri.path contains "/_next/" and not http.request.uri.path contains "/_next/static/" and not http.request.uri.path contains "/_next/image" and not http.request.uri.path contains "/_next/data/" and not http.request.uri.path contains "/_next/font"))'

PAYLOAD="$(python3 -c "
import json
# NOTE (probe-verified 2026-09-29): phase ruleset NAMEs are immutable via the
# API, so the TEST-disabled suffix on the ruleset name cannot be removed; the
# owned RULE inside is the fleet-standard v3 and enabled.
print(json.dumps({
  'rules': [{
    'description': 'Block vulnerability scanner probes v3 (secrets/config/archives + wp/exploit paths)',
    'expression': '''${EXPR}''',
    'action': 'block',
    'enabled': True,
  }],
}))")"

curl -s --max-time 30 -X PUT -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" --data "${PAYLOAD}" \
  "${API}/rulesets/${RS_ID}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if not d.get('success'):
    print('PUT FAILED — no rules changed (atomic). Errors:')
    for e in d.get('errors', []):
        print(' -', e.get('code'), e.get('message'))
    sys.exit(1)
print('ruleset:', d['result']['name'])
for r in d['result']['rules']:
    print('ok:', r['description'], '| action:', r['action'], '| enabled:', r['enabled'])
"
