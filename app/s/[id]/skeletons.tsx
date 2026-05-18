import Skeleton from "@/app/components/Skeleton";

const TIER_STYLE: Record<string, { bg: string; text: string }> = {
  S: { bg: "#C44545", text: "#ffffff" },
  A: { bg: "#E08C2C", text: "#2A1A04" },
  B: { bg: "#97C459", text: "#173404" },
  C: { bg: "#5DCAA5", text: "#04342C" },
  D: { bg: "#85B7EB", text: "#042C53" },
  F: { bg: "#AFA9EC", text: "#26215C" },
};

// Vary name placeholder widths so adjacent cards don't look identical
const NAME_WIDTHS = [32, 44, 38, 28, 48, 36];

export function ItemCardSkeleton({
  index = 0,
  dashed = false,
}: {
  index?: number;
  dashed?: boolean;
}) {
  const nameWidth = NAME_WIDTHS[index % NAME_WIDTHS.length];

  return (
    <div
      className="w-[70px] bg-rk-surface rounded-[8px] overflow-hidden flex-shrink-0"
      style={{ border: dashed ? "1px dashed #1E2C44" : "1px solid #1E2C44" }}
    >
      <Skeleton height={44} width="100%" />
      <div className="px-1.5 py-1.5">
        <Skeleton height={9} width={nameWidth} />
      </div>
    </div>
  );
}

interface TierRowSkeletonProps {
  tier: string;
  count: number;
}

export function TierRowSkeleton({ tier, count }: TierRowSkeletonProps) {
  const style = TIER_STYLE[tier] ?? { bg: "#334155", text: "#ffffff" };

  return (
    <div
      className="flex overflow-hidden border border-rk-stroke"
      style={{ borderRadius: 10 }}
    >
      {/* Real tier label in its real colour */}
      <div
        className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-3 gap-[3px]"
        style={{ backgroundColor: style.bg, minHeight: 76 }}
      >
        <span
          className="text-[26px] font-[500] leading-none select-none"
          style={{ color: style.text }}
        >
          {tier}
        </span>
      </div>

      {/* Skeleton item cards */}
      <div
        className="flex flex-wrap gap-2 p-3 flex-1 min-h-[96px] content-start"
        style={{ backgroundColor: "#0F1828" }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <ItemCardSkeleton key={i} index={i} />
        ))}
      </div>
    </div>
  );
}

const PILL_WIDTHS = [52, 68, 44, 72, 60, 56];

export function FilterPillSkeleton({ index = 0 }: { index?: number }) {
  const textWidth = PILL_WIDTHS[index % PILL_WIDTHS.length];
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] flex-shrink-0"
      style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
    >
      <Skeleton width={16} height={16} circle />
      <Skeleton width={textWidth} height={9} />
    </div>
  );
}
