import Skeleton from "@/app/components/Skeleton";

// Three presets so adjacent cards in the grid don't look identical
const PRESETS = [
  { chipCount: 7, titleWidth: "70%", statsWidth: "45%" },
  { chipCount: 4, titleWidth: "78%", statsWidth: "55%" },
  { chipCount: 11, titleWidth: "63%", statsWidth: "50%" },
];

interface Props {
  variant?: 0 | 1 | 2;
}

export default function ListCardSkeleton({ variant = 0 }: Props) {
  const { chipCount, titleWidth, statsWidth } = PRESETS[variant];

  return (
    <div className="bg-rk-surface border border-rk-stroke rounded-[10px] overflow-hidden">
      {/* Preview area — same dimensions as real card */}
      <div
        className="h-36 p-3 flex flex-wrap gap-1.5 content-start overflow-hidden"
        style={{ backgroundColor: "#0F1828" }}
      >
        {Array.from({ length: chipCount }).map((_, i) => (
          <Skeleton key={i} width={22} height={22} />
        ))}
      </div>

      {/* Info */}
      <div className="px-3 py-3">
        <Skeleton height={13} width={titleWidth} />
        <div className="mt-1.5">
          <Skeleton height={10} width={statsWidth} />
        </div>
      </div>
    </div>
  );
}
