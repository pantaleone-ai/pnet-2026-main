// Verified Meta page / IG-user mapping. IDs are public Graph IDs (already in
// docs/social-presence/*-verification-*.md). Add a site here only after the
// GET /{page}?fields=instagram_business_account handshake succeeds for it.
export interface SiteAccounts {
  site: string;
  pageId: string;
  pageName: string;
  igUserId?: string;
  igUsername?: string;
}

export const SITE_ACCOUNTS: SiteAccounts[] = [
  {
    site: "synthetic-pics",
    pageId: "1423764057476870",
    pageName: "Synthetic.pics",
    igUserId: "17841457168450219",
    igUsername: "synthetic.pics",
  },
  {
    site: "pantaleone",
    pageId: "101092449202509",
    pageName: "Pantaleone.net",
    igUserId: "17841452273392769",
    igUsername: "pantaleonenet",
  },
  {
    // Mixphd FB page verified via GET /me/accounts (fan_count 0, published).
    // IG linked 2026-10-24: GET /1398289563357130?fields=instagram_business_account
    // -> 17841434747706770; GET /17841434747706770 -> username mixphd
    // (followers 0, media 0, brand-new). Both FB + IG now live.
    site: "mixphd",
    pageId: "1398289563357130",
    pageName: "Mixphd",
    igUserId: "17841434747706770",
    igUsername: "mixphd",
  },
];

export function accountsForSite(site: string): SiteAccounts | undefined {
  return SITE_ACCOUNTS.find((a) => a.site === site);
}
