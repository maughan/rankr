import { FEATURES } from "./content";

export default function ComparisonFeatureSection() {
  return (
    <section className="px-6 py-20 sm:px-10 max-w-6xl mx-auto w-full sm:pt-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex flex-col gap-3 rounded-[14px] p-6"
            style={{
              backgroundColor: "#0F1828",
              border: "1px solid #1E2C44",
            }}
          >
            <span className="text-[28px] leading-none">{f.icon}</span>
            <p className="text-[15px] font-[600] text-rk-primary">{f.title}</p>
            <p className="text-[13px] text-rk-secondary leading-relaxed">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
