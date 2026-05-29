import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Community Guidelines — tierstack.dev",
  description: "Rules for keeping tierstack a good place for everyone.",
};

const SECTIONS = [
  {
    heading: "Be respectful",
    body: "Treat other users with basic decency. Harassment, personal attacks, or targeted abuse of any kind will result in removal and a ban.",
  },
  {
    heading: "No hate speech",
    body: "Content that promotes hatred or discrimination based on race, ethnicity, religion, gender, sexual orientation, disability, or any other protected characteristic is not allowed.",
  },
  {
    heading: "No sexual or violent content",
    body: "Explicit sexual content, graphic violence, or content that sexualises minors is strictly prohibited and will be escalated to the relevant authorities.",
  },
  {
    heading: "No spam or misleading content",
    body: "Don't flood the platform with repetitive, commercial, or low-quality lists. Don't impersonate other people or organisations.",
  },
  {
    heading: "Respect copyright",
    body: "Only use images and content you have the right to use. If you believe your work has been used without permission, use the report button or contact us.",
  },
  {
    heading: "Keep lists relevant",
    body: "List items should be genuinely rankable things. Off-topic content, filler, or shock items that exist solely to provoke may be removed.",
  },
  {
    heading: "Reporting",
    body: "If you see content that violates these guidelines, use the Report button. Reports go to our moderation team — we read them all. False reporting is itself a violation.",
  },
  {
    heading: "Enforcement",
    body: "Depending on severity and history, violations may result in content removal, a temporary suspension, or a permanent ban. Serious violations (child safety, credible threats) are reported to law enforcement.",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0A1220" }}>
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/feed" className="flex items-center gap-2 text-rk-muted hover:text-rk-secondary transition-colors">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-rk-accent flex-shrink-0" />
              <span className="text-[14px] font-[500] text-rk-primary tracking-tight">
                tierstack.dev
              </span>
            </Link>
          </div>
          <h1 className="text-[28px] font-[600] text-rk-primary leading-tight">
            Community guidelines
          </h1>
          <p className="text-[14px] text-rk-muted leading-relaxed">
            tierstack is built around ranking things together. These rules keep
            it a place where that&rsquo;s actually fun and safe.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="flex flex-col gap-1.5">
              <h2 className="text-[15px] font-[600] text-rk-primary">{s.heading}</h2>
              <p className="text-[13px] text-rk-secondary leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-rk-stroke pt-6">
          <p className="text-[12px] text-rk-tertiary leading-relaxed">
            These guidelines may be updated over time. Questions or appeals?{" "}
            <a
              href="mailto:hello@tierstack.dev"
              className="underline underline-offset-2 hover:text-rk-muted transition-colors"
            >
              Contact us
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
