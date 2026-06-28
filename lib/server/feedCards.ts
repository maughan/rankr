import { DIVISIVE_SD_MID, DIVISIVE_SD_HIGH } from "@/lib/insightsConfig";
import { computeItemDistribution } from "@/lib/itemDistribution";

const FALLBACK_PALETTE = ["#C44545", "#E08C2C", "#97C459", "#5DCAA5", "#85B7EB", "#AFA9EC"];

export function coverColorsFromItems(items: { color: string | null }[], n = 5): string[] {
  const colors = items.map((i) => i.color).filter((c): c is string => !!c).slice(0, n);
  if (colors.length > 0) return colors;
  return FALLBACK_PALETTE.slice(0, n);
}

export function divisivenessLabel(avgSd: number): "calm" | "spicy" | "divisive" {
  if (avgSd >= DIVISIVE_SD_HIGH) return "divisive";
  if (avgSd >= DIVISIVE_SD_MID) return "spicy";
  return "calm";
}

export interface TierStripEntry { tierTitle: string; value: number; itemCount: number }

export function tierStripFromPlacements(
  items: { rankings: { value: number }[] }[],
  sortedTiers: { title: string; value: number }[]
): TierStripEntry[] {
  const tiers = sortedTiers.filter((t) => t.value > 0);
  const counts = new Map<number, number>(tiers.map((t) => [t.value, 0]));
  for (const item of items) {
    const vals = item.rankings.map((r) => r.value).filter((v) => v !== 0);
    if (vals.length === 0) continue;
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    if (counts.has(avg)) counts.set(avg, (counts.get(avg) ?? 0) + 1);
  }
  return tiers.map((t) => ({ tierTitle: t.title, value: t.value, itemCount: counts.get(t.value) ?? 0 }));
}

export interface RichListCard {
  id: number; short_id: string; slug: string; title: string;
  img: string | null; item_count: number; ranking_count: number;
  coverColors: string[];
  tierStrip: TierStripEntry[];
  divisiveness: "calm" | "spicy" | "divisive";
  twinSignal: { count: number; sampleName: string | null } | null;
}

export function buildRichListCard(list: {
  id: number; short_id: string; slug: string; title: string; img: string | null;
  items: { color: string | null; rankings: { value: number }[] }[];
  tiers: { title: string; value: number }[];
  ranking_count: number;
}): RichListCard {
  const sortedTiers = [...list.tiers].filter((t) => t.value > 0).sort((a, b) => b.value - a.value);
  let sdSum = 0;
  let sdCount = 0;
  for (const item of list.items) {
    const m = new Map<number, number>();
    for (const r of item.rankings) if (r.value !== 0) m.set(r.value, (m.get(r.value) ?? 0) + 1);
    const d = computeItemDistribution(m, sortedTiers);
    if (d.total > 0) {
      sdSum += d.sd;
      sdCount++;
    }
  }
  const avgSd = sdCount > 0 ? sdSum / sdCount : 0;
  return {
    id: list.id,
    short_id: list.short_id,
    slug: list.slug,
    title: list.title,
    img: list.img,
    item_count: list.items.length,
    ranking_count: list.ranking_count,
    coverColors: coverColorsFromItems(list.items),
    tierStrip: tierStripFromPlacements(list.items, sortedTiers),
    divisiveness: divisivenessLabel(avgSd),
    twinSignal: null,
  };
}
