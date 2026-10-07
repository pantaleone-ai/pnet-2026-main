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

## Channels and credentials

| Channel | Queue volume | Status | Envs needed |
|---|---|---|---|
| Instagram | 5 open | **LIVE** (proven #91, #101) | `META_CAPI_ACCESS_TOKEN` ✅ stored |
| Facebook | 3 open | **LIVE** (same token, `pages_manage_posts`) | `META_CAPI_ACCESS_TOKEN` ✅ stored |
| Pinterest | 8 open (largest) | Blocked — owner OAuth | `PINTEREST_ACCESS_TOKEN` |
| X | 8 open | Blocked — owner app + OAuth | `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` |
| LinkedIn | 2 open | Blocked — owner OAuth (aiceo/profitsignals only) | `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN` |
| Reddit | 2 open | Manual-only by policy | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USERNAME`, `REDDIT_PASSWORD` |
| YouTube Shorts | 1 open | Blocked — owner OAuth + video creative | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` |

Also add `META_CAPI_ACCESS_TOKEN` as a GitHub Actions secret (same value as
`.env.local`) so `social-publish.yml` can post from CI.

## Owner setup steps (per blocked channel)

- **Pinterest**: create a Pinterest app → production trial access → OAuth code
  exchange → long-lived token (~60d, refreshable) → `PINTEREST_ACCESS_TOKEN`.
  Board mapping defaults go next to `SITE_ACCOUNTS` (`accounts.ts`).
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
