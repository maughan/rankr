"use client";

import type { ItemDistribution as Dist } from "@/lib/itemDistribution";

const TIER_BG: Record<string, string> = {
  S: "#C44545", A: "#E08C2C", B: "#97C459", C: "#5DCAA5", D: "#85B7EB", F: "#AFA9EC",
};

export function ItemDistribution({
  dist,
  yourValue,
}: {
  dist: Dist;
  yourValue: number | null;
}) {
  if (dist.total === 0) {
    return <p className="text-[12px] text-rk-muted py-2">Not enough rankings yet.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5 py-2">
      {dist.distribution.map((d) => (
        <div key={d.value} className="flex items-center gap-2">
          <span
            className="w-5 text-center text-[11px] font-[500] rounded-[3px]"
            style={{ color: TIER_BG[d.tierTitle] ?? "#888" }}
          >
            {d.tierTitle}
          </span>
          <div className="flex-1 h-[14px] bg-rk-surface rounded-[3px] overflow-hidden">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${d.pct}%`, backgroundColor: TIER_BG[d.tierTitle] ?? "#888", opacity: d.count ? 1 : 0 }}
            />
          </div>
          <span className="w-10 text-right text-[11px] text-rk-muted">{d.pct}%</span>
          {yourValue === d.value ? (
            <span className="text-[10px] font-[500] text-rk-accent w-8">you</span>
          ) : (
            <span className="w-8" />
          )}
        </div>
      ))}
    </div>
  );
}
