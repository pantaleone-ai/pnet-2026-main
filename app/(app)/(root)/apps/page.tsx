import HeadingTitle from "@/components/HeadingTitle";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import TrackedCta from "@/components/TrackedCta";
import HEAD from "@/config/seo/head";
import { siteConfig } from "@/config/site";
import { PORTFOLIO_APPS } from "@/config/portfolio";
import { getPageMetadata } from "@/lib/seo/page-metadata";
import type { HeadType } from "@/types";
import type { Metadata } from "next";
import Image from "next/image";

export const dynamic = "force-static";

const PAGE = "Apps";
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// HEAD is the single source of truth; title renders absolute so the root
// template never double-appends the brand.
export const metadata: Metadata = getPageMetadata(page, "/agents.md");

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
        name: "Software products",
        item: `${siteConfig.url}/apps`,
      },
    ],
  };
}

// SoftwareApplication entries use only verified registry properties —
// name, URL, category, and description. No ratings, offers, or prices:
// none are evidenced in the portfolio registry.
function getSoftwareListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Software built by Pantaleone",
    itemListElement: PORTFOLIO_APPS.map((app, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: app.name,
        url: app.domain,
        image: app.image.src,
        applicationCategory: app.category,
        operatingSystem: "Web",
        description: app.description,
      },
    })),
  };
}

export default async function AppsPage() {
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
          __html: JSON.stringify(getSoftwareListJsonLd()),
        }}
      />
      <link rel="alternate" type="text/markdown" href="/agents.md" />
      <link rel="describedby" href="/llms.txt" />
      <main className="mx-auto flex max-w-5xl flex-col px-4">
        <HeadingTitle
          title="Software we've built."
          textStyleClassName="text-3xl font-semibold md:text-4xl"
          gridId="grid-apps"
          as="h1"
        />
        <p className="mx-auto max-w-2xl px-6 pt-6 text-center text-lg/8 text-foreground/80">
          Explore software products built by Pantaleone, each designed for a
          specific use case.
        </p>
        <SeparatorHorizontal short={true} />
        <ul
          aria-label="Pantaleone software products"
          className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2"
        >
          {PORTFOLIO_APPS.map((app, index) => (
            <li
              key={app.id}
              className="flex flex-col overflow-hidden rounded-lg border border-edge text-left transition-colors hover:border-muted-foreground"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/20">
                <Image
                  src={app.image.src}
                  alt={app.image.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  priority={index === 0}
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {app.name}
                  </h2>
                  <span className="shrink-0 text-xs tracking-wide text-muted-foreground uppercase">
                    {app.category}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground/80">
                  {app.description}
                </p>
                <div className="mt-4 flex flex-1 items-end justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {app.status === "live" ? "Live" : app.status} ·{" "}
                    {new URL(app.domain).hostname}
                  </span>
                  <TrackedCta
                    href={app.primaryCTA.href}
                    ctaType="outbound-product"
                    ctaLabel={app.name}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {app.primaryCTA.label} →
                  </TrackedCta>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <SeparatorHorizontal short={true} />
        <section
          aria-labelledby="apps-cta-heading"
          className="mx-auto max-w-2xl px-6 py-12 text-center"
        >
          <h2 id="apps-cta-heading" className="text-2xl font-semibold">
            Need a solution built for your business?
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            We build AI workflows, agents, and custom software around real
            operating needs.
          </p>
          <div className="mt-6 flex justify-center">
            <TrackedCta
              href="/projects"
              ctaType="projects"
              ctaLabel="Explore business solutions"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Explore business solutions
            </TrackedCta>
          </div>
        </section>
      </main>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
