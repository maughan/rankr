"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { E } from "@/lib/analytics/events";

export function CategoryTracker({ category }: { category: string }) {
  useEffect(() => {
    trackEvent(E.BROWSE_CATEGORY_VISITED, { category });
  }, [category]);
  return null;
}
