import { describe, expect, it } from "vitest";

import {
  checkMessageAllowance,
  countMonthlyReplies,
  getEntitlement,
  isBillingLive,
  priceIdFor,
} from "./billing";
import { isUniqueViolation } from "./db";

describe("priceIdFor", () => {
  it("returns null until the owner attaches Stripe prices", () => {
    expect(priceIdFor("starter", "monthly")).toBeNull();
    expect(priceIdFor("growth", "annual")).toBeNull();
  });

  it("rejects unknown plans", () => {
    expect(() => priceIdFor("enterprise" as never, "monthly")).toThrow();
  });
});

describe("isBillingLive", () => {
  it("stays off without keys or prices", () => {
    expect(
      isBillingLive({ appUrl: "https://example.com" }),
    ).toBe(false);
    expect(
      isBillingLive({
        stripeSecretKey: "sk_test_x",
        webhookSecret: "whsec_x",
        appUrl: "https://example.com",
      }),
    ).toBe(false);
  });
});

describe("isUniqueViolation", () => {
  it("matches direct and wrapped uniqueness errors", () => {
    expect(isUniqueViolation(new Error("UNIQUE constraint failed: x.id"))).toBe(true);
    const wrapped = new Error("Failed query: insert into t") as Error & { cause?: unknown };
    wrapped.cause = new Error("UNIQUE constraint failed: t.id");
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(new Error("Connection reset"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});
describe("entitlements without a subscription", () => {
  // Minimal stand-in: every query resolves to no rows.
  function fakeDb() {
    const rows = async () => [] as never[];
    const afterWhere = {
      limit: rows,
      then: (resolve: (v: never[]) => unknown) => resolve([] as never[]),
    };
    const chain = { from: () => ({ where: () => afterWhere }) };
    return { select: () => chain } as never;
  }

  it("returns null entitlement and zero usage when nothing exists", async () => {
    const db = fakeDb();
    expect(await getEntitlement(db, "org-1")).toBeNull();
    expect(await countMonthlyReplies(db, "org-1")).toBe(0);
  });

  it("allows everything while billing is not live (early access)", async () => {
    const db = fakeDb();
    const allowance = await checkMessageAllowance(
      db,
      { appUrl: "https://example.com" },
      "org-1",
    );
    expect(allowance.allowed).toBe(true);
    expect(allowance.planId).toBeNull();
  });
});
