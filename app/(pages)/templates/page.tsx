import type { Metadata } from "next";
import { headers } from "next/headers";
import { SITE_URL, TWITTER_HANDLE } from "@/app/siteConfig";
import LandingNav from "@/app/(pages)/landing/LandingNav";
import type { TemplateCard } from "@/app/api/templates/route";
import TemplatesClient from "./TemplatesClient";

export const revalidate = 3600;

const SEO_TITLE = "Start from a template — tierstack.dev";
const SEO_DESCRIPTION =
  "Browse ready-made tier list templates and start ranking in one click. Pick a template, make it yours, and share your rankings.";
const PAGE_URL = `${SITE_URL}/templates`;

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    type: "website",
    url: PAGE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    site: TWITTER_HANDLE,
  },
};

type TemplateGroup = { category: string; templates: TemplateCard[] };

async function fetchTemplateGroups(): Promise<TemplateGroup[]> {
  // Resolve an absolute origin so this works during server rendering.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : SITE_URL;

  const res = await fetch(`${origin}/api/templates`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  return (await res.json()) as TemplateGroup[];
}

export default async function TemplatesPage() {
  const groups = await fetchTemplateGroups().catch(() => []);

  return (
    <div className="min-h-screen bg-rk-page flex flex-col">
      <LandingNav />

      <main className="flex-1 px-6 py-12 sm:px-10 max-w-6xl mx-auto w-full flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[36px] sm:text-[44px] font-bold text-rk-primary tracking-tight">
            Start from a template
          </h1>
          <p className="text-[15px] text-rk-secondary">
            Pick a ready-made list, make it your own, and start ranking.
          </p>
        </div>

        <TemplatesClient groups={groups} />
      </main>
    </div>
  );
}
