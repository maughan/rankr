import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import { JsonLd } from "@/app/components/JsonLd";
import { S } from "@/app/content/strings";
import LandingNav from "@/app/(pages)/landing/LandingNav";
import ComparisonFeatureSection from "@/app/(pages)/landing/ComparisonFeatureSection";
import HeroCta from "@/app/(pages)/landing/HeroCta";
import LandingFooter from "@/app/(pages)/landing/LandingFooter";

const COPY = S.tierListMakerPage;
const PAGE_URL = `${SITE_URL}/tier-list-maker`;

export const metadata: Metadata = {
  title: COPY.seoTitle,
  description: COPY.seoDescription,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: COPY.seoTitle,
    description: COPY.seoDescription,
    type: "website",
    url: PAGE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: COPY.seoTitle,
    description: COPY.seoDescription,
    site: TWITTER_HANDLE,
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "tierstack.dev",
    url: SITE_URL,
    description: COPY.seoDescription,
    applicationCategory: "Lifestyle",
    operatingSystem: "All",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: COPY.howHeading,
    description: COPY.intro,
    step: COPY.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.step,
      text: s.detail,
    })),
  },
];

export default function TierListMakerPage() {
  return (
    <>
      {structuredData.map((d, i) => (
        <JsonLd key={i} data={d} />
      ))}

      <div className="min-h-screen bg-rk-page flex flex-col">
        <LandingNav />

        {/* Hero */}
        <section className="px-6 py-20 sm:px-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
          <div className="flex flex-col gap-5 max-w-[600px]">
            <h1 className="text-[48px] sm:text-[60px] font-bold text-rk-primary leading-[1.05] tracking-tight">
              {COPY.h1}
            </h1>
            <p className="text-[16px] text-rk-secondary leading-relaxed">
              {COPY.intro}
            </p>
            <HeroCta />
          </div>
        </section>

        {/* Features label */}
        <p className="px-6 sm:px-10 max-w-6xl mx-auto w-full text-[13px] font-[600] text-rk-muted uppercase tracking-[0.1em]">
          {COPY.featuresHeading}
        </p>
        {/* Feature cards — reused from homepage */}
        <ComparisonFeatureSection />

        {/* How it works */}
        <section
          className="px-6 py-16 sm:px-10 border-t"
          style={{ borderColor: "#1E2C44" }}
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            <h2 className="text-[22px] font-bold text-rk-primary tracking-tight">
              {COPY.howHeading}
            </h2>
            <ol className="flex flex-col gap-4">
              {COPY.steps.map((s, i) => (
                <li key={s.step} className="flex gap-4">
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white mt-0.5"
                    style={{ backgroundColor: "#1E2C44" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-[14px] font-[600] text-rk-primary">
                      {s.step}
                    </h3>
                    <p className="text-[14px] text-rk-secondary leading-relaxed">
                      {s.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Differentiator */}
        <section
          className="px-6 py-16 sm:px-10 border-t"
          style={{ borderColor: "#1E2C44" }}
        >
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <h2 className="text-[22px] font-bold text-rk-primary tracking-tight">
              {COPY.differentiatorHeading}
            </h2>
            <p className="text-[15px] text-rk-secondary leading-relaxed">
              {COPY.differentiator}
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 sm:px-10 flex flex-col items-center text-center gap-6">
          <Link
            href="/feed"
            className="px-8 py-3.5 text-[15px] font-[600] bg-rk-accent text-white rounded-[10px] hover:opacity-90 transition-opacity"
          >
            {COPY.ctaLabel}
          </Link>
          <p className="text-[13px] text-rk-muted">
            {S.landing.finalUnderline}
          </p>
        </section>
      </div>
    </>
  );
}
