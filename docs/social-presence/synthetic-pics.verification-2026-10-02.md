# synthetic.pics — Meta Page creation verification (2026-10-02)

No secrets in this file. Token referenced as `EAA...[withheld, session-only]`.

## Attempts (both blocked by Meta policy, zero side effects)

1. Draft/unpublished: `POST /v26.0/122100817833493795/accounts`
   (`name=Synthetic Pics - Test Draft`, `category_enum=ART_GALLERY`,
   `is_published=false`) →
   `{"error":{"message":"(#100) Can only call this method on valid test users
for your app","type":"OAuthException","code":100}}`
2. Published (draft not required): `POST /v26.0/122100817833493795/accounts`
   (`name=Synthetic Pics`, same category/about/website, no `is_published`) →
   identical `(#100)` error.

Per Meta `user/accounts` docs (v26.0): creation allowed only as a test user or
allowlisted app. Our token is a valid SYSTEM_USER (`app_id 1813881459926833`,
`master-orchestrator`, scopes include `pages_manage_metadata`,
`pages_show_list`, `pages_manage_posts`) but is neither, so prod creation is
correctly refused. Test-user listing also refused (`(#15)` needs app access
token with app secret, which was never provided or stored).

## State verified unchanged

- `GET /me` → `pantaleone-main (122100817833493795)`.
- `GET /me/accounts` → still exactly 1 page: `101092449202509`
  (`Pantaleone.net - Custom Artwork, NFT's & Web3 Tech`, `Software Company`).
- `GET /101092449202509` → username `pantaleoneAI`, stale website list.
- Zero POSTs to `/feed|/photos|/videos`. Nothing published. No writes beyond
  these docs.

## Owner-provided Page (2026-10-02)

- URL: https://www.facebook.com/profile.php?id=61594856376695 (ID `61594856376695`).
- `GET /61594856376695` (even minimal `id,name,link`) → `(#100, subcode 33)`
  `Unsupported get request ... missing permissions`. Public fetch also login-gated.
- `GET /me/accounts` still lists only `101092449202509`. Conclusion: the session
  SYSTEM_USER (`pantaleone-main`) has no role/task on the new Page, so the API
  cannot read or optimize it yet. Zero writes made to the new Page.

## Resolved on retry (2026-10-02)

- `GET /me/accounts` now lists 2 pages, including `1423764057476870`
  (`Synthetic.pics`, `Art Gallery`). The owner-granted access landed.
- Note: `profile.php?id=61594856376695` still returns `(#100, subcode 33)` —
  that ID is not the Page's Graph ID (likely a profile-scoped ID). Canonical Page
  ID is `1423764057476870`, link `https://www.facebook.com/1423764057476870`.
- Applied via Page token (session-only, never stored): `about` +
  `website=https://www.synthetic.pics/gallery` → `{"success":true}`.
- Re-verified: about + website now read back correctly, `is_published:true`,
  `fan_count:0`. Zero feed posts made (`/feed|/photos|/videos` untouched).

## Sales optimization from live app (2026-10-02)

Brand mined from https://www.synthetic.pics (Space Grotesk, `synthetic` + purple
`#7c3aed` dot + `pics` on `#08080a`; voice restrained/material-first;
conversion = paid high-res downloads + custom galleries; `@synthetic_pics`).

- Profile picture: `POST /picture` with `picture=https://www.synthetic.pics/icon`
  (512px PNG) → success; verified `is_silhouette:false`.
- Cover: uploaded `Black Broken Circles` artwork (site OG image, converted
  AVIF→JPEG 1024px) via `POST /photos` (`published:false`, id
  `122101247037495212`), then `POST /1423764057476870` `cover=<id>` → success;
  verified `cover.source` live. Note: square art will crop on wide cover slots.
- SHOP_NOW CTA via API: `POST /call_to_actions` → `(#100, subcode 33)`
  unsupported on New Page Experience. No API path; owner adds in Page UI:
  Page → `...` → Add action button → Shop Now →
  `https://www.synthetic.pics/gallery?utm_source=facebook&utm_medium=organic_social&utm_campaign=page_cta`.
- Username via API: `(#3)` app lacks capability. Owner sets at
  facebook.com/username once eligible (needs 25 likes; page at 0). Target:
  `syntheticpics`.
- Pinned orientation post drafted, NOT published (feed-write ban still in force).
  Zero `/feed` POSTs made.

## Launch: 10 posts live (2026-10-02)

- `description` (SEO) set → success; verified on read-back. Emails/phone/location
  left empty (unknown — not invented).
- 10 photo posts published, one per real archive work, each caption unique,
  slop-free, ending in a Buy Now deep link
  (`?utm_source=facebook&utm_medium=organic_social&utm_campaign=launch&utm_content=postNN`):
  Gray Impossible Forms, Balanced Rose Bands, Repeated Red Form, Organic White
  Form, Sculptural Stacked Slabs, Sculptural Violet Grid, Red Circular Forms,
  Balanced Rose Pools, Dense Red Planes, Black Broken Circles.
- Buy Now buttons on photo posts are API-impossible (`(#10)` on `call_to_action`;
  `call_to_actions` edge unsupported on New Page Experience). Buy path = Shop Now
  Page button (owner-added) + per-post caption links. Feed shows all 10 published
  plus the 2 profile/cover update stories. Zero `/feed` text-post calls; all posts
  are photo posts with unique images (no duplicates, no spam pattern).

Proof saved in this file + `synthetic-pics.audit.md` + `_system.md`.

Canonical Page ID `1423764057476870` (store as `FACEBOOK_PAGE_ID_SYNTHETIC_PICS`, server env, gitignored).
Reusable for all 8 apps via `config/portfolio.ts` ids + `docs/social-presence/`.
