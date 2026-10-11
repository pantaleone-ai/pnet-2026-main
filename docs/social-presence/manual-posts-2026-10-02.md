# Manual pre-pipeline posts — 2026-10-02/03 (audit record)

Seven Facebook posts published manually before the social automation went live
(no issues, no proofs, no registry entries at the time). Recorded here so the
dedupe rule (one image → one message) can be audited against them. Verified
2026-10-11 via Graph API against live feed state.

## Photo posts (distinct uploaded visuals each — no internal duplication)

| Live post | Message | Probable catalog artwork | Automation reuse? |
|---|---|---|---|
| `122101659471495212` (Oct 2) | Sparse Rose Horizon. Monochromatic study… | `2026-09-29-sparse-rose-horizon-…-53384472` | None — never used by automation |
| `122101659297495212` (Oct 2) | Symmetrical Nested Squares. Blue concentric squares… | `2026-09-30-symmetrical-nested-squares-…` (probable; distinct from automation's `surface-…-nested-squares-47845650`) | None — different piece than #140's |
| `122101659003495212` (Oct 2) | Polished Stone Vaulted Arches. Vaulted arches in green… | `2026-09-27-surreal-green-arches-…-12359279` (probable; distinct from automation's `mineral-…-vaulted-arches-31694839`) | None — different piece than #140's |
| `122103098403495212` (Oct 3) | (no message) | Unidentified | None claimed |

## Link + video posts

| Live post | Message | Note |
|---|---|---|
| `122101660149495212` (Oct 2) | Broken grids, three temperaments… (`utm_campaign=test`) | Test post; link-scrape visual, gallery home |
| reel `1329630445779841` (Oct 2) | This week's keeps… | Reels are outside the pipeline format set |
| reel `4433855970212783` (Oct 2) | Broken grids, three temperaments… | Reels are outside the pipeline format set |

## Clearance

No identical-image collision between these manual posts and any automated post
(verified Oct 11: all 9 live IG posts and all 6 live-or-deleted FB pipeline
posts map to distinct visuals/messages). Probable-artwork mappings above are
best-effort from titles/descriptors — deliberately NOT entered into
`syn-exposure.json` caps, so uncertain guesses can never block future use. If
any mapping is confirmed exact, move it into the exposure ledger.
