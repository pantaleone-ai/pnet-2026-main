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
   rule cached HTML is served to flight requests (and vice versa). Origin
   backstop: `middleware.ts` stamps `Cache-Control: no-store` (+ `Vary: RSC`)
   on flight responses — the Vercel layer was observed caching
   `text/x-component` with the 24h HTML TTL (2026-10), so the CF rule alone
   is not sufficient.
2. `[pnet-2026] immutable static assets, 1 month edge` — `/_next/static/*`,
   `/_next/image`, `/images|fonts|favicons|files/*`, override 2592000s.
3. `[pnet-2026] HTML + feeds respect origin` — everything else on the host
   follows origin `Cache-Control` (24h HTML, 1yr static feeds/assets).
4. `[pnet-2026] OG image pin, 1 month edge` — `/opengraph-image*`, override
   2592000s. Placed AFTER the HTML rule and BEFORE the bypass (last match
   wins). REQUIRED, not optional: the `opengraph-image.tsx` file-route
   convention ignores the `next.config.mjs` 1yr header block (live origin
   still emits `public, max-age=0, must-revalidate` — probe-verified 2026-10),
   so without this rule every OG fetch revalidates at origin. Deploy purges
   it by exact file (`/opengraph-image` in AGG_PATHS); the route also carries
   the `pnet-feeds` Cache-Tag so tag purges clear it too.

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
  of HTTP self-fetch — zero origin transfer per OG render. Edge TTL is the CF
  `[pnet-2026] OG image pin` (1 month override; the next.config 1yr block is
  ignored by the file-route convention).
- 404/410 + flight origin hardening (2026-10): `middleware.ts` emits `no-store`
  (+ `Vercel-CDN-Cache-Control: no-store`) on 410 Gone bodies and on all
  flight (`RSC: 1` / prefetch / `?_rsc=`) responses. Before: 404 HTML inherited
  the 24h block and stuck at both layers (`x-vercel-cache: HIT`, age growing);
  flight payloads stuck at the Vercel layer while CF correctly bypassed.
- Rollback: revert `s-maxage` to 1200 + re-purge (files + `pnet-html` tag).

## Purge policy (decided 2026-10 — eager indexes, tagged feeds)

- **Blog-index policy: purge eagerly.** A post edit purges the post URLs
  (`/blog/<slug>`, `/blog.mdx/<slug>`) PLUS `/blog`, `/`, `/sitemap.xml`,
  `/rss.xml` by file (see `scripts/cf-map-diff.py`). The 24h-staleness
  alternative was rejected: indexes are deploy-time static at Vercel (fresh
  immediately) while Cloudflare would hold pre-deploy copies for 24h.
- **Feed APIs (`/api/feeds/*`, `/api/products/*`) purge by TAG, not files.**
  Cloudflare single-file purges reject wildcards, so the aggregate path list
  intentionally contains only exact URLs. Freshness comes from the `pnet-feeds`
  tag purge, which `cf-map-diff.py` now emits on every shared-code change
  (those rebuild all force-static feeds at deploy). Feed route-file edits map
  to their exact page URLs via the `app/` branch as before.
- `DRY_RUN=1 ./scripts/cf-cache-rules.sh` validates the payload shape, but the
  script still requires `CLOUDFLARE_API_TOKEN` (phase read + guard run first) —
  run it with a read-only token for validation, or inspect the JSON block.

## Gotchas (probe-verified 2026-09-29)

- `http.cookie` is NOT a valid field in the cache-settings phase (`unknown identifier`);
  match preview cookies via `http.request.headers["cookie"][0] contains "..."`.
- `contains` is an INFIX operator (`X contains Y`), not a function; `starts_with()` IS a function.
- Ruleset PUT is atomic: a `400` on an invalid expression changes nothing — safe to probe.
- `*.vercel.app` deployment URLs sit behind Vercel SSO (`302` + `no-store` from the
  AUTH LAYER). Never validate cache headers there — use production `www`.
- Purge BEFORE validating after any rule/header change, or you measure stale state.

## Accepted gaps (documented, not forgotten)

- **True-404 (`not-found.tsx`) HTML at the Vercel layer**: `middleware.ts`
  runs pre-routing so it cannot see the 404 status, and `headers()` in
  `next.config.mjs` cannot condition on status either — unknown-slug 404s
  still inherit the 24h HTML block at origin. The 410 Gone prefixes (known
  dead content) are `no-store` at origin. Full fix needs a response-phase rule
  (bypass cache on status >= 400) managed separately from
  `scripts/cf-cache-rules.sh` (request phase only) — owner: edge-cache, next
  pass. Mitigation: 404s are low-traffic; CF `HIT` on a 404 still saves
  origin FOT (it just risks pinning a 404 for 24h if a page is added at that
  slug — purge the slug on publish).
- **Apex `308` uncached (`cf-cache-status: EXPIRED`)**: the apex→www redirect
  re-hits origin per request. Cheap (headers-only, no HTML) and low-traffic;
  caching redirects at CF needs a dedicated rule — accepted, revisit if apex
  traffic rises.

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
