import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, TWITTER_HANDLE } from "./siteConfig";
import { JsonLd } from "./components/JsonLd";

export const revalidate = 3600; // rebuild hero + featured data hourly

import Hero from "@/app/landing/Hero";
import ComparisonFeatureSection from "@/app/landing/ComparisonFeatureSection";
import FeaturedListsSection from "@/app/landing/FeaturedListsSection";
import StatsBanner from "@/app/landing/StatsBanner";
import FinalCtaSection from "@/app/landing/FinalCtaSection";

const TITLE = `${SITE_NAME} — Tier lists. But actually fun.`;
const DESCRIPTION =
  "Build tier lists on anything. Share them with friends and see exactly where you agree — and where you clash.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: TWITTER_HANDLE,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "Lifestyle",
  operatingSystem: "All",
};

export default function LandingPage() {
  return (
    <>
      <JsonLd data={webAppJsonLd} />
      <main className="min-h-screen bg-rk-page">
        <Hero />
        <ComparisonFeatureSection />
        <StatsBanner />
        <FeaturedListsSection />
        <FinalCtaSection />
      </main>
    </>
  );
}
