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
    page?.title ?? "AI work for teams | Pantaleone Digital",
  description:
    page?.description ??
    "N8N workflows, LangChain pipelines, and LLM integrations for teams. Audit, build, and handoff.",
  metadataBase: new URL(getBaseUrl(page?.slug ?? "/b2b")),
  alternates: {
    canonical: getBaseUrl(page?.slug ?? "/b2b"),
  },
};

interface Benefit {
  title: string;
  description: string;
}

const benefits: Benefit[] = [
  {
    title: "Fewer repetitive tickets",
    description:
      "N8N workflows take the copy-paste work: intake, triage, filing. Your team handles the exceptions.",
  },
  {
    title: "Coverage without night shifts",
    description:
      "Agents run the documented path on schedule and log every run. Humans review the log, not the inbox.",
  },
  {
    title: "Answers from your docs",
    description:
      "RAG over your runbooks and tickets. Every answer cites the source file it came from.",
  },
  {
    title: "Systems you can keep running",
    description:
      "You get the repo, the workflow JSON, and a runbook. No black box to rebuy next year.",
  },
];

function getB2BJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AI work for teams",
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
            title="AI work for teams"
            textStyleClassName="text-4xl font-bold md:text-5xl"
            gridId="grid-b2b"
          />
          <SeparatorHorizontal short={true} />
          <div className="prose dark:prose-invert mx-auto max-w-3xl">
            <p className="text-xl text-muted-foreground mb-8">
              I audit one workflow, build the automation with you, and hand
              over the repo and runbook. N8N and LangChain, wired to the
              tools you already pay for.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact?b2b=true"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Book a call
              </Link>
              <Link
                href="/resources/ai-readiness-guide"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Read the AI readiness guide
              </Link>
            </div>
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        {/* Benefits Grid */}
        <div className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">
              What the work covers
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                >
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

        {/* How we measure */}
        <div className="py-16 px-6 bg-muted">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-8">
              How we measure it
            </h2>
            <p className="text-muted-foreground mb-8">
              No pre-baked percentages. We pick one baseline before the build
              — median handling time, tickets closed per week, or hours spent
              on manual entry — and compare four weeks after handoff.
            </p>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  —
                </div>
                <p className="text-muted-foreground">
                  Baseline handling time, set before the build
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  —
                </div>
                <p className="text-muted-foreground">
                  Runs logged per week, with error rate
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  —
                </div>
                <p className="text-muted-foreground">
                  Handoff pack: repo, workflow JSON, runbook
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
              Services
            </h2>
            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Workflow audit
                </h3>
                <p className="text-muted-foreground">
                  Two weeks watching one process. You get a ranked list of
                  automatable steps with time cost attached.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Agent and pipeline builds
                </h3>
                <p className="text-muted-foreground">
                  N8N or LangChain builds against your APIs, with retries,
                  logging, and a kill switch.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Integration with your stack
                </h3>
                <p className="text-muted-foreground">
                  Connects to your CRM, helpdesk, and warehouse. Credentials
                  stay in your vault.
                </p>
              </div>
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold mb-2">
                  Team handoff
                </h3>
                <p className="text-muted-foreground">
                  Two working sessions where your team runs the system while
                  I watch. Then the runbook is yours.
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
              Talk through one workflow
            </h2>
            <p className="text-muted-foreground mb-8">
              Bring the process that eats your week. We scope it in 30
              minutes. No pitch deck.
            </p>
            <Link
              href="/contact?b2b=true"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Book a call
            </Link>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}