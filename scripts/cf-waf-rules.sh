#!/usr/bin/env bash
#
# Idempotent applier for the pantaleone.net Cloudflare WAF custom rules
# (http_request_firewall_custom phase).
#
# Owns ONLY the rule tagged "[pnet-2026]" in that phase. Aborts if any other
# rule is present (foreign rules are preserved, never blind-PUT over).
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
assert desc.startswith('[pnet-2026]') or 'scanner probe' in desc.lower(), f'foreign rule: {desc!r} — aborting'
print(f'guard ok: single owned rule ({desc!r})')
"

EXPR='(http.request.uri.path contains "/.env" or http.request.uri.path contains "/.git" or http.request.uri.path contains "wp-" or http.request.uri.path contains ".php" or http.request.uri.path contains "phpmyadmin" or http.request.uri.path contains "cgi-bin" or http.request.uri.path contains "actuator")'

PAYLOAD="$(python3 -c "
import json
# NOTE (probe-verified 2026-09-29): phase ruleset NAMEs are immutable via the
# API, so the TEST-disabled suffix on the ruleset name cannot be removed; the
# owned RULE inside is correctly tagged [pnet-2026] and enabled.
print(json.dumps({
  'rules': [{
    'description': '[pnet-2026] Block vulnerability scanner probes',
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
