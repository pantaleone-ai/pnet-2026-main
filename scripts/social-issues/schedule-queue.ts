// Assign IG/FB publishing windows to packet-ready synthetic.pics issues.
// Run: npx tsx scripts/social-issues/schedule-queue.ts [--dry-run] [--write]
// Dry-run prints the slot table and writes nothing. --write stamps
// **Publish at:** + the status:scheduled label (explicit approval gate).
// Windows come from config/social-growth/cadence.ts — edit config, not code.
import { TIMING_WINDOWS } from "@/config/social-growth/cadence";
import { gh, ghJson } from "../content-issues/gh";

const ET_ZONE = "America/New_York";

interface IssueRef {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  body: string;
  comments: Array<{ body: string }>;
}

const DAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function parseWindow(spec: string): {
  day: number;
  hour: number;
  minute: number;
} {
  const m = spec.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{1,2}):(\d{2})/);
  const day = m && m[1] ? DAYS[m[1] as keyof typeof DAYS] : undefined;
  if (!m || day === undefined || !m[2] || !m[3])
    throw new Error(`bad window ${spec}`);
  return { day, hour: Number(m[2]), minute: Number(m[3]) };
}

/** Next occurrence of a weekday@time in ET, strictly after `from`. */
export function nextSlot(
  window: { day: number; hour: number; minute: number },
  from: Date = new Date(),
): Date {
  for (let add = 0; add < 8; add += 1) {
    const probe = new Date(from.getTime() + add * 86400000);
    const etParts = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_ZONE,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(probe);
    const wd = etParts.find((p) => p.type === "weekday")?.value ?? "";
    const wdNum = DAYS[wd.slice(0, 3)] ?? -1;
    // Candidate: same calendar day in ET at window time.
    const etDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: ET_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(probe);
    const candidate = new Date(
      `${etDate}T${String(window.hour).padStart(2, "0")}:${String(window.minute).padStart(2, "0")}:00-04:00`,
    );
    void wdNum;
    if (add === 0 && candidate <= from) continue;
    // Verify weekday of the candidate in ET.
    const candWd = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_ZONE,
      weekday: "short",
    }).format(candidate);
    if (DAYS[candWd.slice(0, 3)] === window.day && candidate > from)
      return candidate;
  }
  throw new Error("no slot found in 8 days");
}

function hasProof(issue: IssueRef): boolean {
  return issue.comments.some((c) => c.body.includes("Platform publish proof"));
}

function main(): void {
  const write = process.argv.includes("--write");
  const now = new Date();
  const issues = ghJson<IssueRef[]>([
    "issue",
    "list",
    "--label",
    "social",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "number,title,labels,body,comments",
  ]);
  const taken = new Set<string>();
  for (const issue of issues) {
    const pub = issue.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1];
    if (pub && new Date(pub) > now) taken.add(pub);
  }
  const eligible = issues.filter((i) => {
    const names = i.labels.map((l) => l.name);
    if (
      !names.includes("site:synthetic-pics") ||
      !names.includes("status:packet-ready")
    )
      return false;
    if (hasProof(i)) return false;
    if (names.includes("platform:pinterest")) return false;
    const pub = i.body.match(/\*\*Publish at:\*\*\s*`([^`]+)`/)?.[1];
    if (pub && new Date(pub) > now) return false;
    if (names.includes("platform:instagram") && !/\*\*Images:\*\*/.test(i.body))
      return false;
    return true;
  });
  const table: Array<{ issue: number; platform: string; slot: string }> = [];
  const used = new Set<string>(taken);
  for (const issue of eligible) {
    const names = issue.labels.map((l) => l.name);
    const platform = names.includes("platform:instagram")
      ? "instagram"
      : "facebook";
    const windows = (TIMING_WINDOWS[platform] ?? []).map(parseWindow);
    let slot: Date | undefined;
    for (let round = 0; round < 4 && !slot; round += 1) {
      for (const w of windows) {
        const base = new Date(now.getTime() + round * 7 * 86400000);
        const cand = nextSlot(w, base);
        if (!used.has(cand.toISOString())) {
          slot = cand;
          break;
        }
      }
    }
    if (!slot) {
      console.log(`no-slot - #${issue.number} ${issue.title}`);
      continue;
    }
    used.add(slot.toISOString());
    table.push({ issue: issue.number, platform, slot: slot.toISOString() });
  }
  if (!write) {
    console.log("slot table (dry-run, nothing written)");
    for (const row of table)
      console.log(`#${row.issue} ${row.platform} -> ${row.slot}`);
    if (table.length === 0) console.log("(no eligible issues)");
    return;
  }
  for (const row of table) {
    const body = gh([
      "issue",
      "view",
      String(row.issue),
      "--json",
      "body",
      "--jq",
      ".body",
    ]);
    const stamped = /\*\*Publish at:\*\*/.test(body)
      ? body.replace(/(\*\*Publish at:\*\*\s*)`[^`]*`/, `$1\`${row.slot}\``)
      : `${body}\n**Publish at:** \`${row.slot}\`\n`;
    gh(["issue", "edit", String(row.issue), "--body-file", "-"], stamped);
    gh(["issue", "edit", String(row.issue), "--add-label", "status:scheduled"]);
    console.log(`scheduled - #${row.issue} ${row.platform} -> ${row.slot}`);
  }
}

const isMain = (process.argv[1] ?? "").endsWith("schedule-queue.ts");
if (isMain) main();
