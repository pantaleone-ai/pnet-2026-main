// Shared helpers for the content-issues queue scripts.
// Wraps the `gh` CLI (available on GitHub Actions runners and local dev).
// Never imported by the Vercel runtime — CI/local only.
import { execFileSync } from "node:child_process";

/** Run `gh` and return trimmed stdout. Throws on non-zero exit. */
export function gh(args: string[], input?: string): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

/** Run `gh` and parse stdout as JSON. */
export function ghJson<T>(args: string[]): T {
  return JSON.parse(gh(args)) as T;
}

export interface IssueRef {
  number: number;
  title: string;
  labels: Array<{ name: string }>;
  createdAt: string;
  updatedAt: string;
  body: string;
}

export function labelNames(issue: IssueRef): string[] {
  return issue.labels.map((l) => l.name);
}

export function hasLabel(issue: IssueRef, name: string): boolean {
  return labelNames(issue).includes(name);
}

/** Priority rank from issue labels. Lower wins. Unknown defaults to P3 rank. */
export function priorityRank(issue: IssueRef): number {
  const names = labelNames(issue);
  if (names.includes("P0")) return 0;
  if (names.includes("P1")) return 1;
  if (names.includes("P2")) return 2;
  return 3;
}

/** kebab-case slug from a title. Strips the leading [Content] marker. */
export function slugifyTitle(title: string): string {
  return title
    .replace(/^\[content\]\s*/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Extract the `**Target slug:** `value` line from a seeded issue body, if present. */
export function parseTargetSlug(body: string): string | undefined {
  const match = body.match(/\*\*Target slug:\*\*\s*`([^`]+)`/);
  const slug = match?.[1]?.trim();
  return slug ? slug : undefined;
}

/** Target branch for an issue: content/<issue>-<slug>. */
export function targetBranch(issue: IssueRef): string {
  const slug =
    parseTargetSlug(issue.body) || slugifyTitle(issue.title) || "untitled";
  return `content/${issue.number}-${slug}`;
}

export function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}
