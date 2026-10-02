# synthetic.pics — Shop readiness (2026-10-02)

No secrets in this file. IDs are public Graph IDs, not tokens.

## Already connected (verified via API, no changes needed)

- Catalog `synthetic.pics-catalog` (`2195139958102590`, commerce vertical):
  140 products, all `in stock`, all `$3.00`, retailer_id = artwork SKU.
- Data feed `feed for synthetic.pics-catalog` (`1976763786285877`): DAILY fetch
  08:11 America/Denver from `https://www.synthetic.pics/feeds/meta.csv`.
  Last upload 2026-10-01 completed without failure.
- Feed CSV checked live: 147/147 artworks including today's drops — catalog count
  lags one fetch behind and self-heals on the next run. The single diagnostics
  flag (`UNMATCHED_EVENTS`, 3 items, severity OPPORTUNITY) is the same lag:
  pixel events for the newest works pre-sync. No action.
- Domain verification meta tag present on synthetic.pics (seen in homepage HTML).

## Shop creation test with asset group (2026-10-02)

Owner grouped everything into `asset-group-all` (`108084458548741`, verified live).
Test results:
- Asset group: readable, correct. Grouping organizes assets; it does not grant
  the app new capabilities.
- Page `product_catalogs`: empty — catalog not yet linked to the Page.
- Linking attempt `POST /product_catalogs`: `(#100/33)` unsupported — no API
  path exists to attach a catalog to a Page.
- `shop_setup_status` retry: still `(#200)` — commerce permissions require app
  review; no token or grouping works around it.
Conclusion: the storefront can only be created in Commerce Manager. Everything
it asks for now sits in `asset-group-all`: select Page `Synthetic.pics`,
catalog `synthetic.pics-catalog` (147 products after today's fetch), confirm
the verified domain, add payouts + tax, publish.

Exact path: business.facebook.com → Commerce Manager → Create shop → select
Page `Synthetic.pics` (`1423764057476870`) → catalog `synthetic.pics-catalog` →
confirm domain (already verified) → payouts + tax → publish. Checkout can stay
on-website (drives to Stripe) or use in-app checkout once payouts clear.

## After the shop is live

- Tag the 10 launch posts' artworks with product tags (owner, 2 min each).
- Reels + collection posts link to shop sections, not just artwork URLs.
- Weekly: diagnostics check is one call — fold into the §S dashboard.
