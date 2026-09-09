import Heading from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Image from "next/image";
import Web from "@/features/about/components/Web";
import LastModified from "@/components/LastModified";
import { siteConfig } from "@/config/site";

export const dynamic = "force-static";

function getMemberJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Matt Pantaleone",
    jobTitle: "Senior AI Engineer & Automation Strategist",
    url: getBaseUrl("/about"),
    image: `${siteConfig.url}/images/horizontal-profile-about.jpg`,
    worksFor: {
      "@type": "Organization",
      name: "Pantaleone Digital Services LLC",
      url: siteConfig.url,
    },
    knowsAbout: [
      "Agentic AI",
      "Business Automation",
      "AI Strategy Consulting",
      "Enterprise Automation",
      "LLM Integration",
      "Workflow Orchestration",
    ],
    sameAs: [
      siteConfig.links.twitter,
      siteConfig.links.linkedin,
      siteConfig.links.github,
    ].filter(Boolean),
  };
}

// Validate SEO configuration to ensure all required fields are present
// This helps catch missing or incomplete SEO setup early
if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Define the current page for SEO configuration
const PAGE = "About";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// Configure comprehensive metadata for SEO and social sharing
// This includes all necessary meta tags for search engines and social media platforms
export const metadata: Metadata = {
  // Basic metadata
  title: page.title,
  applicationName: page.title,
  description: page.description,

  // URL configurations for canonical links and RSS feed
  metadataBase: new URL(getBaseUrl(page.slug)),
  alternates: {
    canonical: getBaseUrl(page.slug),
  },
};

export default async function AboutMePage() {
  const defaultImage = "/images/horizontal-profile-about.jpg";
  const imageAlt =
    "Matt Pantaleone, AI engineer based in the San Francisco Bay Area";

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getMemberJsonLd()),
        }}
      />
      <main className="mx-auto flex flex-col">
        <div className="relative">
          {/* Mobile Image */}
          <div className="md:hidden">
            <Image
              alt={imageAlt}
              src={defaultImage}
              width={1000}
              height={750}
              className="aspect-4/3 w-full object-cover"
              sizes="100vw"
              priority
            />
          </div>
          {/* Desktop Image */}
          <div className="hidden md:block">
            <Image
              alt={imageAlt}
              src={defaultImage}
              width={1000}
              height={500}
              className="w-full object-cover md:h-auto md:max-h-96"
              sizes="100vw"
              priority
            />
          </div>
        </div>
        <SeparatorHorizontal short={true} />
        <Heading
          title="Hello, I'm Matt Pantaleone"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-about"
        />
        <SeparatorHorizontal short={true} />
        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">About</h2>
            <p className="mb-4">
              I’m Matt Pantaleone. I build AI systems for small teams:
              N8N workflows, LangChain pipelines, and Next.js apps that
              run them. Past work includes document processing pipelines,
              support triage agents, and internal tools that file, sync,
              and report without a human in the loop.
            </p>
            <p className="mb-6">
              Below are the web applications I ship and maintain:
            </p>
            <Web />
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">
              What I build
            </h2>
            <p className="mb-4">
              One workflow at a time. We pick the process that eats the
              week, map it end to end, and automate the steps with clear
              inputs and outputs. The rest stays manual on purpose.
            </p>
            <p className="mb-4">
              Every engagement ends with handoff: repo, workflow JSON,
              credentials map, and a runbook your team can follow without me.
            </p>

            <h2 className="text-2xl font-semibold mb-4 mt-8">Stack</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>
                <strong>Agents and pipelines</strong> — N8N, LangChain,
                queued workers with retries and logs
              </li>
              <li>
                <strong>Retrieval</strong> — RAG over runbooks and tickets,
                answers cite the source file
              </li>
              <li>
                <strong>Models</strong> — hosted LLMs via API; fine-tuning
                only when prompts plus retrieval fall short
              </li>
              <li>
                <strong>Apps</strong> — Next.js 16, TypeScript, Tailwind,
                deployed on Vercel
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4 mt-8">
              How I work
            </h2>
            <p className="mb-4">
              Audit first. If the time cost doesn’t justify a build, I say
              so and you keep the ranked list. If it does, we build the
              smallest system that covers the documented path, log every
              run, and add a kill switch before handoff.
            </p>
            <p className="mb-6">
              Bay Area, working on-site and remote. Email works best;
              I reply within two business days.
            </p>
          </div>
        </div>
      </main>
      <SeparatorHorizontal short={true} />
      <LastModified lastModified="2026-07-29" />
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
