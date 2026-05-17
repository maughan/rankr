import FinalCtaButton from "./FinalCtaButton";
import { COPY } from "./content";

export default function FinalCtaSection() {
  return (
    <section className="px-6 py-24 sm:px-10 flex flex-col items-center text-center gap-8">
      <h2 className="text-[36px] sm:text-[48px] font-bold text-rk-primary leading-tight tracking-tight max-w-[480px]">
        {COPY.finalHeadline}
      </h2>

      <FinalCtaButton />

      <h2 className="text-[13px] sm:text-[13px] text-rk-muted leading-tight tracking-tight max-w-[480px]">
        {COPY.finalUnderline}
      </h2>
    </section>
  );
}
