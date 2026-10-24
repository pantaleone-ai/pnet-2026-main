# mixphd — Meta Page + Instagram verification (2026-10-24)

No secrets in this file. Token referenced as `EAA...[withheld, session-only]`.

## Handshake (read-only, zero writes)

- `GET /1398289563357130?fields=id,name,fan_count,instagram_business_account`
  → `{"id":"1398289563357130","name":"Mixphd","fan_count":1,`
  `"instagram_business_account":{"id":"17841434747706770"}}`
- `GET /17841434747706770?fields=username,name,followers_count,media_count`
  → `{"username":"mixphd","name":"Mixphd","followers_count":0,`
  `"media_count":0,"id":"17841434747706770"}`

Conclusion: FB Page `1398289563357130` (`Mixphd`) is API-accessible and has a
linked IG business account `17841434747706770` (`@mixphd`, brand-new: 0
followers, 0 media). Both channels live — no code changes needed beyond
`SITE_ACCOUNTS`.

## Applied

- `scripts/social-issues/publish/accounts.ts`: `site:mixphd` +=
  `igUserId 17841434747706770` / `igUsername mixphd`.
- `publish-due --due --site mixphd` no longer skips IG (guard stays for future
  unlinked sites). Nightly + IG slot crons already serve both sites.

Zero posts made by this check.
