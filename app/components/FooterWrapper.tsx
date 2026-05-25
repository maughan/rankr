"use client";

import { usePathname } from "next/navigation";
import LandingFooter from "@/app/landing/LandingFooter";

export default function FooterWrapper() {
  const pathname = usePathname();
  // Pages that render their own footer directly
  if (pathname.startsWith("/u/")) return null;
  if (pathname.endsWith("/submitted")) return null;
  return <LandingFooter />;
}
