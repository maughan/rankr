import { DIVISIVE_SD_MID, DIVISIVE_SD_HIGH } from "@/lib/insightsConfig";

export interface ItemDistribution {
  distribution: { tierTitle: string; value: number; count: number; pct: number }[];
  sd: number;
  total: number;
}

export function computeItemDistribution(
  countsByValue: Map<number, number>,
  sortedTiers: { title: string; value: number }[]
): ItemDistribution {
  let total = 0;
  for (const c of countsByValue.values()) total += c;

  const distribution = sortedTiers.map((t) => {
    const count = countsByValue.get(t.value) ?? 0;
    return {
      tierTitle: t.title,
      value: t.value,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  if (total === 0) return { distribution, sd: 0, total: 0 };

  const idxOf = new Map(sortedTiers.map((t, i) => [t.value, i]));
  let mean = 0;
  for (const [v, c] of countsByValue) mean += (idxOf.get(v) ?? 0) * c;
  mean /= total;
  let variance = 0;
  for (const [v, c] of countsByValue) {
    const i = idxOf.get(v) ?? 0;
    variance += c * (i - mean) ** 2;
  }
  variance /= total;

  return { distribution, sd: Math.sqrt(variance), total };
}

export function divisiveness(sd: number): "low" | "mid" | "high" {
  if (sd >= DIVISIVE_SD_HIGH) return "high";
  if (sd >= DIVISIVE_SD_MID) return "mid";
  return "low";
}
