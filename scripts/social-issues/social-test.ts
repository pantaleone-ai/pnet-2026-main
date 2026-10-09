// Social foundation self-tests (no network, no writes outside tmp).
// Run: npx tsx scripts/social-issues/social-test.ts
// Follows the campaign:test tsx-assertion convention. Non-zero exit on failure.
import {
  buildCaption,
  lintCaption,
  suggestHashtags,
} from "@/lib/social-growth/caption";
import {
  eligible,
  readLedger,
  recordUse,
  usesInQuarter,
} from "@/lib/social-growth/exposure";
import { nextSlot, parseWindow } from "./schedule-queue";
import { validateCampaignName, validateCreativeName } from "@/lib/growth/utm";
import { tmpdir } from "node:os";
import { join } from "node:path";

let failures = 0;

function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    console.log(`ok - ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

// Caption optimizer.
const ig = buildCaption({
  hook: "Fresh this week: 3 new drops for calm walls.",
  body: "Human-guided generative pieces.",
  cta: "Explore the gallery",
  destinationUrl: "https://www.synthetic.pics?utm_source=instagram",
  platform: "instagram",
  pillar: "comparison",
});
check(
  "ig caption has hashtags",
  ig.hashtags.length >= 1 && ig.hashtags.length <= 5,
  ig.hashtags.join(","),
);
check("ig caption lint clean", ig.lint.ok, ig.lint.violations.join(";"));
check(
  "ig caption ends with tags",
  ig.text.trimEnd().endsWith(ig.hashtags.map((t) => `#${t}`).join(" ")),
);

const fb = buildCaption({
  hook: "Weekend drop.",
  body: "Short notes.",
  cta: "Explore the gallery",
  destinationUrl: "https://www.synthetic.pics?utm_source=facebook",
  platform: "facebook",
  pillar: "product",
});
check(
  "fb caption stays clean",
  fb.hashtags.length === 0 && !fb.text.includes("#"),
);

const bait = lintCaption("Tag a friend below for this viral future of art!", [
  "art",
]);
check(
  "bait detected",
  !bait.ok && bait.violations.length >= 2,
  bait.violations.join(";"),
);
check("hashtag pool bounded", suggestHashtags("comparison").length <= 5);

// Exposure ledger (isolated tmp path).
const tmpLedger = join(tmpdir(), `exposure-test-${Date.now()}.json`);
check("empty ledger reads", Object.keys(readLedger(tmpLedger)).length === 0);
recordUse(
  "art-a",
  { issue: 1, creativeId: "C1", date: "2026-10-01T00:00:00Z" },
  tmpLedger,
);
recordUse(
  "art-a",
  { issue: 2, creativeId: "C2", date: "2026-10-05T00:00:00Z" },
  tmpLedger,
);
const ledger = readLedger(tmpLedger);
check(
  "uses counted",
  usesInQuarter(ledger, "art-a", "2026-10-09T00:00:00Z") === 2,
);
check("eligible under cap", eligible(ledger, "art-a", "2026-10-09T00:00:00Z"));
recordUse(
  "art-a",
  { issue: 3, creativeId: "C3", date: "2026-10-06T00:00:00Z" },
  tmpLedger,
);
check(
  "capped at 3/quarter",
  !eligible(readLedger(tmpLedger), "art-a", "2026-10-09T00:00:00Z"),
);
check(
  "new quarter resets",
  eligible(readLedger(tmpLedger), "art-a", "2027-01-02T00:00:00Z"),
);

// Scheduler slots (fixed reference: Thu 2026-10-08 12:00 UTC = 08:00 ET).
const ref = new Date("2026-10-08T12:00:00Z");
const tue = nextSlot(parseWindow("Tue 12:00 ET"), ref);
check(
  "next Tue 12:00 ET",
  tue.toISOString() === "2026-10-13T16:00:00.000Z",
  tue.toISOString(),
);
const thu = nextSlot(parseWindow("Thu 19:00 ET"), ref);
check(
  "next Thu 19:00 ET",
  thu.toISOString() === "2026-10-08T23:00:00.000Z",
  thu.toISOString(),
);

// UTM validators still pass for live campaigns.
check(
  "campaign valid",
  validateCampaignName("SYN_IG_DISCOVERY_ARTBUYERS_US_202610").valid,
);
check("creative valid", validateCreativeName("SYN_FRESH_CAR_V1").valid);

if (failures > 0) {
  console.error(`\nsocial-test: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nsocial-test: all passing");
