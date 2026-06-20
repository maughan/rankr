import type { PayoffData } from "@/lib/server/payoff";

export interface RevealData {
  sharerHandle: string | null;
  vsSharerPct: number | null;
  vsCrowdPct: number;
  hottestTake: PayoffData["hottestTake"];
  rankerCount: number;
}

export function buildReveal(args: {
  payoff: PayoffData;
  vsSharer: { within: number; both: number } | null;
  sharerHandle: string | null;
}): RevealData {
  const { payoff, vsSharer, sharerHandle } = args;
  const vsSharerPct =
    vsSharer && vsSharer.both > 0
      ? Math.round((vsSharer.within / vsSharer.both) * 100)
      : null;
  return {
    sharerHandle: vsSharerPct !== null ? sharerHandle : null,
    vsSharerPct,
    vsCrowdPct: payoff.alignment.pct,
    hottestTake: payoff.hottestTake,
    rankerCount: payoff.alignment.rankerCount,
  };
}
