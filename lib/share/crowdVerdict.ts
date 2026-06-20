// Crowd verdict — the consensus a list's rankers reached, derived purely from
// public ranking data (no viewer session). Shared by the list OG card and the
// verdict OG route's "crowd" template. Returns null until there is real signal.

import type { OgListVerdict } from "@/lib/share/templates/og-list";

export type VerdictRankItem = {
  name: string | null;
  rankings: { value: number }[];
};

export function computeCrowdVerdict(
  items: VerdictRankItem[],
  tiers: { value: number; title: string }[]
): OgListVerdict | null {
  const placed = items
    .map((it) => {
      const vals = it.rankings.map((r) => r.value).filter((v) => v !== 0);
      if (vals.length === 0 || !it.name) return null;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance =
        vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
      return {
        name: it.name,
        tierVal: Math.round(mean),
        variance,
        count: vals.length,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (placed.length === 0) return null;

  const maxTierVal = Math.max(...placed.map((p) => p.tierVal));
  const topTierItems = placed
    .filter((p) => p.tierVal === maxTierVal)
    .map((p) => p.name);
  const topTierLabel = tiers.find((t) => t.value === maxTierVal)?.title ?? "S";

  const contested = placed
    .filter((p) => p.count >= 2 && p.variance > 0)
    .sort((a, b) => b.variance - a.variance);

  return {
    topTierLabel,
    topTierItems,
    divisiveItem: contested.length > 0 ? contested[0].name : null,
  };
}
