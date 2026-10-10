import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getBaseUrl } from "@/lib/helpers";
import type { HeadType } from "@/types";

/**
 * Single source of truth for route metadata.
 *
 * - Title is rendered with `{ absolute }` so the root template
 *   (`%s | Pantaleone`) never double-appends the brand. HEAD titles
 *   already contain their intended suffix.
 * - `metadataBase` is always the site root (NOT the page URL) so
 *   relative asset URLs resolve consistently.
 * - Canonical is an absolute HTTPS URL for the page itself.
 * - OG/Twitter mirror the HTML title + description so shared previews
 *   never contradict the page heading.
 */
export function getPageMetadata(
  page: HeadType,
  markdownPath?: string,
): Metadata {
  const canonical = getBaseUrl(page.slug);
  return {
    title: { absolute: page.title },
    description: page.description,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical,
      ...(markdownPath
        ? { types: { "text/markdown": getBaseUrl(markdownPath) } }
        : {}),
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      title: page.title,
      description: page.description,
      siteName: siteConfig.shortName,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [siteConfig.ogImage],
      creator: "@m_pantaleone",
    },
  };
}
