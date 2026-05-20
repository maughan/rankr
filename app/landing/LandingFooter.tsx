import { IconCoffee } from "@tabler/icons-react";
import { COPY } from "./content";
import { S } from "@/app/content/strings";
import { KOFI_URL } from "@/app/siteConfig";

export default function LandingFooter() {
  return (
    <footer
      className="px-4 py-3 sm:px-10 sm:py-8 flex items-center justify-between border-t gap-3 sm:gap-4 bg-rk-page"
      style={{ borderColor: "#1E2C44" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-bold text-rk-primary tracking-tight">
          tierstack.dev
        </span>
        <span className="hidden sm:block text-[11px] text-rk-muted">{COPY.footerTagline}</span>
      </div>

      <div className="flex items-center gap-4">
        {KOFI_URL && (
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] transition-colors hover:opacity-80"
            style={{ color: "#EF9F27" }}
          >
            <IconCoffee size={13} strokeWidth={2} />
            {S.support.footerLinkLabel}
          </a>
        )}
        <span className="text-[11px] text-rk-tertiary">
          © {new Date().getFullYear()} tierstack.dev
        </span>
      </div>
    </footer>
  );
}
