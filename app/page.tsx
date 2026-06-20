import type { Metadata } from "next";
import { SITE_URL, TWITTER_HANDLE } from "./siteConfig";
import { JsonLd } from "./components/JsonLd";
import { S } from "./content/strings";

export const revalidate = 3600; // rebuild hero + featured data hourly

import Hero from "@/app/(pages)/landing/Hero";
import ComparisonFeatureSection from "@/app/(pages)/landing/ComparisonFeatureSection";
import FeaturedListsSection from "@/app/(pages)/landing/FeaturedListsSection";
import StatsBanner from "@/app/(pages)/landing/StatsBanner";
import FinalCtaSection from "@/app/(pages)/landing/FinalCtaSection";
import SeoContentSection from "@/app/(pages)/landing/SeoContentSection";

const TITLE = S.landing.seoTitle;
const DESCRIPTION = S.landing.seoDescription;

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
  name: "tierstack.dev",
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
        <SeoContentSection />
      </main>
    </>
  );
}
