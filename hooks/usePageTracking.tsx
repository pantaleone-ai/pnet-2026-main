"use client";

import { Suspense, useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

function PageTrackingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const trackPageView = useCallback(() => {
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    const pageTitle = document.title || "";

    // Google Analytics page tracking (no consent required)
    if (window.gtag && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
      window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
        page_path: url,
        page_title: pageTitle,
      });
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
