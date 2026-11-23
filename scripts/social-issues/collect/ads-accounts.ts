// Paid-ads account registry (IDs are public locators, not secrets).
// Tokens stay in .env.local / GitHub Actions secrets — never here.
// Env vars override these defaults: META_ADS_ACCOUNT_IDS, GOOGLE_ADS_CUSTOMER_IDS.
export const META_ADS_ACCOUNTS: string[] = ["act_353877530135233"];

export const GOOGLE_ADS_CUSTOMERS: string[] = ["8427718237"];
