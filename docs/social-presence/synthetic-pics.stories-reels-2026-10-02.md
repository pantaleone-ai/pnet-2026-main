# Stories + Reels (2026-10-02)

All via Graph API v26.0. No secrets in this file.

## 3 photo stories — live

Fresh images (never posted before, per Stories API rule), unpublished upload →
`POST /photo_stories`, all `{"success":true}`:

- Ochre Broken Circles → story post `1994028001465280`
- Surreal Blue Forms → story post `1075482338707480`
- Layered Nested Squares → story post `1136879415442193`

Stories expire after 24h by design. Photo specs met (JPEG, <10MB).

## 2 reels — published

Built locally with ffmpeg from live artwork (1080×1920, h264+aac, silent track):

- `reel_broken_grids.mp4` (12s, 3 works) → video `4433855970212783`,
  post `1423764057476870_122101664871495212`. Status re-read: `ready`,
  `publishing_phase.complete`, `publish_status: published`, no copyright match.
- `reel_weeks_keeps.mp4` (15s, 5 works) → post
  `1423764057476870_122101665159495212` (was processing at publish; same flow).

Upload learning: rupload needs `Offset: 0` + `file_size` headers with
`Authorization: OAuth <page-token>` (Bearer scheme fails opaquely).

## Follow-ups (owner)

- Reels have no UTM on watch page — measure via GA4 Facebook referrals + the
  gallery links in descriptions (`utm_campaign=reel`).
- Next reels need generation-sequence frames (still unavailable) or new weekly
  keeps cut the same way: 5 images × 3s, same ffmpeg recipe.
