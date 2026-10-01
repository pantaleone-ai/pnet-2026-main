import HeadingTitle from "@/components/HeadingTitle";
import LinkWrapper from "@/components/LinkWrapper";
import SeparatorHorizontal from "@/components/SeparatorHorizontal";
import HEAD from "@/config/seo/head";
import { PORTFOLIO_APPS } from "@/config/portfolio";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";
import type { Metadata } from "next";

if (!HEAD || HEAD.length === 0) {
  console.error("⚠️ HEAD configuration is missing or empty");
}

// Content is static registry data — force static prerender, no ISR reads.
export const dynamic = "force-static";

// Define the current page for SEO configuration
const PAGE = "Apps";

// Get SEO configuration for the current page from the HEAD array
const page = HEAD.find((page: HeadType) => page.page === PAGE) as HeadType;

// Configure comprehensive metadata for SEO and social sharing
export const metadata: Metadata = {
  title: page.title,
  applicationName: page.title,
  description: page.description,
  metadataBase: new URL(getBaseUrl(page.slug)),
  alternates: {
    canonical: getBaseUrl(page.slug),
    types: {
      "text/markdown": getBaseUrl("/agents.md"),
    },
  },
};

export default async function AppsPage() {
  return (
    <>
      <SeparatorHorizontal borderTop={false} />
      <link rel="alternate" type="text/markdown" href="/agents.md" />
      <link rel="describedby" href="/llms.txt" />
      <HeadingTitle title="Apps" as="h1" />
      <p className="mx-auto w-full max-w-5xl px-4 text-muted-foreground">
        Live products in the Pantaleone portfolio. Each runs on its own
        domain with independent data — part of the Pantaleone portfolio.
        Build stories live under{" "}
        <LinkWrapper href="/projects" prefetch={false}>
          Projects
        </LinkWrapper>
        .
      </p>
      <SeparatorHorizontal short={true} />
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2">
        {PORTFOLIO_APPS.map((app) => (
          <li
            key={app.id}
            className="rounded-lg border border-edge p-5 transition-colors hover:border-muted-foreground"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">
                {app.name}
              </h2>
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                {app.category}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground/80">{app.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {app.status === "live" ? "Live" : app.status} ·{" "}
                {new URL(app.domain).hostname}
              </span>
              <LinkWrapper
                href={app.primaryCTA.href}
                prefetch={false}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                {app.primaryCTA.label} →
              </LinkWrapper>
            </div>
          </li>
        ))}
      </ul>
      <SeparatorHorizontal short={true} />
      <SeparatorHorizontal borderBottom={false} />
    </>
  );
}
