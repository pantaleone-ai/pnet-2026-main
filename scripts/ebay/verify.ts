// Prove the eBay app keys live: app-token grant + one Browse demand query.
// Run: npx tsx scripts/ebay/verify.ts [--query "3d print"] [--dry-run-local-note]
// Prints only shapes/counts — tokens and secrets never logged.
// Note: some egress networks are blocked by eBay edge (empty 404); CI passes.
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { getAppToken } from "@/lib/ebay/auth";
import { searchDemand } from "@/lib/ebay/browse";
import { ebayCreds } from "@/lib/ebay/config";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

async function main(): Promise<void> {
  const creds = ebayCreds();
  if (!creds) {
    console.error("missing EBAY_APP_ID / EBAY_CERT_ID");
    process.exit(1);
  }
  console.log(`env=${creds.env} marketplace=${creds.marketplace} appId=${creds.appId.slice(0, 8)}***`);
  const token = await getAppToken(creds);
  console.log(`app token ok (expires_in=${token.expiresIn}s)`);
  const query = arg("--query") ?? "3d print";
  const demand = await searchDemand(creds, query, 3);
  console.log(`demand "${query}": total=${demand.total}`);
  for (const item of demand.items) {
    console.log(`- ${item.title?.slice(0, 70)} | ${item.price?.value} ${item.price?.currency}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
