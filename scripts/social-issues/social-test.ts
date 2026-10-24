// Social foundation self-tests (no network, no writes outside tmp).
// Run: npx tsx scripts/social-issues/social-test.ts
// Follows the campaign:test tsx-assertion convention. Non-zero exit on failure.
import {
  buildCaption,
  lintCaption,
  suggestHashtags,
  COPY_BUDGETS,
  countWords,
} from "@/lib/social-growth/caption";
import { auditSocialCopy } from "@/lib/social-growth/social-audit";
import { buildReshareBody } from "./publish/reshare";
import {
  eligible,
  readLedger,
  recordUse,
  usesInQuarter,
} from "@/lib/social-growth/exposure";
import { nextSlot, parseWindow } from "./schedule-queue";
import { SYN_TIMING_WINDOWS } from "@/config/social-growth/cadence";
import {
  claimImage,
  conflictingUses,
  imageIsFresh,
  readMediaLedger,
  titleMatchesArtwork,
} from "@/lib/social-growth/media-registry";
import { selectFbImage } from "./publish/facebook";
import { parseArtworkIds, visualSpec } from "./build-visuals";
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
  ig.hashtags.length >= 1 && ig.hashtags.length <= 3,
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
check("hashtag pool bounded", suggestHashtags("comparison").length <= 3);

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

// Media registry: one image, one contentId.
const tmpMedia = join(tmpdir(), `media-test-${Date.now()}.json`);
check(
  "fresh ledger empty",
  Object.keys(readMediaLedger(tmpMedia)).length === 0,
);
claimImage(
  "https://cdn/x/1.jpg",
  {
    issue: 1,
    contentId: "a-01",
    channel: "facebook",
    date: "2026-10-09T00:00:00Z",
  },
  tmpMedia,
);
check(
  "same contentId re-claim ok",
  imageIsFresh(readMediaLedger(tmpMedia), "https://cdn/x/1.jpg", "a-01"),
);
check(
  "other contentId blocked",
  conflictingUses(readMediaLedger(tmpMedia), "https://cdn/x/1.jpg", "b-02")
    .length === 1,
);
let threw = false;
try {
  claimImage(
    "https://cdn/x/1.jpg",
    {
      issue: 2,
      contentId: "b-02",
      channel: "facebook",
      date: "2026-10-09T00:00:00Z",
    },
    tmpMedia,
  );
} catch {
  threw = true;
}
check("claim throws on duplicate", threw);

// FB image selection: JPEG/PNG only, never AVIF, never empty.
check(
  "fb picks jpeg",
  selectFbImage(["https://cdn/x/1.jpg"]) === "https://cdn/x/1.jpg",
);
check(
  "fb picks png",
  selectFbImage(["https://cdn/x/1.png?x=1"]) === "https://cdn/x/1.png?x=1",
);
check(
  "fb rejects avif",
  selectFbImage(["https://api.synthetic.pics/image/a.avif"]) === undefined,
);
check("fb rejects empty", selectFbImage([]) === undefined);

// Title/artwork relevance.
check(
  "matching title passes",
  titleMatchesArtwork("Mono month: three black-and-white studies", [
    "expectation monochromatic study calligraphic beams",
  ]),
);
check(
  "unrelated title fails",
  !titleMatchesArtwork("Weekend drop: 3 warm minimal pieces", [
    "filaments brutalist abstraction branching",
  ]),
);

// Visual builder parsing + specs.
check(
  "artwork ids parsed",
  JSON.stringify(
    parseArtworkIds(
      "Gallery artworks: 2026-10-09-foo-bar-12345.avif, 2026-10-08-baz-67890",
    ),
  ) === JSON.stringify(["2026-10-09-foo-bar-12345", "2026-10-08-baz-67890"]),
);
const igSpec = visualSpec("instagram", "syn-x-01", 99);
check(
  "ig spec trio",
  igSpec.count === 3 &&
    igSpec.size === "1080x1350" &&
    igSpec.dir === "public/ig/syn-x-01-99",
);
const fbSpec = visualSpec("facebook", "syn-fb-01", 100);
check(
  "fb spec single",
  fbSpec.count === 1 &&
    fbSpec.size === "1200x630" &&
    fbSpec.dir === "public/fb/syn-fb-01-100",
);

// Copy budgets (short, specific, human).
check("hook max 100 chars", COPY_BUDGETS.hookMaxChars === 100);
check("ig max 3 tags", COPY_BUDGETS.instagramMaxTags === 3);
check("cta max 4 words", COPY_BUDGETS.ctaMaxWords === 4);
check("word count", countWords("  Branching filaments in ochre  ") === 4);

// Reshare bridge: short, factual, no boilerplate.
const rs = buildReshareBody({
  sourceIssue: 154,
  sourceContentId: "syn-fb-warm-03",
  sourceApp: "synthetic-pics",
  sourcePlatform: "facebook",
  sourcePermalink: "https://www.facebook.com/101092449202509_x",
  hook: "Ochre field: warmth for calm shelves.",
  body: "Branching filaments in ochre over warm ground.",
  cta: "Explore the gallery",
  destinationBase: "https://www.synthetic.pics",
  images: ["https://www.pantaleone.net/fb/syn-fb-warm-03-154/1.jpg"],
  targetPlatform: "facebook",
});
check(
  "reshare hook is source hook verbatim",
  rs.body.includes("`Ochre field: warmth for calm shelves.`"),
  rs.title,
);
check(
  "reshare no boilerplate opener",
  !rs.body.includes("From what I'm building"),
);
check(
  "reshare no boilerplate closer",
  !rs.body.includes("kept for the gallery wall"),
);
check(
  "reshare short factual bridge",
  rs.body.includes("Via @syntheticpics."),
  rs.body.slice(-160),
);
check(
  "reshare keeps Reshare-Of",
  rs.body.includes("**Reshare-Of:** `#154/syn-fb-warm-03`"),
);
check("reshare keeps Original-Post", rs.body.includes("**Original-Post:**"));
check(
  "reshare keeps UTM naming",
  rs.campaign.startsWith("PNT_FB_") && rs.creative.endsWith("_RS_V1"),
);

// Copy audit: pass / warn / fail (never rewrites).
async function auditTests(): Promise<void> {
  const auditPass = await auditSocialCopy({
    hook: "Ochre field: branching filaments study",
    body: "Small architectural study in warm tones today.",
    cta: "Explore the gallery",
    platform: "facebook",
    sourceAsset:
      "Gallery artwork: 2026-09-11-ochre-field-architectural-abstraction-branching-filaments-42985404",
  });
  check(
    "audit pass clean copy",
    auditPass.verdict === "pass",
    auditPass.reasons.join(" | "),
  );
  check("audit engine on", auditPass.engineUsed === true);
  check(
    "audit word counts",
    auditPass.words.hook === 5 &&
      auditPass.words.body === 7 &&
      auditPass.words.total === 15,
    JSON.stringify(auditPass.words),
  );
  const auditLongHook = await auditSocialCopy({
    hook: `${"word ".repeat(30).trim()} hook that runs far past the hundred character hard maximum for hooks`,
    body: "Short body here today.",
    cta: "Explore the gallery",
    platform: "facebook",
  });
  check(
    "audit fail hook over 100 chars",
    auditLongHook.verdict === "fail",
    auditLongHook.reasons.join(" | "),
  );
  const auditCta = await auditSocialCopy({
    hook: "Ochre field for calm shelves",
    body: "Branching filaments in ochre over warm ground.",
    cta: "Shop the product today now please",
    platform: "facebook",
  });
  check(
    "audit fail CTA over 4 words",
    auditCta.verdict === "fail",
    auditCta.reasons.join(" | "),
  );
  const auditSlop = await auditSocialCopy({
    hook: "Unlock the future of wall art",
    body: "Branching filaments in ochre over warm ground.",
    cta: "Explore the gallery",
    platform: "facebook",
  });
  check(
    "audit fail banned phrases",
    auditSlop.verdict === "fail",
    auditSlop.reasons.join(" | "),
  );
  const auditTags = await auditSocialCopy({
    hook: "Ochre field for calm shelves",
    body: "Branching filaments in ochre over warm ground.",
    cta: "Explore the gallery",
    platform: "facebook",
    hashtags: ["wallart"],
  });
  check(
    "audit fail FB hashtags",
    auditTags.verdict === "fail",
    auditTags.reasons.join(" | "),
  );
  const auditMismatch = await auditSocialCopy({
    hook: "Weekend drop",
    body: "Short notes on warm minimal pieces.",
    cta: "Explore the gallery",
    platform: "facebook",
    sourceAsset: "Gallery artworks: 2026-10-09-foo-bar-12345.avif",
  });
  check(
    "audit fail asset mismatch",
    auditMismatch.verdict === "fail",
    auditMismatch.reasons.join(" | "),
  );
  const auditWarnBody = await auditSocialCopy({
    hook: "Ochre field for calm shelves",
    body: "Branching filaments in ochre over warm ground with quiet depth and balance for calm rooms tonight",
    cta: "Explore the gallery",
    platform: "facebook",
  });
  check(
    "audit warn long body still proceeds",
    auditWarnBody.verdict === "warn",
    auditWarnBody.reasons.join(" | "),
  );
  const auditQuestion = await auditSocialCopy({
    hook: "Which palette owns your room?",
    body: "Three warm studies side by side.",
    cta: "Explore the gallery",
    platform: "facebook",
  });
  check(
    "audit warn forced question",
    auditQuestion.verdict === "warn",
    auditQuestion.reasons.join(" | "),
  );
  const auditRepeat = await auditSocialCopy({
    hook: "Ochre field for calm shelves",
    body: "Branching filaments in ochre over warm ground.",
    cta: "Explore the gallery",
    platform: "facebook",
    recentTexts: [
      "Warm minimal pieces for quiet rooms Branching filaments in ochre over warm ground.",
    ],
  });
  check(
    "audit warn repeated phrase",
    auditRepeat.verdict === "warn",
    auditRepeat.reasons.join(" | "),
  );
}

// Nightly synthetic grid: 23 slots/week, Tue-Thu heavy, staggered platforms.
const synIg = SYN_TIMING_WINDOWS.instagram ?? [];
const synFb = SYN_TIMING_WINDOWS.facebook ?? [];
check("syn IG 13 slots", synIg.length === 13);
check("syn FB 10 slots", synFb.length === 10);
const tueIg = synIg.filter((s) => s.startsWith("Tue")).length;
const tueFb = synFb.filter((s) => s.startsWith("Tue")).length;
check("syn Tue heavy", tueIg === 3 && tueFb === 2, `ig=${tueIg} fb=${tueFb}`);
const days = new Set(
  [...synIg, ...synFb].map((s): string => s.split(" ")[0] ?? ""),
);
check(
  "syn posts every day",
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].every((d) => days.has(d)),
);
check(
  "syn platforms staggered (no shared day+hour)",
  (() => {
    const key = (s: string) => {
      const [d, h] = s.split(" ");
      return `${d}@${h}`;
    };
    const ig = new Set(synIg.map(key));
    return synFb.every((s) => !ig.has(key(s)));
  })(),
);
const monSlot = parseWindow("Mon 12:00 ET");
check(
  "syn Mon noon parses",
  monSlot.day === 1 && monSlot.hour === 12 && monSlot.minute === 0,
);

auditTests().then(
  () => {
    if (failures > 0) {
      console.error(`\nsocial-test: ${failures} failure(s)`);
      process.exit(1);
    }
    console.log("\nsocial-test: all passing");
  },
  (e) => {
    console.error(`\nsocial-test: audit tests threw: ${(e as Error).message}`);
    process.exit(1);
  },
);
