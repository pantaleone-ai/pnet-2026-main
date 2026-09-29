# Cloudflare Edge-Cache Runbook — pantaleone.net

Two CDN layers sit in front of the origin: **Cloudflare (outer)** → **Vercel edge (inner)**.
Vercel purges its layer on every deploy. Cloudflare does not — this runbook is the staleness contract.

## Normal state (warm-then-check)

| URL | Expect |
|---|---|
| `https://www.pantaleone.net/` | `cf-cache-status: HIT`, `cache-control: public, s-maxage=300, stale-while-revalidate=86400` |
| deep page (e.g. `/blog/<slug>`) | same as `/` |
| `/sitemap.xml`, `/robots.txt`, `/rss.xml` | `HIT`, `s-maxage=31536000` |
| `/api/search?query=x` (repeat same URL) | `DYNAMIC`/`MISS` every time (bypass rule) — never `HIT` |
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

1. `[pnet-2026] bypass dynamic + RSC/prefetch` — `cache: false` for `/api/*`,
   `/_next/data/*`, `/checkout`, `?_rsc=`, `RSC: 1` / `Next-Router-Prefetch: 1`
   headers, Vercel preview cookies. App Router flight data must never cache:
   Cloudflare ignores `Vary: rsc, next-router-state-tree, ...`, so without this
   rule cached HTML is served to flight requests (and vice versa).
2. `[pnet-2026] immutable static assets, 1 month edge` — `/_next/static/*`,
   `/_next/image`, `/images|fonts|favicons|files/*`, override 2592000s.
3. `[pnet-2026] HTML + feeds respect origin` — everything else on the host
   follows origin `Cache-Control` (300s HTML, 1yr static feeds/assets).

Foreign rules you must NOT touch: `R2 public assets CORP` (response-header
transform, `imgsquash.pantaleone.net`), `API abuse guard` (ratelimit),
`pnet-2026 scanner probes` (WAF custom). The applier only writes the cache-settings phase.

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
- **`@vercel/analytics` beacon** stays mounted in `components/Providers.tsx` until someone
  confirms the dashboard is unread. Speed Insights is already removed.
