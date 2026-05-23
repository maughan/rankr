import { S } from "@/app/content/strings";

const COPY = S.seoContent;

export default function SeoContentSection() {
  return (
    <section
      className="px-6 py-16 sm:px-10 border-t"
      style={{ borderColor: "#1E2C44" }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-12">
        {/* What is a tier list? */}
        <div className="flex flex-col gap-4">
          <h2 className="text-[22px] font-bold text-rk-primary tracking-tight">
            {COPY.whatHeading}
          </h2>
          <p className="text-[15px] text-rk-secondary leading-relaxed">
            {COPY.what}
          </p>
        </div>

        {/* How to make a tier list */}
        <div className="flex flex-col gap-6">
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
      </div>
    </section>
  );
}
