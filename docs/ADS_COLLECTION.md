# Paid Ads → BigQuery (Google Ads + Meta Ads)

Scaffold-first implementation. Collectors follow the existing `social-collect`
pattern: read-only APIs → JSONL → `bq load --replace` staging → `MERGE` into
canonical tables. Paid rows reuse `social_reporting.social_metric_observations`
+ `dim_campaigns` with `organic_or_paid='paid'`, zero schema change.

## Plan (implemented)

1. **Meta Ads collector** `scripts/social-issues/collect/meta-ads-collect.ts`
   - API: `GET /{act_X}/insights?level=campaign|adset|ad&time_increment=1`
   - Grain: campaign-day (default `--level campaign`), 30d lookback.
   - Metrics: `spend, impressions, clicks, conversions` (+ `actions` raw for audit).
   - IDs namespaced `meta-ads:<id>`, platform `meta_ads`, project `paid-social`.
2. **Google Ads collector** `scripts/social-issues/collect/google-ads-collect.ts`
   - API: `POST /v26/customers/{id}/googleAds:search` (GAQL campaign + segments.date).
   - Grain: campaign-day, 30d lookback. `cost_micros / 1e6 → spend`.
   - Metrics: `spend, impressions, clicks, conversions`.
   - IDs namespaced `google-ads:<id>`, platform `google_ads`, project `paid-search`.
3. **Shared** `scripts/social-issues/collect/ads-common.ts` — ObsRow/CampaignRow
   types, `normTs`, `makeObs` (paid, MDV pin), `writeJsonl`, window helpers.
4. **CI** `.github/workflows/ads-collect.yml` — nightly 07:30 ET (after organic),
   dry-run default on dispatch, same WIF (`github-bq-loader`) + `bq` MERGEs as
   `social-collect.yml`. Staging tables: `stg_ads_observations`, `stg_ads_campaigns`.
5. **Null policy**: missing metrics → `null` + `confidence=unavailable:*`, never zero.
   Mirrors organic collectors. MERGE keys unchanged (entity_ids are distinct, so
   no organic/paid collision). Future migration: add `organic_or_paid` to the
   MERGE `ON` clause once backfilled.

## Setup (owner actions to go live)

```bash
# 1. Meta: Marketing API system user with ads_read on each ad account
#    Events Manager → Marketing API → token. Test:
npx tsx scripts/social-issues/collect/meta-ads-collect.ts --dry-run --level campaign
META_ADS_ACCOUNT_IDS="act_123,act_456" META_ADS_ACCESS_TOKEN="EAA..." \
  npx tsx scripts/social-issues/collect/meta-ads-collect.ts --since 2026-10-10 --until 2026-11-09

# 2. Google: Developer token (approved) + OAuth access token with adwords scope
#    Google Ads API Center → developer token. OAuth: offline, scope
#    https://www.googleapis.com/auth/adwords. Test:
npx tsx scripts/social-issues/collect/google-ads-collect.ts --dry-run
GOOGLE_ADS_CUSTOMER_IDS="1234567890" GOOGLE_ADS_DEVELOPER_TOKEN="..." \
GOOGLE_ADS_ACCESS_TOKEN="ya29..." \
  npx tsx scripts/social-issues/collect/google-ads-collect.ts --since 2026-10-10
```

GitHub secrets required for CI (`ads-collect.yml`):
`META_ADS_ACCESS_TOKEN` (or reuse `META_CAPI_ACCESS_TOKEN` if it has `ads_read`),
`META_ADS_ACCOUNT_IDS`, `GOOGLE_ADS_ACCESS_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`,
`GOOGLE_ADS_CUSTOMER_IDS`, optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC).

BigQuery (one-time, run as BQ admin):
```sql
-- Staging mirrors canonical schemas; CREATE once, workflow uses --replace.
CREATE OR REPLACE TABLE `pantaleone-cross-app.social_reporting.stg_ads_observations`
AS SELECT * FROM `pantaleone-cross-app.social_reporting.social_metric_observations` WHERE FALSE;
CREATE OR REPLACE TABLE `pantaleone-cross-app.social_reporting.stg_ads_campaigns`
AS SELECT * FROM `pantaleone-cross-app.social_reporting.dim_campaigns` WHERE FALSE;
```

## Verify

```bash
npx tsx scripts/social-issues/collect/meta-ads-collect.ts --dry-run
npx tsx scripts/social-issues/collect/google-ads-collect.ts --dry-run
npm run check-types
```

## Next (when IDs + tokens land)

- Fill `META_ADS_ACCOUNT_IDS` / `GOOGLE_ADS_CUSTOMER_IDS`, run live collects,
  confirm row counts, then enable `ads-collect.yml` schedule.
- Optional: `utm_campaign` join — lineage already maps `dim_campaigns.campaign_id`
  to content via `campaign-lineage.ts`; add paid campaign IDs to issue bodies to
  link spend → organic winners (see `docs/SOCIAL_ADVERTISING_PLAYBOOK.md`).
- Optional: add `organic_or_paid` to MERGE keys + `ads_*` views for ROAS/CAC in
  `lib/growth/reporting.ts`.
