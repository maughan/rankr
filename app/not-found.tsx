import Link from "next/link";

const TIERS = [
  { label: "S", bg: "#C44545", text: "#ffffff" },
  { label: "A", bg: "#E08C2C", text: "#2A1A04" },
  { label: "B", bg: "#97C459", text: "#173404" },
  { label: "C", bg: "#5DCAA5", text: "#04342C" },
  { label: "D", bg: "#85B7EB", text: "#042C53" },
  { label: "F", bg: "#AFA9EC", text: "#26215C" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-rk-page flex flex-col items-center justify-center px-4 text-center">
      {/* Mini tier list — 404 ranked F */}
      <div className="flex flex-col gap-[3px] mb-10">
        {TIERS.map((tier) => {
          const is404Row = tier.label === "F";
          return (
            <div
              key={tier.label}
              className="flex overflow-hidden rounded-[8px] border border-rk-stroke"
              style={{ opacity: is404Row ? 1 : 0.35 }}
            >
              {/* Tier label */}
              <div
                className="w-10 flex-shrink-0 flex items-center justify-center py-2"
                style={{ backgroundColor: tier.bg }}
              >
                <span
                  className="text-[15px] font-[500] leading-none select-none"
                  style={{ color: tier.text }}
                >
                  {tier.label}
                </span>
              </div>

              {/* Item slot */}
              <div
                className="flex items-center px-3 py-2 gap-2 flex-1"
                style={{ backgroundColor: "#0F1828" }}
              >
                {is404Row ? (
                  <div
                    className="px-2.5 py-1 rounded-[6px] border border-rk-stroke"
                    style={{ backgroundColor: "#142036" }}
                  >
                    <span className="text-[12px] font-[600] text-rk-primary tracking-wide">
                      this page
                    </span>
                  </div>
                ) : (
                  <div className="h-7 w-16 rounded-[6px] bg-rk-stroke opacity-40" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Copy */}
      <h1
        className="text-rk-primary font-[600] leading-tight mb-2"
        style={{ fontSize: 26, letterSpacing: "-0.4px" }}
      >
        Solid F-tier page.
      </h1>
      <p className="text-[14px] text-rk-muted max-w-xs leading-relaxed mb-8">
        Whatever was here didn&apos;t make the cut. Or never existed.
        Either way, the community has spoken.
      </p>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-4 py-2 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity"
        >
          Back to safety
        </Link>
        <Link
          href="/library"
          className="px-4 py-2 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors"
        >
          Browse stacks
        </Link>
      </div>
    </div>
  );
}
