import Skeleton from "@/app/components/Skeleton";

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

const TIERS = ["S", "A", "B", "C", "D", "F"];

export function MatrixSkeleton() {
  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Stat tiles — real containers, skeleton values */}
      <div className="flex gap-4 flex-wrap">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 min-w-28 bg-gray-900 rounded-sm p-4 flex flex-col gap-2"
          >
            <Skeleton height={10} width="60%" />
            <Skeleton height={24} width="45%" />
          </div>
        ))}
      </div>

      {/* Matrix — real axis labels, skeleton cells */}
      <div className="mx-auto">
        <div className="inline-flex flex-col gap-1">
          <p className="text-xs text-gray-400 ml-16 mb-1">Their rank →</p>

          <div className="flex gap-1">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 16 }}
            >
              <span
                className="text-xs text-gray-400 whitespace-nowrap"
                style={{ writingMode: "vertical-lr" }}
              >
                Your rank
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {/* Their tier header — real badges */}
              <div className="flex gap-1">
                <div className="w-10 flex-shrink-0" />
                {TIERS.map((tier) => {
                  const { bg, text } = TIER_STYLE[tier];
                  return (
                    <div
                      key={tier}
                      className="w-10 h-7 flex items-center justify-center rounded-sm text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: bg, color: text }}
                    >
                      {tier}
                    </div>
                  );
                })}
              </div>

              {/* Matrix rows — real row badges, skeleton cells */}
              {TIERS.map((myTier) => {
                const { bg, text } = TIER_STYLE[myTier];
                return (
                  <div key={myTier} className="flex gap-1">
                    <div
                      className="w-10 h-10 flex items-center justify-center rounded-sm text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: bg, color: text }}
                    >
                      {myTier}
                    </div>
                    {TIERS.map((theirTier) => (
                      <div key={theirTier} className="w-10 h-10 flex-shrink-0">
                        <Skeleton width={40} height={40} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetailPanelSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton height={14} width="45%" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton width={64} height={64} />
          <div className="flex items-center gap-2">
            <Skeleton width={32} height={32} />
            <span className="text-rk-muted text-sm">→</span>
            <Skeleton width={32} height={32} />
          </div>
        </div>
      ))}
    </div>
  );
}
