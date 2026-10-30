# Social Publishing Pipeline

Packet-merged issues (`status:packet-ready`) become live platform posts here.
One orchestrator, per-channel publishers, credential-gated: channels without
stored credentials report `blocked` and the issue stays `packet-ready`.

## Pipeline states

`status:queued` → `status:in-progress` (claim) → `status:packet-ready`
(packet merged) → **live post** → `status:packet-ready` + `needs-screenshot`
(URL proven, shot pending) → `status:published` + `status:done`, closed.

Only `scripts/social-issues/publish/publish-due.ts` performs the terminal
transition, and only with post URL **plus** screenshot in hand. The
merge-time closer (`close-with-evidence-social.ts`) can never close a
packet-only merge.

## Usage

```bash
# Dry-run (always first): prints the publish plan, posts nothing
npx tsx scripts/social-issues/publish/publish-due.ts --issue <n> --dry-run

# Instagram carousel (images must be public JPEG/PNG, 2-10)
npx tsx scripts/social-issues/publish/publish-due.ts --issue <n> \
  --images "https://www.pantaleone.net/ig/<post>/1.jpg,..." \
  --caption-file docs/social-presence/publish/<post>-caption.txt

# Attach the permalink screenshot to close
npx tsx scripts/social-issues/publish/publish-due.ts --issue <n> \
  --screenshot-url "https://raw.githubusercontent.com/.../proof-<id>.png"

# Facebook verification without residue (posts, proves, deletes)
npx tsx scripts/social-issues/publish/publish-due.ts --issue <n> \
  --channel facebook --verify-delete
```

CI: `.github/workflows/social-publish.yml` (dispatch-only, `dry-run`
defaults to true). Mirror every env below as an Actions secret for CI runs.

## Issue-driven automation

Add the `publish:approved` label to ANY open `social` issue and the pipeline
drives it to live, no manual steps:

- Already `status:packet-ready` → `social-publish-on-approval.yml` publishes live.
- Anything earlier (queued/in-progress) → `social-auto-packet.yml` builds the
  packet (`build-packet.ts`), renders per-post visuals (`build-visuals.ts`),
  opens + merges the packet PR, flips to `status:packet-ready`, verifies image
  URLs, then re-adds `publish:approved` so publishing fires. Nothing publishes
  inside auto-packet; every stop path removes the trigger label (no loops).
- Unprocessable approvals (closed, already published, non-IG/FB channels,
  unnamed/missing art) get an explanatory comment and the label removed.

Guards for the live step: open + `social` + `status:packet-ready` with no
existing proof; credentials present; images resolve from the issue
`**Images:**` field (backticked URLs) and Pinterest boards from `**Board:**
`id``. Proof without screenshot parks at `needs-screenshot`; attach the shot
to close. All runs are idempotent and never double-post.

## Channels and credentials

| Channel        | Queue volume     | Status                                                                                                                            | Envs needed                                                                      |
| -------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Instagram      | 5 open           | **LIVE** (proven #91, #101)                                                                                                       | `META_CAPI_ACCESS_TOKEN` ✅ stored                                               |
| Facebook       | 3 open           | **LIVE** (same token, `pages_manage_posts`) — photo posts with per-post visuals; bare link posts refused (link-scrape duplicates) | `META_CAPI_ACCESS_TOKEN` ✅ stored                                               |
| Pinterest      | queue grows daily | **LIVE** (proven #96, #114) — 8 public strategy boards, 28 slots/wk (4/day), nightly due-publish + API audit-close | `PINTEREST_ACCESS_TOKEN` ✅ stored (+ Actions secret, refresh in `.env.local`) |
| X              | 8 open           | Blocked — owner app + OAuth                                                                                                       | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`           |
| LinkedIn       | 2 open           | Blocked — owner OAuth (aiceo/profitsignals only)                                                                                  | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`                                   |
| Reddit         | 2 open           | Manual-only by policy                                                                                                             | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD` |
| YouTube Shorts | 1 open           | Blocked — owner OAuth + video creative                                                                                            | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`            |

Also add `META_CAPI_ACCESS_TOKEN` as a GitHub Actions secret (same value as
`.env.local`) so `social-publish.yml` can post from CI.

## Owner setup steps (per blocked channel)

- **Pinterest**: app credentials stored (`PINTEREST_APP_ID` + `PINTEREST_APP_SECRET`
  in `.env.local`, synthetic.pics app). One owner step remains: approve OAuth once
  (or Generate-token in the app dashboard) with scopes
  `boards:read,boards:write,pins:read,pins:write,user_accounts:read`, then save the
  resulting `PINTEREST_ACCESS_TOKEN` (+ `PINTEREST_REFRESH_TOKEN`) to `.env.local`.
  Exchange/refresh helpers: `scripts/social-issues/publish/pinterest.ts`.
- **X**: developer portal app with Read+Write user auth → 4-legged OAuth 1.0a
  user tokens → the four `X_*` envs. Free tier covers queue volume.
- **LinkedIn**: app with `w_member_social` → 3-legged OAuth token (~60d
  refresh) → `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_PERSON_URN`. Matrix scope:
  aiceo and profitsignals only.
- **Reddit**: script-type app → the four `REDDIT_*` envs (no 2FA on the
  posting account — 2FA breaks the password grant). Pipeline holds
  `packet-ready` regardless; a human posts answers-first and pastes the
  permalink.
- **YouTube**: Google Cloud OAuth client with `youtube.upload` scope →
  offline refresh token → the three `YOUTUBE_*` envs. Shorts creative via the
  ffmpeg recipe in `docs/social-presence/*stories-reels*.md`.

## Adding a site

Verify the handshake first, then extend `SITE_ACCOUNTS` in
`scripts/social-issues/publish/accounts.ts`:

```
GET /{page-id}?fields=instagram_business_account  -> IG user id
GET /{ig-user-id}?fields=username                 -> handle
```

Until a site is listed, `publish-due` refuses to post for it.

## Reshares (portfolio -> pantaleone.net)

Any app's published FB/IG post may nominate a `pantaleone` reshare.
Caps live in `PANTA_RESHARE_CAPS` (`config/social-growth/cadence.ts`):
max 4/week combined, 2/platform/week, 48h after source, 48h between reshares.
Best-fit target wins (same-platform usually preserves format).
`p1` auto-nominates, `p2` needs `reshare:approved`, `p3` manual-only.

Rule 1 (gallery-live) + Rule 2 (synthetic-proof) auto-approval runs in
`.github/workflows/social-auto-approve.yml` (twice daily) via
`scripts/social-issues/publish/auto-approve.ts` using the shared policy
(`lib/automation/policy.ts`, config `config/automation/policy.ts`).
It only adds the existing `publish:approved` label when every hard gate
passes (open, packet-ready, no proof, credentials, images, catalog-live or
proven source, cap open, no media conflict) — downstream publishing,
idempotency, and screenshot-close behavior are unchanged.
Dry-run first: `auto-approve.ts --rule all --dry-run`.
Cap accounting reads durable GitHub state (proof-carrying pantaleone issues
in the last 7d), not the local ledger (runner-ephemeral, audit-only).

## Copy budgets + social audit

Every caption follows the same budgets (`COPY_BUDGETS` in
`lib/social-growth/caption.ts`): hook 4–10 words / max 100 chars, body one
short sentence (6–14 words), CTA 1–4 words, total copy target ≤ 28 words
(excl. URL/hashtags), Instagram max 3 relevant hashtags, Facebook none.

Body never repeats the artwork name from the hook. Hook carries the name
(`New in the gallery: Sand in material-study.`) — body is description-only
(`Soft forms in ochre, symmetrical arrangement.`). Generator strips leading
`{Title} — ` via `stripTitlePrefix()` (`lib/social-growth/caption.ts`); audit
fails `body repeats hook title` until fixed. Same rule for FB, IG, Pinterest,
respins, and reshares.

`lib/social-growth/social-audit.ts` audits issue body, reshare copy,
generated captions, and packets using the existing anti-slop engine
(`scanText` + quality gate, scan-only — it never rewrites) plus budget,
voice (`lintCaption`), source-fidelity (`titleMatchesArtwork` vs
`SYN_CATALOG`), and cross-post repetition checks. Result: `pass` (proceed),
`warn` (recorded, proceeds), `fail` (label `needs_review`, blocks
auto-approval via `social-auto-approve.ts` and publication via
`publish-due.ts` until fixed). Calibrated 2026-10: 19 published posts →
13 pass, 5 warn, 1 fail (pre-existing vibe hook, published copy untouched).
Advisory: `social-audit.ts --issue <n> [--repeat]` · `social-audit.ts
--history <n>` (read-only calibration).
Enforcement: `publish-due.ts` IG/FB paths, `auto-approve.ts` Rules 1+2.
Kill switch: `social.audit.enabled=false` in `config/automation/policy.ts`.

```bash
# Score candidates (closed published FB/IG, 48h+ old)
npx tsx scripts/social-issues/publish/reshare.ts --auto --limit 10

# Draft a reshare (dry-run first, always)
npx tsx scripts/social-issues/publish/reshare.ts --from 147 --dry-run
npx tsx scripts/social-issues/publish/reshare.ts --from 147 --create-issue

# Publish the reshare issue like any other packet
npx tsx scripts/social-issues/publish/publish-due.ts --issue <new-n> --dry-run
```

Reshares reuse source visuals with a `portfolio-bridge` rewrite, `PNT_*`
campaign + `*_RS_V1` creative, and `**Reshare-Of:** `#NNN/content-id``linkage.
The media ledger allows same-URL reuse across sites only when`reshareOf`matches the owning contentId (same-site duplicates still blocked).
Daily scoring runs in `.github/workflows/social-reshare.yml` (read-only;
draft creation is manual dispatch only).

## Nightly synthetic + mixphd auto-posting (SYN ~8.4/day, MIX ~3.4/day + respins)

`social-nightly.yml` (02:05 ET) runs the full loop for both sites with no human gates;
`social-ig-slots.yml` publishes IG windows just-in-time (IG has no
scheduling API). Kill switches: `social.nightly.enabled=false` in
`config/automation/policy.ts` (both sites: intake refuses `--apply`; scheduled runs become read-only),
`social.nightly.mixphd.enabled=false` (mixphd only), or disable the two
workflows.

1. **Intake synthetic** (`gallery-sync.ts`, `--apply --limit 3` by default): polls the
   public gallery API, diffs vs `SYN_CATALOG`, appends new artwork, creates
   one FB + one IG + one Pinterest issue per artwork (FIFO oldest-first, deduped on artwork
   ID — Pinterest coverage tracked separately so every artwork gets its pin, copy audited — `fail` skips, never publishes).
2. **Intake mixphd** (`recipe-sync.ts`, `--apply --limit 2`): polls
   `https://www.mixphd.com/sitemap.xml` for `<lastmod>` ≤36h, dedupes on slug vs
   open/closed issues (`**Source asset:**`), fetches each recipe page for name +
   meta-description + hero, HEAD-checks hero (stub/small → `needs-asset`, never
   published), creates one FB + one IG `status:queued` issue per recipe (hook from
   name+tag, body = meta-description first sentence 6–14 words, CTA `Read the recipe`,
   UTM `MIX_*`). Zero changes to the mixphd repo.
3. **Respin** (`respin-queue.ts`, `--apply --limit 1` per site): reposts rested
   catalog art / recipes with a fresh spin — rotated hook angle, alternate body
   sentence, top-anchored crop (pixel-different card via `--crop top`), new
   contentId (`-r2`/`-r3`) + creative `_V2`, `**Respin-Of:**` traceability.
   Guards: nothing open on the slug, 30d+ since last issue (or never posted),
   max 3 uses/quarter per artwork (shared exposure ledger), hero still live,
   audit-gated. Fills weekend/off-hours slots without waiting on new intake.
4. **Packet** (`auto-packet.ts --no-reapprove`, all queued incl. respins): builds
   packet + visuals (mixphd: sitemap `image:loc` AVIF → 1080×1350 IG / 1200×630
   FB JPEG via PIL+AVIF; respins: `**Crop:** top` for fresh framing),
   merges, lands `packet-ready` — does NOT re-approve (slots own the timing).
5. **Schedule** (`schedule-queue.ts --write`): stamps `**Publish at:**`
   from `SYN_TIMING_WINDOWS` (IG 18/wk, FB 13/wk ≈ 4.4/day; Sat 4 + Sun 3;
   off-hours Mon/Fri 7:30a + Tue/Wed/Thu 9p IG, Wed 7a + Sun 8p FB) or
   `MIX_TIMING_WINDOWS` (IG 13/wk, FB 11/wk ≈ 3.4/day; Sat 4 + Sun 4;
   off-hours 8p IG + 7a FB runs) selected by `site:` label. All staggered
   across platforms and brands (no shared day+hour); slots are ET.
6. **Facebook**: native `scheduled_publish_time` at stamp time
   (`publish-due --issue N --schedule-at <slot>`). No runner needed — any hour works.
7. **Instagram**: slot crons 7:05a/9:05a/12:05p/6:35p/9:05p ET run
   `publish-due --due --channel instagram --site <site>` (oldest due slot first,
   limit 2 per site; both synthetic.pics + mixphd IG live). Early + late runs
   cover the off-hours grid.
8. **Pinterest**: `publish-due --due --channel pinterest --site synthetic-pics`
   (oldest due slot first, limit 5; board from `--board-id`/`**Board:**`/pillar
   fallback in `pinterest-boards.ts`, 8 public strategy boards). Pins post
   immediately at the nightly run — slots pace the queue (28/wk, 4/day).
9. **Close**: `verify-proofs --apply` audit-closes Graph/API-verified
   synthetic + mixphd posts as `published/done` without screenshots; unverified stays
   parked. Manual posts still close via screenshot as before.
