# Tracking Taxonomy v1 (canonical rollup ontology)

Version: `taxonomy_version = v1` (`metric_definition_version = mdv2-taxonomy-v1` on canonical rows).
Status: active. Raw tables are never rewritten; canonicalization lives in
`v_observations_canonical` + `dim_metric_map` / `dim_platform_map`.

## 1. Platform

Raw `platform` values observed: `facebook instagram pinterest google-ads`
(warehouse) + `google_ads meta_ads` (collectors/transfer).

| platform_group | raw platforms | notes |
|---|---|---|
| `meta` | `facebook`, `instagram` | organic social, Meta APIs |
| `pinterest` | `pinterest` | organic, Pinterest v5 API |
| `google_ads` | `google_ads`, `google-ads` (legacy) | paid search, transfer + collector |
| `meta_ads` | `meta_ads` | paid social, collector (tokens pending) |

Rule: new collectors emit `google_ads` / `meta_ads` (underscore). The view
maps legacy `google-ads` → `google_ads`. `platform_group` is the rollup key;
raw `platform` is preserved for audit.

## 2. Metric family

Raw `metric_name` is preserved; `metric_family` is the rollup key.

| family | members | funnel_stage |
|---|---|---|
| `engagement` | likes, comments, saved, saves, shares, engagements, page_post_engagements, post_insights | consideration |
| `distribution` | reach, impressions | awareness |
| `traffic` | pin_clicks, outbound_clicks, clicks | consideration |
| `audience` | page_fans, page_followers | awareness |
| `spend` | spend | spend |
| `conversion` | conversions | conversion |
| `unmapped:<name>` | anything else | null (proposes a mapping rec, never dropped) |

Winner rule (playbook): `metric_family='engagement'` summed over 7d.
Paid efficiency: `spend` vs `conversion`.

## 3. Scope canonical

Raw scopes observed: `snapshot lifetime daily day period`.

| scope_canonical | raw | grain |
|---|---|---|
| `snapshot` | `snapshot` | point-in-time (likes, fans) — not summed across days |
| `daily` | `daily`, `day` (legacy), `period` iff `period_end - period_start <= 1 day` | summable by day |
| `lifetime` | `lifetime` | cumulative per entity — max, never sum |
| `period` | `period` spanning >1 day (pinterest pin analytics, 30d window) | excluded from daily rollups, reported separately |

Paid transfer/merge grain: one row per (campaign, day, metric). Source
breakdown rows MUST be `SUM()`ed before merge (the Nov-10 18-fragment
incident). Ads data lags ~1d — exclude today from trend claims.

## 4. Entity tier

| tier | entity_type values | id shape |
|---|---|---|
| `account` | `account` | page/account id |
| `campaign` | `campaign` | `google-ads:<id>` / `meta-ads:<id>` / `APP_PLATFORM_…` |
| `ad_or_post` | `post`, `ad`, `adset` | platform post/ad id |

Dedupe key (unchanged): `(entity_id, metric_name, metric_scope, DATE(snapshot_at), period_start)`.

## 5. UTM / campaign ontology (posting templates)

Standard (`lib/growth/utm.ts`, single source):
- Campaign: `APP_PLATFORM_OBJECTIVE_AUDIENCE_GEO_YYYYMM` (6 segments, uppercase).
- Creative: `APP_CONCEPT_FORMAT_VARIANT` (4 segments).
- `buildSocialUrl` → `utm_source=<platform> utm_medium=organic_social utm_campaign=<campaign> utm_content=<creative>`.
- `buildPaidSocialUrl` → `utm_source=meta|tiktok|youtube utm_medium=paid_social`, same campaign/creative strings.

Packet tracking block (required, see `build-packet.ts`): `utm_campaign`,
`utm_content`, `campaign_id`, `content_id`, `platform_group`, `funnel_stage`,
`taxonomy_version`. `social-audit` layer 8 fails the packet when missing or
when `utm_campaign != campaign_id` / `utm_content != creative_id`.
`paidAutoApprove=false` unchanged: valid tracking makes a post *eligible*,
never auto-approved.

Enums (extend, never free-text): objective ∈ {traffic, discovery, conversion,
retargeting}; audience ∈ {artbuyers, homebar, portfolio, cold, warm};
geo default `US`; `yyyymm` = publish month.

## 6. GA4 join

Web behavior joins on `utm_campaign = campaign_id`, `utm_content = content_id`,
date. GA4 custom event params (additive, `lib/analytics.ts`): `app_id`,
`campaign_id`, `content_id`, `platform_group`, `funnel_stage`. Registered as
GA4 event-scoped custom dimensions. `growth.trackActivation` fans out to GA4
with the same params (PostHog path unchanged). GA4 → BigQuery export
(`analytics_*`) is the web side; `v_observations_canonical` is the
media side — no new export, join documented in `docs/GROWTH_ANALYSIS.md`.

## 7. Versioning

- `mdv1-*` = raw collector rows.
- `mdv2-taxonomy-v1` = rows read through / emitted under this spec.
- Mapping changes bump `taxonomy_version` (v1 → v2) and append here; old
rows keep their version. Analyzer stamps `taxonomy_version` on every rec.

## 8. Known legacy to absorb (do not re-clean history)

- 18 paid rows with `platform='google-ads'`, `metric_scope='day'` (Nov-10,
manual merge). Fixed by delete + aggregated re-merge; view maps them
meanwhile so rollups stay correct.
- Pinterest `period` rows span the 30d window — excluded from daily sums
until pin analytics returns per-day grain.
- `post_insights` lifetime=234 rows carry `unavailable:post_insights_deprecated_2026`
— counted for coverage, never summed as engagement.
