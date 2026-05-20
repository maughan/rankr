"use client";

import { usePathname } from "next/navigation";
import LandingFooter from "@/app/landing/LandingFooter";

export default function FooterWrapper() {
  const pathname = usePathname();
  if (pathname.endsWith("/submitted")) return null;
  return <LandingFooter />;
}
