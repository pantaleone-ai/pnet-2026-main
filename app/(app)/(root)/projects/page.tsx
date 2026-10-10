import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import TrackedCta from "@/components/TrackedCta";
import HEAD from "@/config/seo/head";
import { siteConfig } from "@/config/site";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";

export const dynamic = "force-static";

const PAGE = "Projects";
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page, "/projects.md");

type Engagement = {
  title: string;
  problem: string;
  approach: string;
  deliverables: string;
  capabilities: string[];
  ctaLabel: string;
};

const ENGAGEMENTS: Engagement[] = [
  {
    title: "Lead qualification and routing",
    problem:
      "Leads arrive through multiple channels and need manual review, enrichment, and assignment.",
    approach:
      "An automated workflow that enriches submissions, applies qualification rules, routes leads, and records outcomes.",
    deliverables:
      "Workflow, CRM integrations, exception handling, run monitoring, and documentation.",
    capabilities: ["N8N workflows", "CRM integration", "Lead scoring"],
    ctaLabel: "Discuss lead automation",
  },
  {
    title: "Internal knowledge assistant",
    problem:
      "Employees spend time searching documents and repeatedly asking colleagues for the same information.",
    approach:
      "A retrieval-based assistant grounded in approved internal sources, with access controls and source references.",
    deliverables:
      "Data ingestion, retrieval pipeline, permissions, evaluation, and deployment.",
    capabilities: ["RAG pipelines", "LLM integration", "Access controls"],
    ctaLabel: "Discuss a knowledge assistant",
  },
  {
    title: "Marketing and content operations",
    problem:
      "Teams coordinate briefs, approvals, asset production, and distribution across disconnected tools.",
    approach:
      "An integrated workflow using appropriate AI models alongside existing marketing systems.",
    deliverables:
      "Workflow design, integrations, human approval steps, reporting, and operational documentation.",
    capabilities: ["Workflow design", "AI integration", "Human-in-the-loop"],
    ctaLabel: "Discuss content operations",
  },
  {
    title: "Reporting and research automation",
    problem:
      "Employees repeatedly collect information, reconcile sources, and prepare reports by hand.",
    approach:
      "An automated pipeline that gathers approved inputs, processes information, validates outputs, and delivers structured results.",
    deliverables:
      "Data integrations, processing logic, validation, reporting, and monitoring.",
    capabilities: ["Data pipelines", "Validation", "Scheduled delivery"],
    ctaLabel: "Discuss reporting automation",
  },
  {
    title: "Custom internal software",
    problem:
      "A business process does not fit existing software and runs on spreadsheets or manual coordination.",
    approach:
      "A focused application with the workflow, permissions, data model, and integrations the process needs.",
    deliverables:
      "Application, deployment, testing, documentation, and handoff.",
    capabilities: ["Next.js builds", "Custom data models", "Integrations"],
    ctaLabel: "Discuss custom software",
  },
];

function getBreadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Business solutions",
        item: `${siteConfig.url}/projects`,
      },
    ],
  };
}

export default async function ProjectsPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbJsonLd()),
        }}
      />
      <link rel="alternate" type="text/markdown" href="/projects.md" />
      <link rel="describedby" href="/llms.txt" />
      <main className="mx-auto flex max-w-5xl flex-col px-4">
        <HeadingTitle
          title="AI solutions built around your business."
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-projects"
          as="h1"
        />
        <p className="mx-auto max-w-2xl px-6 pt-6 text-center text-lg/8 text-foreground/80">
          We automate manual work, build AI agents, and develop software
          around the processes your business needs to run better.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 px-6 pt-6 sm:flex-row">
          <TrackedCta
            href="/contact?implementation=true"
            ctaType="contact"
            ctaLabel="Discuss a project"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
          >
            Discuss a project
          </TrackedCta>
          <TrackedCta
            href="/apps"
            ctaType="apps"
            ctaLabel="Explore our software"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto"
          >
            Explore our software
          </TrackedCta>
        </div>
        <SeparatorHorizontal short={true} />

        <section aria-labelledby="engagements-heading" className="py-8">
          <h2
            id="engagements-heading"
            className="text-center text-2xl font-semibold tracking-tight"
          >
            Solutions we can build
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
            Example engagements based on the work we do. These are solution
            concepts, not completed client engagements.
          </p>
          <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {ENGAGEMENTS.map((item) => (
              <li
                key={item.title}
                className="flex flex-col rounded-lg border border-border p-6 text-left"
              >
                <h3 className="text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-foreground/80">
                  <span className="font-medium text-foreground">Problem: </span>
                  {item.problem}
                </p>
                <p className="mt-2 text-sm text-foreground/80">
                  <span className="font-medium text-foreground">
                    Approach:{" "}
                  </span>
                  {item.approach}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Deliverables:{" "}
                  </span>
                  {item.deliverables}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.capabilities.join(" · ")}
                </p>
                <div className="mt-4 flex-1 items-end">
                  <TrackedCta
                    href="/contact?implementation=true"
                    ctaType="projects"
                    ctaLabel={item.ctaLabel}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {item.ctaLabel} →
                  </TrackedCta>
                </div>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
            How we ship software matters too.{" "}
            <TrackedCta
              href="/apps"
              ctaType="apps"
              ctaLabel="See how we ship software"
              className="underline underline-offset-4"
            >
              See how we ship software
            </TrackedCta>
            .
          </p>
        </section>

        <SeparatorHorizontal short={true} />

        <section
          aria-labelledby="projects-cta-heading"
          className="mx-auto max-w-2xl px-6 py-12 text-center"
        >
          <h2 id="projects-cta-heading" className="text-2xl font-semibold">
            Have a workflow worth fixing?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Bring us one process. We&apos;ll assess whether automation or
            custom software makes sense.
          </p>
          <div className="mt-6 flex justify-center">
            <TrackedCta
              href="/contact?book=true"
              ctaType="contact"
              ctaLabel="Book a working session"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Book a working session
            </TrackedCta>
          </div>
        </section>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
