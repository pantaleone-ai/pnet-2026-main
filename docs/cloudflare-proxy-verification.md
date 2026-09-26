# Cloudflare Proxy Test — Verification Report (2026-09-26)

Branch: `chore/cloudflare-proxy-verification`
Zone: `pantaleone.net` (`eea4609e8997339843da337d1f1b5314`, Free plan)
Method: DNS-only → proxied, one hostname at a time, verify after each step.

## DNS changes (via Cloudflare API, no code changes)

| Record | Before | After |
|---|---|---|
| `CNAME www` → `ace2384eee635c10.vercel-dns-016.com` | DNS-only | **proxied** (`b6ac949b…`) |
| `A apex` → `216.150.1.1` | DNS-only | **proxied** (`a2fa0ba3…`) |

Prerequisites already in place: SSL `strict`, `always_use_https on`,
`email_obfuscation off`, `rocket_loader off`, minify off.
Staged edge rulesets stayed **disabled** for the whole test
(cache `55934de2…`, WAF `6f3e4c5d…`) — zero WAF/cache interference.

## Results (external egress, i.e. real-world traffic)

Fetched via independent third-party egress (hackertarget) + `--resolve`
pinned to Cloudflare edge `172.67.130.14`:

- `https://pantaleone.net/` → `308 → https://www.pantaleone.net/`, single
  redirect, no loop, `Server: cloudflare`, valid LE cert (`CN=pantaleone.net`)
- `http://pantaleone.net/` → `301 → https://…` (Always Use HTTPS) ✅
- `https://www.pantaleone.net/` → `200`, full site HTML + CSP intact ✅
- `https://www.pantaleone.net/blog` → `200`, `cf-cache-status: DYNAMIC` ✅
- `/?_rsc=…` → `200`, `DYNAMIC` (RSC soft-nav not stale-shared) ✅
- `/images/logo.png` → `200 image/png`, edge `HIT` on repeat ✅
- `/.env` → `404` (custom WAF still disabled — no false positives possible) ✅

## Known observation (not a regression)

The test workstation's own source IP is currently served Vercel's
`Security Checkpoint` (`x-vercel-mitigated: challenge`, HTTP 403) on
**both** the direct-to-origin path and the Cloudflare path — including
`curl` with a browser UA after a 90s cooldown. `/wp-login.php` was already
`x-vercel-mitigated: deny` direct-to-origin *before* any proxy change.
Cause: the burst of synthetic scanner probes (`/.env`, `/wp-login.php`)
from this IP tripped Vercel Attack Challenge for this source IP only.
External egress sees `200` everywhere, so real-user traffic is unaffected.

## Rollback plan (if ever needed)

```bash
CF_TOKEN=$CLOUDFLARE_API_TOKEN; Z=eea4609e8997339843da337d1f1b5314
for R in b6ac949b1e46884c4532c9c279d7a5ed a2fa0ba3fa4d9c032b718e4a96549eb0; do
  curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/$Z/dns_records/$R" \
    -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
    --data '{"proxied":false}';
done
```

Propagation is near-instant (TTL 1/auto); verify with
`nslookup pantaleone.net 1.1.1.1` (direct IPs) + `curl -I https://www.pantaleone.net/`.

## Follow-ups (not done here — need explicit approval)

1. Enable the staged cache ruleset (`55934de2…`) rule-by-rule, watching
   `cf-cache-status` transition `DYNAMIC → HIT` on HTML.
2. WAF `6f3e4c5d…` stays disabled until Security Events show clean
   log-parity (Free plan has no `log` action — enablement = enforcement).
3. Confirm Vercel Attack Challenge scoping so synthetic monitoring IPs
   are allowlisted rather than challenge-listed.
