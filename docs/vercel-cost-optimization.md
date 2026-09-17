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

- Search DTO trim (drop unused product fields from `/api/search` payloads;
  requires `SearchResult` type + UI audit).
- Browser `max-age` policy for HTML (currently heuristic; product call).
- If Vercel dashboard numbers become available, re-ground this model and
  prioritize by measured ISR/origin/data spend.
- Fleet: promote the `Vercel-CDN-Cache-Control` + `force-dynamic` +
  `no-store` transactional pattern to shared templates.
