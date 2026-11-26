"use client";

import { useState } from "react";
import Link from "next/link";

import {
  ANNUAL_FREE_MONTHS,
  CHAT_PLANS,
  annualEffectiveMonthly,
  annualPrice,
  annualSavings,
  formatUSD,
  marketableFeatures,
  signupHref,
  type BillingPeriod,
} from "@/config/plans";

/**
 * Plan cards with a monthly/annual toggle. Monthly is the default;
 * annual totals 10x monthly (2 months free). Prices come from
 * `config/plans.ts` — never hardcoded here.
 */
export default function PricingSection() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <div>
      <div
        className="flex justify-center gap-2 mb-8"
        role="group"
        aria-label="Billing period"
      >
        <button
          type="button"
          aria-pressed={billing === "monthly"}
          onClick={() => setBilling("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={billing === "annual"}
          onClick={() => setBilling("annual")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            billing === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Annual · {ANNUAL_FREE_MONTHS} months free
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
        {CHAT_PLANS.map((tier) => {
          const replies = tier.limits.aiRepliesPerMonth.toLocaleString("en-US");
          return (
            <div
              key={tier.id}
              className={`flex flex-col border rounded-lg p-6 ${
                tier.highlighted
                  ? "border-primary shadow-lg relative"
                  : "border-border"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </div>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {tier.buyer}
              </p>
              <h3 className="text-xl font-semibold mt-1 mb-2">{tier.name}</h3>
              <div className="mb-1" aria-live="polite">
                {billing === "monthly" ? (
                  <>
                    <span className="text-3xl font-bold">
                      {formatUSD(tier.monthlyPrice)}
                    </span>
                    <span className="text-muted-foreground ml-1">/ month</span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold">
                      {formatUSD(annualPrice(tier))}
                    </span>
                    <span className="text-muted-foreground ml-1">/ year</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatUSD(annualEffectiveMonthly(tier))}/mo billed
                      annually · save {formatUSD(annualSavings(tier))}
                    </p>
                  </>
                )}
              </div>
              <p className="text-sm font-medium mt-2">
                {replies} AI replies / month
              </p>
              <p className="text-muted-foreground text-sm mt-2 mb-6">
                {tier.positioning}
              </p>
              <ul className="space-y-2 mb-8 flex-1">
                {marketableFeatures(tier).map((feature) => (
                  <li key={feature.label} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature.label}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={signupHref(tier, billing)}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Prices in USD. Annual plans cost 10× the monthly price — two months
        free. <a href="#usage-faq" className="underline underline-offset-4">How usage works</a>
      </p>
    </div>
  );
}
