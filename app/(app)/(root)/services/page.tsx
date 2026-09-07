import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

const PAGE = "Services";
const page = HEAD.find((p: HeadType) => p.page === PAGE) as HeadType;

export const metadata: Metadata = {
  title: page?.title ?? "Services and pricing | Pantaleone Digital",
  description:
    page?.description ??
    "Fixed-price workflow audit, monthly build engagement, and retainer. N8N, LangChain, and Next.js.",
  metadataBase: new URL(getBaseUrl(page?.slug ?? "/services")),
  alternates: {
    canonical: getBaseUrl(page?.slug ?? "/services"),
  },
};

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Workflow audit",
    price: "$2,500",
    period: "one-time",
    description:
      "Two weeks on one process. You get time costs per step and a ranked build list.",
    features: [
      "One process mapped end to end",
      "Time cost per manual step",
      "Ranked list of automatable steps",
      "Build vs. skip recommendation",
      "90-minute walkthrough call",
    ],
    cta: "Start with an audit",
    href: "/contact?assessment=true",
  },
  {
    name: "Build engagement",
    price: "$8,500",
    period: "per month",
    description:
      "I build the top-ranked workflow against your APIs, with logs and handoff.",
    features: [
      "Everything in the workflow audit",
      "N8N or LangChain build",
      "Wired to your CRM, helpdesk, or warehouse",
      "Retries, logging, and a kill switch",
      "Weekly 30-minute review",
      "30-day fix window after handoff",
    ],
    cta: "Book a build call",
    href: "/contact?implementation=true",
    highlighted: true,
  },
  {
    name: "Retainer",
    price: "Custom",
    period: "per quarter",
    description:
      "For teams with a queue of workflows. We work it down, one system at a time.",
    features: [
      "Named engineer (Matt)",
      "One active build at a time",
      "Shared backlog, re-ranked monthly",
      "Two team working sessions per build",
      "Runbook per system",
      "Email support on business days",
    ],
    cta: "Ask about a retainer",
    href: "/contact?enterprise=true",
  },
];

function getPricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI workflow audit and builds",
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    areaServed: "US",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AI Consulting Tiers",
      itemListElement: pricingTiers.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        price: tier.price,
        priceCurrency: "USD",
        description: tier.description,
      })),
    },
  };
}

export default function ServicesPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getPricingJsonLd()),
        }}
      />
      <main className="mx-auto flex flex-col">
        <Heading
          title="Services and pricing"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-services"
        />
        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <p className="text-lg mb-8">
            One workflow at a time. Audit first, then build, then hand over
            the repo and runbook. If the audit says don’t build, you keep
            the ranked list.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto px-6 pb-16">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col border rounded-lg p-6 ${
                tier.highlighted
                  ? "border-primary shadow-lg relative"
                  : "border-border"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">{tier.price}</span>
                <span className="text-muted-foreground ml-1">
                  / {tier.period}
                </span>
              </div>
              <p className="text-muted-foreground mb-6">{tier.description}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      className="h-5 w-5 text-primary mr-2 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <h2 className="text-2xl font-semibold mb-4">How I work</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>One process per engagement</strong> — we finish the
              intake-to-filed path before starting the next one
            </li>
            <li>
              <strong>You keep the artifacts</strong> — repo, workflow JSON,
              credentials map, and runbook
            </li>
            <li>
              <strong>Logged runs</strong> — every automated run writes a log
              you can read without me
            </li>
            <li>
              <strong>Kill switch</strong> — every build ships with a way to
              turn it off
            </li>
          </ul>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <p className="text-center mb-4">
              <strong>Not sure which tier fits?</strong>
            </p>
            <p className="text-center text-muted-foreground mb-4">
              Bring one workflow to a 30-minute call. We scope it or rule it out.
            </p>
            <div className="flex justify-center">
              <Link
                href="/contact?book=true"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Book a 30-minute call
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}