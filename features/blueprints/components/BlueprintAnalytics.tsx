"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/events";

interface BlueprintAnalyticsProps {
  slug: string;
  title: string;
  blueprintType: string;
}

/**
 * Client component for blueprint view tracking.
 * Fires a single view event per mount; no scroll-depth tracking.
 */
export default function BlueprintAnalytics({
  slug,
  title,
  blueprintType,
}: BlueprintAnalyticsProps) {
  useEffect(() => {
    trackEvent({
      name: "blueprint_view",
      properties: {
        blueprint_title: title,
        blueprint_slug: slug,
        blueprint_type: blueprintType,
      },
    });
  }, [slug, title, blueprintType]);

  return null;
}
