import { COPY } from "./content";

export default function LandingFooter() {
  return (
    <footer
      className="px-6 py-8 sm:px-10 flex items-center justify-between border-t flex-wrap gap-4"
      style={{ borderColor: "#1E2C44" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-bold text-rk-primary tracking-tight">
          tierstack.dev
        </span>
        <span className="text-[11px] text-rk-muted">{COPY.footerTagline}</span>
      </div>

      <span className="text-[11px] text-rk-tertiary">
        © {new Date().getFullYear()} tierstack.dev
      </span>
    </footer>
  );
}
