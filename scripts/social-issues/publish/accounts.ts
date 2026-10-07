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
];

export function accountsForSite(site: string): SiteAccounts | undefined {
  return SITE_ACCOUNTS.find((a) => a.site === site);
}
