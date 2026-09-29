"use client";

import { Suspense, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

import { isGaEnabled, isMetaPixelEnabled } from "@/lib/analytics";

function PageTrackingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const trackPageView = useCallback(() => {
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const pageTitle = document.title || "";

    // Google Analytics page tracking — single page_view per SPA route,
    // consent-gated inside isGaEnabled (Consent Mode v2 + localStorage).
    // Layout init uses send_page_view:false so this is the only page_view.
    if (isGaEnabled()) {
      window.gtag("event", "page_view", {
        page_path: url,
        page_title: pageTitle,
      });
    }

    // Meta Pixel page tracking (requires measurement consent)
    if (isMetaPixelEnabled()) {
      window.fbq("track", "PageView");
    }

    // PostHog page tracking (requires consent)
    if (posthog.has_opted_in_capturing()) {
      posthog.capture("$pageview", {
        $current_url: url,
        page_title: pageTitle,
      });
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  return null;
}

export function PageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackingInner />
    </Suspense>
  );
}
