import { describe, expect, it } from "vitest";

import {
  ANNUAL_FREE_MONTHS,
  CHAT_PLANS,
  annualEffectiveMonthly,
  annualPrice,
  annualSavings,
  formatUSD,
  getChatPlan,
  isValidPlanId,
  marketableFeatures,
  signupHref,
  type BillingPeriod,
} from "./plans";

describe("chat plans", () => {
  it("has exactly the four commercial tiers, one highlighted", () => {
    expect(CHAT_PLANS.map((p) => p.id)).toEqual([
      "starter",
      "growth",
      "pro",
      "agency",
    ]);
    expect(CHAT_PLANS.filter((p) => p.highlighted)).toHaveLength(1);
    expect(getChatPlan("growth").highlighted).toBe(true);
  });

  it("annual is 10x monthly (2 months free) with whole-dollar savings", () => {
    expect(ANNUAL_FREE_MONTHS).toBe(2);
    for (const plan of CHAT_PLANS) {
      expect(annualPrice(plan)).toBe(plan.monthlyPrice * 10);
      expect(annualSavings(plan)).toBe(plan.monthlyPrice * 2);
      expect(annualEffectiveMonthly(plan)).toBeCloseTo(
        (plan.monthlyPrice * 10) / 12,
        5,
      );
    }
    // Spot values from the commercial spec.
    expect(annualPrice(getChatPlan("starter"))).toBe(290);
    expect(annualPrice(getChatPlan("growth"))).toBe(790);
    expect(annualPrice(getChatPlan("pro"))).toBe(1990);
    expect(annualPrice(getChatPlan("agency"))).toBe(4990);
  });

  it("AI reply allowances match the spec and pool per plan", () => {
    expect(getChatPlan("starter").limits.aiRepliesPerMonth).toBe(1000);
    expect(getChatPlan("growth").limits.aiRepliesPerMonth).toBe(4000);
    expect(getChatPlan("pro").limits.aiRepliesPerMonth).toBe(12000);
    expect(getChatPlan("agency").limits.aiRepliesPerMonth).toBe(40000);
  });

  it("never markets unbuilt agency capabilities", () => {
    const agency = getChatPlan("agency");
    const marketed = marketableFeatures(agency).map((f) => f.label);
    for (const label of marketed) {
      expect(label.toLowerCase()).not.toMatch(/white-label/);
    }
    expect(
      marketed.some((l) => /client-level management/i.test(l)),
    ).toBe(false);
    expect(
      marketed.some((l) => /cross-client analytics/i.test(l)),
    ).toBe(false);
    // …but the roadmap still tracks them internally.
    expect(
      agency.features.filter((f) => !f.available && f.planned),
    ).toHaveLength(3);
  });

  it("routes signup CTAs with plan + billing, contact CTAs untouched", () => {
    expect(signupHref(getChatPlan("starter"), "monthly")).toBe(
      "/signup?plan=starter&billing=monthly",
    );
    const annual: BillingPeriod = "annual";
    expect(
      signupHref(getChatPlan("growth"), annual, "acme.com"),
    ).toBe("/signup?plan=growth&billing=annual&website=acme.com");
    expect(signupHref(getChatPlan("agency"), "monthly")).toBe(
      "/contact?enterprise=true",
    );
  });

  it("rejects unknown plan ids and throws on lookup", () => {
    expect(isValidPlanId("growth")).toBe(true);
    expect(isValidPlanId("enterprise")).toBe(false);
    expect(isValidPlanId(null)).toBe(false);
    expect(() => getChatPlan("enterprise")).toThrow();
  });

  it("formats prices for display", () => {
    expect(formatUSD(29)).toBe("$29");
    expect(formatUSD(4990)).toBe("$4,990");
  });
});
