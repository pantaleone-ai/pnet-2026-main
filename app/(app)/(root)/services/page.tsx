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
  title: page?.title ?? "AI Consulting Services | Pantaleone Digital",
  description:
    page?.description ??
    "Enterprise AI consulting, automation strategy, and implementation services.",
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
    name: "AI Strategy Assessment",
    price: "$2,500",
    period: "one-time",
    description:
      "Comprehensive audit of your business processes with AI opportunity mapping.",
    features: [
      "Full business process audit",
      "AI readiness scoring",
      "Priority automation roadmap",
      "ROI projection report",
      "90-minute strategy session",
    ],
    cta: "Get Started",
    href: "/contact?assessment=true",
  },
  {
    name: "Implementation Partner",
    price: "$8,500",
    period: "per month",
    description:
      "End-to-end AI implementation with dedicated engineering support.",
    features: [
      "Everything in Strategy Assessment",
      "Custom AI agent development",
      "Workflow automation design",
      "Integration with existing tools",
      "Weekly progress reviews",
      "30-day post-launch support",
    ],
    cta: "Schedule Call",
    href: "/contact?implementation=true",
    highlighted: true,
  },
  {
    name: "Enterprise Retainer",
    price: "Custom",
    period: "engagement",
    description:
      "Strategic AI partnership for organizations with complex transformation needs.",
    features: [
      "Dedicated AI strategist",
      "Unlimited consultation hours",
      "Priority engineering resources",
      "Custom training workshops",
      "Executive reporting",
      "SLA-backed support",
    ],
    cta: "Contact Us",
    href: "/contact?enterprise=true",
  },
];

function getPricingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Consulting Services",
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
          title="AI Consulting Services"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-services"
        />
        <SeparatorHorizontal short={true} />

        <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
          <p className="text-lg mb-8">
            Transform your business with strategic AI implementation. From
            initial assessment to full-scale deployment, I help organizations
            harness the power of artificial intelligence to drive measurable
            results.
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
          <h2 className="text-2xl font-semibold mb-4">Why Work With Me?</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Practical Focus</strong> — Solutions that solve real
              business problems, not tech demos
            </li>
            <li>
              <strong>Full-Stack Expertise</strong> — From strategy to
              implementation, one point of contact
            </li>
            <li>
              <strong>Proven Results</strong> — Documented ROI from previous
              client engagements
            </li>
            <li>
              <strong>Transparent Process</strong> — Regular updates and clear
              communication throughout
            </li>
          </ul>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <p className="text-center mb-4">
              <strong>Not sure which tier is right for you?</strong>
            </p>
            <p className="text-center text-muted-foreground mb-4">
              Book a free 30-minute discovery call to discuss your needs.
            </p>
            <div className="flex justify-center">
              <Link
                href="/contact?book=true"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Book Free Discovery Call
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