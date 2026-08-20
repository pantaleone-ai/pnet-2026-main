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
    "Professional headshot of Tim, a Frontend Developer with 5 years of experience";

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
            <h2 className="text-2xl font-semibold mb-4">About Me</h2>
            <p className="mb-4">
              I'm a senior AI engineer and automation strategist specializing in
              building autonomous agentic systems and enterprise automation
              solutions. My work focuses on bridging the gap between cutting-edge
              AI capabilities and practical business implementation.
            </p>
            <p className="mb-6">
              Below you can explore some of the web applications I've developed:
            </p>
            <Web />
          </div>
        </div>

        <SeparatorHorizontal short={true} />

        <div className="border-border relative min-h-52 max-w-full">
          <div className="prose dark:prose-invert mx-auto max-w-3xl px-6 py-8">
            <h2 className="text-2xl font-semibold mb-4">
              AI Strategy & Automation Engineering
            </h2>
            <p className="mb-4">
              As a senior AI engineer, I specialize in building autonomous
              agentic systems and enterprise automation strategies. My work
              focuses on bridging the gap between cutting-edge AI capabilities
              and practical business implementation.
            </p>
            <p className="mb-4">
              As an AI strategy consultant, I help organizations identify
              high-impact automation opportunities, design agentic workflows,
              and deploy scalable AI solutions that drive measurable business
              outcomes.
            </p>

            <h2 className="text-2xl font-semibold mb-4 mt-8">Core Expertise</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>
                <strong>Agentic AI Development</strong> — Building autonomous
                agents that handle complex workflows
              </li>
              <li>
                <strong>Business Automation Strategy</strong> — Identifying and
                implementing automation opportunities
              </li>
              <li>
                <strong>LLM Integration</strong> — Custom large language model
                deployments and fine-tuning
              </li>
              <li>
                <strong>Workflow Orchestration</strong> — N8N, LangChain, and
                custom automation pipelines
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mb-4 mt-8">
              AI Engineering Approach
            </h2>
            <p className="mb-4">
              I believe in practical AI solutions that solve real business
              problems. Every automation strategy starts with understanding your
              unique operational challenges, then applying the right combination
              of agentic AI, predictive models, and workflow optimization.
            </p>
            <p className="mb-6">
              My background in systems architecture combined with hands-on AI
              engineering allows me to deliver solutions that are both
              technically sound and commercially viable. Whether you are looking
              to automate repetitive tasks, implement intelligent document
              processing, or build complete AI-powered business systems, I can
              help you navigate the complexity of modern AI implementation.
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
