# Cloudflare Edge-Cache Runbook — pantaleone.net

Two CDN layers sit in front of the origin: **Cloudflare (outer)** → **Vercel edge (inner)**.
Vercel purges its layer on every deploy. Cloudflare does not — this runbook is the staleness contract.

## Normal state (warm-then-check)

| URL | Expect |
|---|---|
| `https://www.pantaleone.net/` | `cf-cache-status: HIT`, `cache-control: public, s-maxage=86400, stale-while-revalidate=86400` |
| deep page (e.g. `/blog/<slug>`) | same as `/` |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml` | `HIT`, `s-maxage=31536000` |
| `/api/search?query=x` (repeat same URL) | `HIT`, `s-maxage=60` (carved out of bypass 2026-10; CDN keys on full URL incl. `?query=`) — errors/429s stay `no-store` |
| same page twice, 2nd with `RSC: 1` header | 2nd is `DYNAMIC`/`MISS` with `content-type: text/x-component` — never cached `text/html` |

Quick matrix: first request may be `MISS` (fills), immediate repeat must be `HIT` (or still-bypass for dynamic).

## After every production deploy

1. Confirm the deploy is `Ready` in Vercel.
2. `.github/workflows/cf-purge-on-deploy.yml` purges automatically on the
   `deployment_status: success (Production)` event. Verify the workflow ran green.
3. If the workflow is missing/red: `CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... ./scripts/cf-purge-zone.sh`
4. Re-run the matrix above. Homepage `age` must be small and headers must match the fresh deploy.

## Rules inventory (Cloudflare zone, `http_request_cache_settings` phase)

All owned rules are prefixed `[pnet-2026]` and applied idempotently by `scripts/cf-cache-rules.sh`
(which aborts on any foreign rule in the phase — read-modify-write, never blind PUT):

1. `[pnet-2026] bypass dynamic + RSC/prefetch` — `cache: false` for `/api/*`
   (except `GET /api/search`, carved out 2026-10 for 60s per-URL HITs),
   `/_next/data/*`, `/checkout`, `?_rsc=`, `RSC: 1` / `Next-Router-Prefetch: 1`
   headers, Vercel preview cookies. App Router flight data must never cache:
   Cloudflare ignores `Vary: rsc, next-router-state-tree, ...`, so without this
   rule cached HTML is served to flight requests (and vice versa).
2. `[pnet-2026] immutable static assets, 1 month edge` — `/_next/static/*`,
   `/_next/image`, `/images|fonts|favicons|files/*`, override 2592000s.
3. `[pnet-2026] HTML + feeds respect origin` — everything else on the host
   follows origin `Cache-Control` (24h HTML, 1yr static feeds/assets).

Foreign rules you must NOT touch: `R2 public assets CORP` (response-header
transform, `imgsquash.pantaleone.net`), `API abuse guard` (ratelimit, 20
req/10s/IP on `/api/*`). Owned but separate: `[pnet-2026] Block vulnerability
scanner probes` (WAF custom, applied by `scripts/cf-waf-rules.sh` — blocks
`.env`, `.git`, `/wp-` (+ `/wp-admin`, `/wp-content`), `*.php` via
`ends_with`/`*.php/*`, `phpmyadmin`, `cgi-bin`, `actuator`, excluding
`/images|/fonts|/files/`; all probe-only on this PHP-less/WordPress-less
site). The applier scripts only write their own phase. NOTE: phase ruleset
NAMEs are API-immutable, so the legacy `(TEST-disabled)` suffix on ruleset
names cannot be removed — the rules inside are correctly tagged and enabled;
do not let the name confuse you.

## Cost notes (2026-10 pass)

- HTML `s-maxage` 1200 → 86400 (`next.config.mjs`): `cf-purge-on-deploy.yml`
  purges by tag/file on every merge, so 20min only re-drove origin MISS
  traffic. 24h keeps HITs between deploys; Vercel-CDN stays 1yr.
- `middleware.ts` matcher excludes `_next/static`, `_next/image`,
  `favicon.ico`, `robots.txt`, `sitemap.*`, `rss.xml`, `opengraph-image`,
  `fonts`, `images`, `favicons`, `files` — edge fn never bills Fluid CPU for
  static bytes. Dynamic HTML, `/api/*`, `/checkout`, legacy 301s, 410s still run.
- `lib/search-server.ts`: exact-first; Levenshtein ≤2 only on zero exact hits
  and only title/slug tokens; `getContextAroundMatch` exact-only.
  `app/api/search` adds `maxDuration=5`. Revert: restore fuzzy loops.
- `app/opengraph-image.tsx`: file-URL font fetch from `public/fonts` instead
  of HTTP self-fetch — zero origin transfer per OG render (still edge, 1yr CDN).
- Rollback: revert `s-maxage` to 1200 + re-purge (files + `pnet-html` tag).

## Gotchas (probe-verified 2026-09-29)

- `http.cookie` is NOT a valid field in the cache-settings phase (`unknown identifier`);
  match preview cookies via `http.request.headers["cookie"][0] contains "..."`.
- `contains` is an INFIX operator (`X contains Y`), not a function; `starts_with()` IS a function.
- Ruleset PUT is atomic: a `400` on an invalid expression changes nothing — safe to probe.
- `*.vercel.app` deployment URLs sit behind Vercel SSO (`302` + `no-store` from the
  AUTH LAYER). Never validate cache headers there — use production `www`.
- Purge BEFORE validating after any rule/header change, or you measure stale state.

## Accepted gaps (documented, not forgotten)

- **Sitemap `lastModified`**: blog entries are content-derived; shop/hub pages carry a
  deploy stamp (`LAST_MODIFIED` in `app/sitemap.ts`, `app/products/sitemap.ts`).
  Shop MDX frontmatter has no updated-date field — making it content-derived needs a
  data-model change (out of scope). At ~1–3 content-driven deploys/day the recrawl cost
  is accepted; revisit if deploy cadence rises.
- **`/_next/image`**: `next/image` is used widely but `unoptimized: true` renders plain
  `<img>` — the optimizer path serves no traffic. Left at 1-month edge TTL (harmless);
  NOT firewall-blocked (blocking a framework path is a break-the-app risk for zero measured abuse).
- **`@vercel/analytics` beacon** removed 2026-09-29 (pass 2): it fired ungated for
  100% of visitors while GA/Meta/PostHog are consent-gated. Speed Insights was
  already removed. GA4, Meta Pixel, and PostHog are untouched.
