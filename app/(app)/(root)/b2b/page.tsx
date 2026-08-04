import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

const PAGE = "B2B";
const page = HEAD.find((p: HeadType) => p.page === PAGE) as HeadType;

export const metadata: Metadata = {
  title:
    page?.title ?? "Enterprise AI Solutions | Pantaleone Digital",
  description:
    page?.description ??
    "Transform your enterprise with strategic AI implementation. From automation to agentic systems.",
  metadataBase: new URL(getBaseUrl(page?.slug ?? "/b2b")),
  alternates: {
    canonical: getBaseUrl(page?.slug ?? "/b2b"),
  },
};

interface Benefit {
  title: string;
  description: string;
  icon: string;
}

const benefits: Benefit[] = [
  {
    title: "Reduce Operational Costs",
    description:
      "Automate repetitive tasks and streamline workflows to cut operational expenses by 30-60%.",
    icon: "💰",
  },
  {
    title: "Scale Without Hiring",
    description:
      "Deploy AI agents that handle complex workflows 24/7, allowing your team to focus on strategic initiatives.",
    icon: "📈",
  },
  {
    title: "Accelerate Decision Making",
    description:
      "Implement intelligent systems that process data in real-time and provide actionable insights.",
    icon: "⚡",
  },
  {
    title: "Future-Proof Your Business",
    description:
      "Build AI capabilities that evolve with technology, ensuring long-term competitive advantage.",
    icon: "🔮",
  },
];

function getB2BJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Enterprise AI Solutions",
    description: metadata.description,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
}

export default function B2BPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getB2BJsonLd()),
        }}
      />
      <main className="mx-auto flex flex-col">
        {/* Hero Section */}
        <div className="relative py-16 px-6 text-center">
          <Heading
            title="Enterprise AI Transformation"
            textStyleClassName="text-4xl font-bold md:text-5xl"
            gridId="grid-b2b"
          />
          <SeparatorHorizontal short={true} />
          <div className="prose dark:prose-invert mx-auto max-w-3xl">
            <p className="text-xl text-muted-foreground mb-8">
              Transform your organization with strategic AI implementation.
              From process automation to autonomous agents, I help enterprises
              build intelligent systems that drive measurable business outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact?b2b=true"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Schedule Enterprise Consultation
              </Link>
              <Link
                href="/resources/ai-readiness-guide"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Download AI Readiness Guide
              </Link>
            </div>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        {/* Benefits Grid */}
        <div className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">
              Why Enterprises Choose Pantaleone Digital
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="text-3xl mb-4">{benefit.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        {/* Case Study Section */}
        <div className="py-16 px-6 bg-muted">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8">
              Proven Results Across Industries
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  40%
                </div>
                <p className="text-muted-foreground">
                  Average cost reduction in automated processes
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  3x
                </div>
                <p className="text-muted-foreground">
                  Faster decision-making with AI-powered analytics
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  24/7
                </div>
                <p className="text-muted-foreground">
                  Continuous operation with autonomous AI agents
                </p>
              </div>
            </div>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        {/* Services Overview */}
        <div className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8">
              Enterprise AI Services
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  AI Strategy & Assessment
                </h3>
                <p className="text-muted-foreground">
                  Comprehensive audit of your operations with a prioritized
                  automation roadmap and ROI projections.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Custom AI Development
                </h3>
                <p className="text-muted-foreground">
                  Build bespoke AI agents, automation workflows, and
                  intelligent systems tailored to your business needs.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Enterprise Integration
                </h3>
                <p className="text-muted-foreground">
                  Seamless integration with existing enterprise tools, CRMs,
                  and business systems.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Training & Enablement
                </h3>
                <p className="text-muted-foreground">
                  Empower your team with AI literacy workshops and hands-on
                  training programs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        {/* CTA Section */}
        <div className="py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">
              Ready to Transform Your Enterprise?
            </h2>
            <p className="text-muted-foreground mb-8">
              Start with a free discovery call to discuss your AI transformation
              goals. No sales pitch, just strategic advice.
            </p>
            <Link
              href="/contact?b2b=true"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Book Free Discovery Call
            </Link>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}