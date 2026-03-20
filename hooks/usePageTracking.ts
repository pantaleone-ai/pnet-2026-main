"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isAnalyticsEnabled } from "@/lib/analytics";

export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;

    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    if (window.gtag) {
      window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
        page_path: url,
      });
    }

    if (window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams]);
}

export function PageTracker() {
  usePageTracking();
  return null;
}
