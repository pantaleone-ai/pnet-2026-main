# Vercel Cost Optimization — pantaleone.net (pnet-2026-main)

Source plan: `docs/VERCEL-COST-OPTIMIZER-PLAN.md` (central repo) + gene
`gene-vercel-cost-optimizer` (25 phases). Vercel usage data: **unavailable**
— all projections below are labeled **ESTIMATED** with methodology.

## 1. Architecture (cache hierarchy)

Per content type, Browser → Vercel CDN → ISR/Data Cache → App → DB/API:

| Content | Browser | CDN | ISR/Data | App/DB |
|---|---|---|---|---|
| Static pages (/, /blog, /shop, posts, products, llms.txt) | heuristic (no max-age) | `s-maxage=31536000` + `Vercel-CDN-Cache-Control` | none (force-static, deploy-time) | file/MDX at build only |
| Feeds (rss.xml, /api/feeds/*, /api/products/feed) | heuristic | `s-maxage=604800` | none (force-static) | build only |
| OG image (`/opengraph-image`) | heuristic | default route cache | font `force-cache` | edge render, cached |
| Search (`/api/search`, server action) | n/a (fetch) | `no-store` | none | in-memory scan, capped 20 |
| Transactional (checkout, Stripe, contact/newsletter/lead-magnet POSTs) | n/a | bypass (`force-dynamic`, POSTs uncacheable) | none | per-request |
| `/_next/static/*` | `max-age=31536000, immutable` | fingerprinted | — | — |

Ideal path for >95% of traffic: USER → CDN → HIT → USER. No middleware
exists in this repo, so middleware executions are already zero.

## 2. Route / cache inventory (hotspot map)

| Route | Rendering | Cache | ISR TTL | Origin work | Optimization applied |
|---|---|---|---|---|---|
| `/`, `/about`, `/services`, `/b2b`, `/education`, `/experience`, `/contact`, `/privacy`, `/projects`, `/changelog`, `/blog`, `/shop`, `/shop/[category]`, `/resources/ai-readiness-guide` | `force-static` | CDN 1yr | none | build only | header fix (drop `immutable`, add `Vercel-CDN-Cache-Control`) |
| `/blog/[slug]`, `/shop/[category]/[slug]` | static, `dynamicParams=false` (unknown slugs 404 statically, no on-demand ISR) | CDN 1yr | none | build only | same header fix |
| `/(llms)` routes, `/sitemap.ts` (`revalidate=false`), `/rss.xml`, feed APIs | `force-static` | CDN 1yr / 7d | none | build only | none needed (optimal) |
| `/opengraph-image` | edge, now explicit `force-static` | route cache | font `force-cache` | 1 self-fetch, cached | font fetch cached |
| `/checkout` page | explicit `force-dynamic` (was implicit via searchParams) | excluded from static header | — | lookup + redirect | explicit dynamic (anti-poisoning) |
| `/api/checkout/session` | explicit `force-dynamic` | n/a (redirect) | — | Stripe API | explicit dynamic |
| `/api/search` | explicit `force-dynamic` + `no-store` | `no-store` | — | capped in-memory scan | dynamic + no-store + caps |
| POST-only APIs (contact, newsletter, lead-magnet, stripe, indexnow) | dynamic (POSTs never CDN-cached) | — | — | Resend/Stripe | untouched (zero cache impact; some files in-flight) |
| Images | `unoptimized: true` — zero Image Optimization | CDN static | — | none | none needed (optimal) |

## 3. Changes implemented (this branch)

1. **`next.config.mjs`** — removed `immutable` from the static-HTML
   `Cache-Control` (`immutable` is only valid for fingerprinted assets;
   on HTML it risks serves that never revalidate) and added an explicit
   `Vercel-CDN-Cache-Control` so CDN intent is distinct from browser
   policy. Durations unchanged (1yr/1yr — safe: content ships by redeploy
   and Vercel purges CDN on deploy).
2. **`app/opengraph-image.tsx`** — `{ cache: "force-cache" }` on the
   self-fetch of `/fonts/inter-bold.woff2`, so the font transfers once
   into the Data Cache instead of on every OG regeneration. (Explicit
   `force-static` was tried and reverted: incompatible with edge runtime —
   build warns and edge disables static generation.)
3. **`app/checkout/page.tsx`** — explicit `dynamic = "force-dynamic"`:
   personalized cart URLs must never be statically cached (cross-shopper
   leakage).
4. **`app/api/checkout/session/route.ts`** — explicit
   `dynamic = "force-dynamic"` (transactional Stripe redirect).
5. **`app/api/search/route.ts`** — explicit `dynamic = "force-dynamic"`,
   `Cache-Control: no-store` on all responses (query-dependent JSON must
   not be CDN-shared), query trimmed to 100 chars, minimum 2 chars
   (matches the UI's `>= 2` enable threshold).
6. **`lib/search-server.ts`** — `getPostsBySearchQuery` caps results at
   `SEARCH_MAX_RESULTS = 20`, rejects <2-char queries, truncates to 100
   chars. Bounds worst-case function CPU + JSON origin transfer
   (previously a 1-char query could dump the full catalog).

Deliberately deferred: POST-route `dynamic`/`no-store` hygiene (POSTs are
never CDN-cached → zero cost impact; files partly in-flight in working
tree), search DTO field-trimming (would change the shared `SearchResult`
type — needs UI contract review), browser `max-age` tuning (behavior
change, needs product decision).

## 4. Validation

- `npm run build` — must show: static routes stay `○ Static`,
  `/checkout` + `/api/*` dynamic, no middleware line, no `useSearchParams`
  prerender errors.
- `npm run lint` on changed files.
- `npx tsc --noEmit`.
- Manual: auth-free site — verify no personalized content on cached pages;
  checkout redirect with `?products=` still reaches Stripe; search returns
  ≤20 results; OG image renders; sitemap/robots/RSS unchanged.

## 5. Estimated impact (ESTIMATED — no dashboard data)

| Metric | Before | After | Expected reduction (methodology) |
|---|---|---|---|
| ISR Reads / Writes | ~0 (no `revalidate` TTLs; only `revalidate=false`/static) | 0 | none — already optimal |
| Fast Origin Transfer | unbounded search JSON; font re-fetch per OG regen | search ≤20 results, ≤100-char queries; font cached | search payload bounded (~catalog-size → 20 items worst case); OG regen transfer −1 HTTP fetch |
| Fast Data Transfer | same as origin + `immutable` HTML risk | same, minus poisoning/staleness risk | risk reduction, not bytes |
| Function invocations | 1–2 char queries executed full scans | <2 chars short-circuit to `[]` | junk-query invocations do ~zero work |
| Middleware executions | 0 (no middleware file) | 0 | already optimal |
| Image Optimization | 0 (`unoptimized: true`) | 0 | already optimal |

## 6. Remaining opportunities

- Browser `max-age` policy for HTML (currently heuristic; product call).
- If Vercel dashboard numbers become available, re-ground this model and
  prioritize by measured ISR/origin/data spend.
- Fleet: promote the `Vercel-CDN-Cache-Control` + `force-dynamic` +
  `no-store` transactional pattern to shared templates.

## 7. Aggressive pass — `feat/vercel-origin-isr-aggressive` (no breaking changes)

Goal: drive Fast Origin Transfer and ISR reads/writes as close to zero as
possible without changing any user-facing behavior.

1. **`next.config.mjs`**
   - `optimizePackageImports` extended: `@tanstack/react-query`, `nuqs`,
     `motion`, `recharts`, `embla-*`, `cmdk`, `sonner`, `vaul`,
     `country-flag-icons`, `react-tweet` (smaller `/_next/static` JS =>
     less origin transfer on MISS/first fill).
   - New explicit CDN header blocks (all with `Vercel-CDN-Cache-Control` +
     `stale-if-error=86400`): `/(fonts|images|favicons|files)` (1yr
     immutable), `/(llms.txt|llms-full.txt|shop.md|projects.md)` +
     `/blog.mdx/*` (1yr), `/(sitemap.xml|robots.txt)` +
     `/products/sitemap.xml` (1yr — previously fell through to the short
     default route TTL), `/(rss.xml)` + `/api/(feeds|products)/*` (1yr),
     `/opengraph-image` (1yr).
2. **LLM-text routes** (`llms.txt`, `llms-full.txt`, `shop.md`,
   `projects.md`, `blog.mdx/[slug]`): explicit 1yr `Cache-Control` +
   `Vercel-CDN-Cache-Control` in-route (previously relied on the short
   default). `llms-full.txt` is the largest single origin payload.
3. **Feeds** (`rss.xml`, `/api/feeds/products`, `/api/feeds/etsy`,
   `/api/products/feed`): 7d -> 1yr CDN TTL. Safe: force-static, rebuilt
   on redeploy, Vercel purges CDN on deploy. Stops weekly crawler waves
   re-pulling identical bytes from origin.
4. **`app/opengraph-image.tsx`**: kept `edge` runtime (a `nodejs` +
   `force-static` build-time render was tried and reverted — the WOFF2
   font's `wOF2` signature is rejected by the nodejs prerender font
   parser, failing the build). Cost control comes from the pre-existing
   `force-cache` font fetch plus the new explicit 1yr `/opengraph-image`
   CDN headers in `next.config.mjs`, so social-crawler waves hit the CDN
   instead of re-executing origin.
5. **`/api/search`**: lean DTO (only `type/slug/title/description/content`
   capped at 200 chars/`category?/score` — the only fields any consumer
   renders) instead of full blog/product objects; `200` responses get
   `s-maxage=60, stale-while-revalidate=300` (CDN keys on full URL incl.
   query, so no cross-query poisoning; absorbs burst/bot waves); errors/
   429 stay `no-store`; explicit 405 + `no-store` for non-GET.
6. **`SearchButton`**: React Query `staleTime: 60s, gcTime: 5min` dedupes
   repeat server-action invocations (reopen menu, retype) client-side.
7. **Transactional POST routes** (`contact`, `newsletter`, `lead-magnet`,
   `indexnow/submit`, `stripe/*`): explicit `force-dynamic` + `nodejs` +
   `no-store` on every response, `Content-Length` body caps (413), explicit
   405 + `no-store` for wrong methods. `contact` cap 20KB (zod already
   bounds legit bodies ~6KB); `newsletter`/`lead-magnet`/`sync-product`
   8KB; `indexnow/submit` 512KB (10k-URL cap).
8. **`/api/checkout/session`**: `no-store` on all redirects/JSON +
   10/min/IP rate limit short-circuiting before the Stripe API call
   (legit shoppers never hit it; bot loops can't mint sessions).
9. **`/api/indexnow/submit` GET** (static usage doc): 1hr shared cache.
   **`/api/indexnow/[key]`**: added `Vercel-CDN-Cache-Control`.

Deliberately unchanged: HTML browser TTL (heuristic, product call),
server-action search return shape (UI contract untouched — only the
unconsumed `/api/search` HTTP payload was trimmed), Stripe webhook logic
(headers/exports only), POST-route auth (out of scope).

Validation: `npm run build` (static routes stay `○ Static`, `/checkout` +
dynamic APIs stay `ƒ Dynamic`, OG prerenders at build), `npm run lint`
on touched files, `npx tsc --noEmit`.

## 8. Verification pass — zero-ISR audit (2026-09-23)

Full-repo grep audit confirmed the zero-ISR posture (no `revalidate: N`,
no `unstable_cache`, no `revalidatePath/Tag`, no `cookies()/headers()` in
static paths, no `middleware.ts`). Production build output:

- `○ Static`: `/`, `/about`, `/services`, `/b2b`, `/education`,
  `/experience`, `/contact`, `/privacy`, `/projects`, `/changelog`,
  `/blog`, `/shop`, `/resources/ai-readiness-guide`, `/llms.txt`,
  `/llms-full.txt`, `/shop.md`, `/projects.md`, `/rss.xml`,
  `/sitemap.xml`, `/products/sitemap.xml`, `/robots.txt`,
  `/api/feeds/*`, `/api/products/feed`
- `● SSG`: `/blog/[slug]` (30 paths), `/shop/[category]` (2),
  `/shop/[category]/[slug]` (13), `/blog.mdx/[slug]` (30)
- `ƒ Dynamic`: `/checkout`, `/opengraph-image` (edge, CDN-pinned),
  all transactional `/api/*`
- No middleware line, no ISR, no prerender errors.

Fixes applied (all measured, production-safe):

1. **`app/layout.tsx`** — removed duplicate theme boot script (inline
   `<script>` + identical base64 `data:` `<Script beforeInteractive>`).
   One inline script remains; saves ~1KB + 1 request on every page load
   (FDT). `Script` import retained (GA/Meta Pixel still use it).
2. **`app/(app)/(root)/blog/[slug]/page.tsx`**,
   **`shop/[category]/[slug]/page.tsx`** — added explicit
   `dynamic = "force-static"` alongside existing
   `dynamicParams = false` (was implicit-static; now provable).
3. **`next.config.mjs`** — HTML catch-all now excludes
   `opengraph-image|llms.txt|llms-full.txt|shop.md|projects.md|blog.mdx|rss.xml`,
   which have their own 1yr CDN blocks. Previously both header groups
   matched those routes (duplicate/contradictory `Cache-Control`).
4. **`app/api/indexnow/[key]/route.ts`** — added
   `force-dynamic` + `nodejs` + `no-store` on 403/500 paths (key-gated
   verification must never be CDN-shared); fixed `import type`.
5. **Deleted `public/rss-feed.xml`** — stale 2KB duplicate of `/rss.xml`,
   unreferenced anywhere (deploy bytes + duplicate-content SEO risk).

Deliberately unchanged: `images.unoptimized` (correct — static assets are
CDN-served; enabling optimization would add origin compute), large
`pantaleonenet/*.png` sources (binary recompression belongs with the
in-flight R2/AVIF work, not this branch), HTML browser TTL (product
call), `json()` helper routes (already `no-store`).
