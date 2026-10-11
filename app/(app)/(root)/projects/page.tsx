import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import TrackedCta from "@/components/TrackedCta";
import HEAD from "@/config/seo/head";
import { siteConfig } from "@/config/site";
import {
  FeaturedLeadCard,
  ProjectCard,
} from "@/features/projects/components/ProjectsEditorial";
import { getProjectsPageData } from "@/features/projects/data/projectsPage";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";

export const dynamic = "force-static";

const PAGE = "Projects";
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page, "/projects.md");

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
        name: "Projects",
        item: `${siteConfig.url}/projects`,
      },
    ],
  };
}

// Verified registry properties only — name, URL, category, description.
// No ratings, offers, or prices: none are evidenced in the project source.
function getSoftwareListJsonLd(items: ReturnType<typeof getProjectsPageData>["all"]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Software built by Pantaleone",
    itemListElement: items
      .filter((item) => item.href)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareApplication",
          name: item.name,
          url: item.href,
          image: item.imageSrc,
          applicationCategory: item.category,
          operatingSystem: "Web",
          description: item.description,
        },
      })),
  };
}

export default async function ProjectsPage() {
  const { lead, supporting, groups, all } = getProjectsPageData();

  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getBreadcrumbJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getSoftwareListJsonLd(all)),
        }}
      />
      <link rel="alternate" type="text/markdown" href="/projects.md" />
      <link rel="describedby" href="/llms.txt" />
      <main className="mx-auto flex max-w-5xl flex-col px-4">
        <p className="pt-8 text-center text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Selected work
        </p>
        <HeadingTitle
          title="Projects"
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-projects"
          as="h1"
        />
        <p className="mx-auto max-w-2xl px-6 pt-2 text-center text-lg/8 text-foreground/80">
          Products, platforms, and experiments built to solve real problems.
          From AI-powered applications to the systems behind them, each project
          starts with something worth making.
        </p>
        <SeparatorHorizontal short={true} />

        <section aria-labelledby="featured-heading" className="py-8">
          <h2
            id="featured-heading"
            className="text-center text-2xl font-semibold tracking-tight"
          >
            Featured projects
          </h2>
          <div className="mx-auto mt-8 flex w-full max-w-5xl flex-col gap-4 px-4">
            <FeaturedLeadCard card={lead} />
            <ul
              aria-label="More featured projects"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {supporting.map((card, index) => (
                <li key={card.key} className="h-full">
                  <ProjectCard card={card} titleId={`featured-title-${index}`} />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <SeparatorHorizontal short={true} />

        <section aria-labelledby="more-projects-heading" className="py-8">
          <h2
            id="more-projects-heading"
            className="text-center text-2xl font-semibold tracking-tight"
          >
            More projects
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
            A broader look at the applications, tools, and infrastructure built
            along the way.
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-5xl flex-col gap-10 px-4">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`${group.id}-heading`}>
                <h3
                  id={`${group.id}-heading`}
                  className="text-lg font-semibold tracking-tight"
                >
                  {group.heading}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.description}
                </p>
                <ul
                  aria-label={group.heading}
                  className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  {group.items.map((card) => (
                    <li key={card.key} className="h-full">
                      <ProjectCard card={card} titleId={`${group.id}-${card.anchor}`} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">
            Looking for the way these get shipped?{" "}
            <TrackedCta
              href="/apps"
              ctaType="apps"
              ctaLabel="See all software"
              className="underline underline-offset-4"
            >
              See all software
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
            Have something worth building?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            We work on practical software, AI applications, and automation that
            solve real problems.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedCta
              href="/services"
              ctaType="projects"
              ctaLabel="Explore services"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Explore services
            </TrackedCta>
            <TrackedCta
              href="/contact"
              ctaType="contact"
              ctaLabel="Get in touch"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto"
            >
              Get in touch
            </TrackedCta>
          </div>
        </section>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
