# Social Advertising Playbook (advertising-skills × Social Growth OS)

Upstream: `skills/advertising/upstream/` (v1.0, 12 skills).
Local voice wins on every conflict (`docs/EDITORIAL.md`).

## 9-step flow (per post, SYN+MIX first, then all apps)

1. **avatar-extraction** → `avatarFor(appId)` from `product-matrix.ts`. No invented persona.
2. **offer-extraction** → `offerFor(appId)`. Outcome + time saved + risk reduced.
3. **schwartz-awareness-mapper** → `awarenessFor(platform, pillar)`. Cold (Pinterest/Reddit/TikTok) = education. Warm (IG/FB) = offer.
4. **mechanism-builder** → `mechanismNote(appId)`. One sentence, believable.
5. **ad-angle-multiplier + headline-matrix** → `anglesFor(appId, hook)` → 5 variants, `COPY_BUDGETS`-safe. Advisory only.
6. **scroll-stopping-creative** → first-frame hook + gallery-only visual. No AI stock.
7. **conversion-path-builder** → one CTA + UTM destination (`organic_social`; paid variant `paid_social` with `--paid`).
8. **objection-crusher** → FAQ answers for Reddit/LinkedIn only.
9. **generic-language-killer + social-audit** → `auditSocialCopy` must be `pass` for auto-allow. `fail` blocks publish + auto-approve.

## Commands

```bash
# Packet with angles + paid variant (dry-run first, always)
npx tsx scripts/social-issues/build-packet.ts --issue <n> --dry-run --angles --paid

# Auto-allow check (Rule 3, all apps, pass-only)
npx tsx scripts/social-issues/publish/auto-approve.ts --rule advertising-pass --dry-run
npx tsx scripts/social-issues/publish/auto-approve.ts --rule advertising-pass --apply --limit 10

# Audit single issue
npx tsx scripts/social-issues/social-audit.ts --issue <n>
```

## Paid prep rules

- Organic naming untouched. Paid reuses campaign/creative with `utm_medium=paid_social`, `utm_source=meta|tiktok|youtube`.
- Only promote organic winners (audit pass + real saves/clicks).
- `paidAutoApprove=false` — paid never auto-approves. Human adds `publish:approved`.
- Kill switches: `advertising.anglesEnabled`, `advertising.autoAllowOnPass`, `advertising.paidEnabled` in `config/automation/policy.ts`.

## Missing upstream skills (do not wait)

`voice-of-customer-miner`, `proof-harvester`, `claim-checker`, etc. are README-only.
Covered locally by: editorial audit, anti-slop engine, `titleMatchesArtwork` source fidelity, `validateSocialNaming`.
When upstream ships them, re-vendor and map here.
