// Shared automation policy tests (deterministic, offline).
// Run: npx tsx scripts/automation-policy-test.ts
import { strict as assert } from "node:assert";
import { evaluatePolicy, qaCheck, socialChecks } from "@/lib/automation/policy";

let passed = 0;
function ok(name: string, fn: () => void): void {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const base = {
  open: true,
  packetReady: true,
  proofPresent: false,
  credsPresent: true,
  imagesPresent: true,
  mediaConflict: false,
  capReached: false,
  duplicateInProgress: false,
};

ok("allow: fully eligible social publish (approval present)", () => {
  const d = evaluatePolicy({
    system: "social",
    channel: "facebook",
    rule: "gallery-live",
    autonomyLevel: 2,
    approvalPresent: true,
    checks: socialChecks(base),
  });
  assert.equal(d.decision, "allow");
  assert.equal(d.retryEligible, false);
});

ok("deny: closed issue", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, open: false }),
  });
  assert.equal(d.decision, "deny");
  assert.ok(d.reasonCodes.some((c) => c.startsWith("issue-open")));
});

ok("deny: existing proof (no double-publish)", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, proofPresent: true }),
  });
  assert.equal(d.decision, "deny");
});

ok("deny: missing packet", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, packetReady: false }),
  });
  assert.equal(d.decision, "deny");
});

ok("deny: missing credentials", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, credsPresent: false }),
  });
  assert.equal(d.decision, "deny");
});

ok("deny: duplicate media", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, mediaConflict: true }),
  });
  assert.equal(d.decision, "deny");
});

ok("deny: QA below 55 blocks even when all else passes", () => {
  const d = evaluatePolicy({
    system: "campaign",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: [...socialChecks(base), qaCheck(42)],
  });
  assert.equal(d.decision, "deny");
});

ok("needs_review: QA 55-79 requires revision", () => {
  const d = evaluatePolicy({
    system: "campaign",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: [...socialChecks(base), qaCheck(70)],
  });
  assert.equal(d.decision, "needs_review");
});

ok("needs_review: L1/L2 without approval", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 2,
    approvalPresent: false,
    checks: socialChecks(base),
  });
  assert.equal(d.decision, "needs_review");
  assert.ok(d.reasonCodes.includes("approval:absent-l1l2"));
});

ok("allow: L3 with same eligible inputs (autonomy preserved)", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: false,
    checks: socialChecks(base),
  });
  assert.equal(d.decision, "allow");
});

ok("retry_later: cap reached", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, capReached: true }),
  });
  assert.equal(d.decision, "retry_later");
  assert.equal(d.retryEligible, true);
});

ok("retry_later: conflicting job in progress", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, duplicateInProgress: true }),
  });
  assert.equal(d.decision, "retry_later");
});

ok("needs_review: ambiguous unknown evidence", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, imagesPresent: null }),
  });
  assert.equal(d.decision, "needs_review");
});

ok("deterministic: repeated evaluation is identical", () => {
  const input = {
    system: "social" as const,
    autonomyLevel: 3 as const,
    approvalPresent: true,
    checks: socialChecks(base),
  };
  const a = evaluatePolicy(input);
  const b = evaluatePolicy(input);
  assert.equal(a.decision, b.decision);
  assert.deepEqual(a.reasonCodes, b.reasonCodes);
  assert.equal(a.policy, b.policy);
});

ok("conflicting conditions: hard deny wins over soft retry", () => {
  const d = evaluatePolicy({
    system: "social",
    autonomyLevel: 3,
    approvalPresent: true,
    checks: socialChecks({ ...base, open: false, capReached: true }),
  });
  assert.equal(d.decision, "deny");
  assert.equal(d.retryEligible, false);
});

console.log(`\nautomation-policy-test: ${passed} assertions passed`);
