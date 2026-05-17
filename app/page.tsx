import type { Metadata } from "next";

export const revalidate = 3600; // rebuild hero + featured data hourly

import Hero from "@/app/landing/Hero";
import ComparisonFeatureSection from "@/app/landing/ComparisonFeatureSection";
import FeaturedListsSection from "@/app/landing/FeaturedListsSection";
import StatsBanner from "@/app/landing/StatsBanner";
import FinalCtaSection from "@/app/landing/FinalCtaSection";
import LandingFooter from "@/app/landing/LandingFooter";

export const metadata: Metadata = {
  title: "tierstack.dev — Tier lists. But actually fun.",
  description:
    "Build tier lists on anything. Share them with friends and see exactly where you agree — and where you clash.",
  openGraph: {
    title: "tierstack.dev — Tier lists. But actually fun.",
    description:
      "Build tier lists on anything. Share them and get a head-to-head alignment score.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-rk-page">
      <Hero />
      <ComparisonFeatureSection />
      <StatsBanner />
      <FeaturedListsSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  );
}
