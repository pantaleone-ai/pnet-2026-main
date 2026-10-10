"use client";

import LinkWrapper from "@/components/LinkWrapper";
import { track } from "@/lib/analytics";
import type { ReactNode } from "react";

/**
 * CTA link with funnel-distinguishable analytics.
 *
 * Uses ONLY existing event schemas — no new tracking implementation:
 * - "contact" → track.ctaClicked("contact", …) = PostHog cta_clicked +
 *   GA4 generate_lead + Meta Contact (the site's booking-conversion path).
 * - "projects" / "apps" / "guide" → track.ctaClicked(type, …) =
 *   PostHog cta_clicked only (no GA/Meta event, so no duplicate or
 *   inflated conversion counts).
 * - "outbound-product" → track.outboundLinkClicked(…) = PostHog
 *   outbound_link_clicked + GA4 click. Never a purchase or lead.
 */
export type TrackedCtaType =
  | "contact"
  | "projects"
  | "apps"
  | "guide"
  | "outbound-product";

export default function TrackedCta({
  href,
  ctaType,
  ctaLabel,
  className,
  children,
}: {
  href: string;
  ctaType: TrackedCtaType;
  ctaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const handleClick = () => {
    if (ctaType === "outbound-product") {
      track.outboundLinkClicked(href, ctaLabel);
    } else {
      track.ctaClicked(ctaType, ctaLabel, href);
    }
  };

  return (
    <LinkWrapper href={href} prefetch={false} className={className} onClick={handleClick}>
      {children}
    </LinkWrapper>
  );
}
