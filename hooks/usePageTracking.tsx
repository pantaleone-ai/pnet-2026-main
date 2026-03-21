"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function PageTrackingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Google Analytics page tracking (no consent required)
    if (window.gtag && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
      window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PageTracker() {
  return (
    <Suspense fallback={null}>
      <PageTrackingInner />
    </Suspense>
  );
}
