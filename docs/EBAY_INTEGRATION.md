# eBay Integration

Shared production keyset (`Mattpant-master-PRD` app). One keyset serves every
app: app-level calls use the shared client-credentials token; per-app seller
actions use `EBAY_REFRESH_TOKEN_<APP>` after one owner consent per app.

## Envs

| Var | Where | Purpose |
|---|---|---|
| `EBAY_APP_ID` | `.env.local` + Actions secret ✅ | App identity |
| `EBAY_DEV_ID` | `.env.local` + Actions secret ✅ | Developer identity |
| `EBAY_CERT_ID` | `.env.local` + Actions secret ✅ | App secret (Basic auth) |
| `EBAY_ENV` | `production` | `production` or `sandbox` |
| `EBAY_MARKETPLACE` | `EBAY_US` | Browse marketplace header |
| `EBAY_REFRESH_TOKEN_<APP>` | per app, when needed | Seller-level calls (listings, orders) |

## What works now (no owner action)

- App-token grant (`lib/ebay/auth.ts:getAppToken`)
- Browse demand signal (`lib/ebay/browse.ts:searchDemand`, `getItem`) —
  feeds content-engine opportunity detection with real market totals.
- Verify: `npx tsx scripts/ebay/verify.ts [--query "..."]` (local or CI).

## Per-app seller access (one owner login per app)

1. Register the app's RuName (redirect URL) in the eBay developer dashboard.
2. Build the consent URL: `consentUrl(creds, ruName, scopes, state)` —
   scopes e.g. `https://api.ebay.com/oauth/api_scope/sell.inventory`.
3. Owner opens URL, authorizes, pastes `code`.
4. `exchangeCode(creds, ruName, code)` → store refresh token as
   `EBAY_REFRESH_TOKEN_<APP>` (local + Actions secret).
5. Rotate with `refreshUserToken` before expiry.

## Content-automation wiring

`searchDemand` is the demand input to campaign-os opportunity detection
(`modules/campaign-os`): keyword total + top items validate a content angle
against live market depth before the factory builds it. Listing writes stay
out of automation until a per-app user token exists.
