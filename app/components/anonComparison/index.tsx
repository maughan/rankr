"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { SharedListItem } from "@/lib/api/listsApi";
import { ImageKitLoader } from "@/lib/helpers";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TierPlacement {
  id: number;
  title: string;
  color: string;
  value: number;
  items: number[];
}

interface Props {
  items: SharedListItem[];
  myTiers: TierPlacement[];
  communityTiers: TierPlacement[];
  creatorTiers: TierPlacement[] | null;
  creatorName: string;
}

type CompareMode = "community" | "creator";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISTANCE_COLORS = [
  "bg-green-500",
  "bg-green-200",
  "bg-amber-300",
  "bg-orange-400",
  "bg-red-500",
];

const LEGEND = [
  { label: "Exact", cls: "bg-green-500" },
  { label: "±1", cls: "bg-green-200" },
  { label: "±2", cls: "bg-amber-300" },
  { label: "±3", cls: "bg-orange-400" },
  { label: "±4+", cls: "bg-red-500" },
];

function cellBg(distance: number) {
  return DISTANCE_COLORS[Math.min(distance, DISTANCE_COLORS.length - 1)];
}

function buildTierMap(tiers: TierPlacement[]): Map<number, number> {
  const map = new Map<number, number>(); // itemId → tierIdx
  const sorted = [...tiers]
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value);
  sorted.forEach((tier, idx) => {
    for (const itemId of tier.items) map.set(itemId, idx);
  });
  return map;
}

// ── Item tile ─────────────────────────────────────────────────────────────────

function ItemTile({ item }: { item: SharedListItem }) {
  if (item.img) {
    return (
      <div className="w-16 h-16 relative flex-shrink-0 rounded-sm overflow-hidden">
        <Image
          loader={ImageKitLoader}
          src={item.img}
          alt=""
          fill
          sizes="64px"
          style={{ objectFit: "cover" }}
        />
      </div>
    );
  }
  return (
    <div
      className="w-16 h-16 flex-shrink-0 flex flex-col items-center justify-center rounded-sm overflow-hidden"
      style={{ backgroundColor: item.color ?? "#334155" }}
    >
      <span className="text-white font-bold text-xs">{item.short_label}</span>
      <span className="text-white/80 text-xs px-1 truncate w-full text-center">
        {item.name}
      </span>
    </div>
  );
}

// ── Matrix panel ──────────────────────────────────────────────────────────────

function MatrixPanel({
  items,
  myTiers,
  compareTiers,
  compareLabel,
}: {
  items: SharedListItem[];
  myTiers: TierPlacement[];
  compareTiers: TierPlacement[];
  compareLabel: string;
}) {
  const [disagreementsOnly, setDisagreementsOnly] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);

  const sortedTiers = useMemo(
    () => [...myTiers].filter((t) => t.value !== 0).sort((a, b) => b.value - a.value),
    [myTiers]
  );
  const n = sortedTiers.length;

  const tierValueToIdx = useMemo(
    () => new Map(sortedTiers.map((t, i) => [t.value, i])),
    [sortedTiers]
  );

  const { matrix, missingFromMe, missingFromThem } = useMemo(() => {
    const myMap = buildTierMap(myTiers);
    const theirMap = buildTierMap(compareTiers);

    // Remap to indices using the sorted tier order
    const myIdxMap = new Map<number, number>();
    const theirIdxMap = new Map<number, number>();
    for (const [itemId, tierIdx] of myMap) myIdxMap.set(itemId, tierIdx);
    for (const [itemId] of theirMap) {
      const tier = compareTiers.find((t) => t.items.includes(itemId));
      if (!tier || tier.value === 0) continue;
      const idx = tierValueToIdx.get(tier.value);
      if (idx !== undefined) theirIdxMap.set(itemId, idx);
    }

    const mat: number[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => [] as number[])
    );
    let missingMe = 0;
    let missingThem = 0;

    for (const item of items) {
      const myIdx = myIdxMap.get(item.id);
      const theirIdx = theirIdxMap.get(item.id);
      if (myIdx !== undefined && theirIdx !== undefined) {
        mat[myIdx][theirIdx].push(item.id);
      } else if (myIdx !== undefined) missingThem++;
      else if (theirIdx !== undefined) missingMe++;
    }

    return { matrix: mat, missingFromMe: missingMe, missingFromThem: missingThem };
  }, [myTiers, compareTiers, tierValueToIdx, items, n]);

  const { withinOne, perfectMatches, biggestGap, totalBoth } = useMemo(() => {
    let withinOne = 0, perfectMatches = 0, biggestGap = 0, totalBoth = 0;
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const count = matrix[ri][ci].length;
        if (!count) continue;
        const d = Math.abs(ri - ci);
        totalBoth += count;
        if (d <= 1) withinOne += count;
        if (d === 0) perfectMatches++;
        if (d > biggestGap) biggestGap = d;
      }
    }
    return { withinOne, perfectMatches, biggestGap, totalBoth };
  }, [matrix, n]);

  interface DetailItem { item: SharedListItem; myTierIdx: number; theirTierIdx: number; distance: number; }

  const detailItems = useMemo<DetailItem[]>(() => {
    if (selectedCell) {
      const [ri, ci] = selectedCell;
      return matrix[ri][ci].map((id) => ({
        item: items.find((i) => i.id === id)!,
        myTierIdx: ri,
        theirTierIdx: ci,
        distance: Math.abs(ri - ci),
      }));
    }
    const result: DetailItem[] = [];
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const d = Math.abs(ri - ci);
        if (d < 2) continue;
        for (const id of matrix[ri][ci]) {
          const item = items.find((i) => i.id === id);
          if (item) result.push({ item, myTierIdx: ri, theirTierIdx: ci, distance: d });
        }
      }
    }
    result.sort((a, b) => b.distance - a.distance);
    return result;
  }, [matrix, selectedCell, items, n]);

  const handleCellClick = (ri: number, ci: number) => {
    if (!matrix[ri][ci].length) return;
    setSelectedCell((prev) =>
      prev?.[0] === ri && prev?.[1] === ci ? null : [ri, ci]
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* All / Disagreements toggle */}
      <div
        className="flex gap-1 p-1 rounded-[8px] self-start"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        {[false, true].map((disagree) => (
          <button
            key={String(disagree)}
            onClick={() => { setDisagreementsOnly(disagree); setSelectedCell(null); }}
            className={`px-3 py-1 text-[12px] font-[500] rounded-[6px] transition-colors cursor-pointer ${
              disagreementsOnly === disagree
                ? "bg-rk-surface text-rk-primary"
                : "text-rk-muted hover:text-rk-secondary"
            }`}
          >
            {disagree ? "Disagreements only" : "All cells"}
          </button>
        ))}
      </div>

      {/* Stat tiles */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Within one tier", value: totalBoth > 0 ? `${Math.round((withinOne / totalBoth) * 100)}%` : "—" },
          { label: "Perfect matches", value: `${perfectMatches} / ${totalBoth}` },
          { label: "Biggest gap", value: biggestGap ? `${biggestGap} ${biggestGap === 1 ? "tier" : "tiers"}` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 min-w-28 bg-rk-surface border border-rk-stroke rounded-[10px] p-4">
            <p className="text-[11px] text-rk-tertiary mb-1">{label}</p>
            <p className="text-[22px] font-[500] text-rk-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Matrix */}
      <div className="mx-auto">
        <div className="inline-flex flex-col gap-1">
          <p className="text-[11px] text-rk-tertiary ml-[52px] mb-1">
            {compareLabel} →
          </p>
          <div className="flex gap-1">
            {/* Rotated y-axis label */}
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 16 }}>
              <span
                className="text-[11px] text-rk-tertiary whitespace-nowrap"
                style={{ writingMode: "vertical-lr" }}
              >
                Your stack
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {/* Their tier header */}
              <div className="flex gap-1">
                <div className="w-10 flex-shrink-0" />
                {sortedTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="w-10 h-7 flex items-center justify-center rounded-sm text-xs font-bold text-black flex-shrink-0"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.title}
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {sortedTiers.map((myTier, ri) => (
                <div key={myTier.id} className="flex gap-1">
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-sm text-xs font-bold text-black flex-shrink-0"
                    style={{ backgroundColor: myTier.color }}
                  >
                    {myTier.title}
                  </div>
                  {sortedTiers.map((_, ci) => {
                    const count = matrix[ri][ci].length;
                    const distance = Math.abs(ri - ci);
                    const isSelected = selectedCell?.[0] === ri && selectedCell?.[1] === ci;
                    const faded = disagreementsOnly && distance < 2;

                    if (!count) {
                      return (
                        <div
                          key={ci}
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        >
                          <span className="text-rk-stroke select-none">·</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={ci}
                        onClick={() => handleCellClick(ri, ci)}
                        className={`w-10 h-10 flex items-center justify-center rounded-sm text-sm font-bold text-black flex-shrink-0 transition-opacity cursor-pointer ${cellBg(distance)} ${faded ? "opacity-20" : ""} ${isSelected ? "ring-2 ring-white" : ""}`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-1 pl-[52px] flex-wrap">
            {LEGEND.map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                <span className="text-[11px] text-rk-tertiary">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="text-[13px] font-[500] text-rk-primary">
            {selectedCell
              ? `You: ${sortedTiers[selectedCell[0]].title} · ${compareLabel}: ${sortedTiers[selectedCell[1]].title}`
              : "Biggest disagreements"}
          </p>
          {selectedCell && (
            <button
              onClick={() => setSelectedCell(null)}
              className="px-3 py-1 text-[12px] text-rk-muted border border-rk-stroke rounded-[6px] hover:text-rk-secondary transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {detailItems.length === 0 ? (
          <p className="text-[13px] text-rk-tertiary italic">
            {selectedCell ? "No items in this cell" : "No major disagreements"}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {detailItems.map(({ item, myTierIdx, theirTierIdx }) => (
              <div key={item.id} className="flex items-center gap-2 bg-rk-surface border border-rk-stroke rounded-[8px] p-2 min-w-0">
                <ItemTile item={item} />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <span className="text-[12px] text-rk-secondary truncate leading-tight">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-sm text-xs font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: sortedTiers[myTierIdx].color }}
                    >
                      {sortedTiers[myTierIdx].title}
                    </div>
                    <span className="text-rk-tertiary text-[10px]">→</span>
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-sm text-xs font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: sortedTiers[theirTierIdx].color }}
                    >
                      {sortedTiers[theirTierIdx].title}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(missingFromMe > 0 || missingFromThem > 0) && (
          <div className="text-[11px] text-rk-tertiary italic flex flex-col gap-1 mt-1">
            {missingFromMe > 0 && <p>{missingFromMe} item{missingFromMe !== 1 ? "s" : ""} not ranked by you</p>}
            {missingFromThem > 0 && <p>{missingFromThem} item{missingFromThem !== 1 ? "s" : ""} not ranked by {compareLabel.toLowerCase()}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function AnonComparison({
  items,
  myTiers,
  communityTiers,
  creatorTiers,
  creatorName,
}: Props) {
  const hasCreator = !!creatorTiers?.some((t) => t.items.length > 0);
  const [mode, setMode] = useState<CompareMode>("community");

  const activeTiers = mode === "community" ? communityTiers : (creatorTiers ?? communityTiers);
  const activeLabel = mode === "community" ? "Community" : creatorName;

  return (
    <div className="flex flex-col gap-6">
      {/* Section header + mode tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] font-[500] text-rk-tertiary uppercase tracking-widest">
          Compare
        </p>
        {hasCreator && (
          <div
            className="flex gap-1 p-1 rounded-[8px]"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            {(["community", "creator"] as CompareMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-[12px] font-[500] rounded-[6px] transition-colors cursor-pointer ${
                  mode === m
                    ? "bg-rk-surface text-rk-primary"
                    : "text-rk-muted hover:text-rk-secondary"
                }`}
              >
                {m === "community" ? "vs Community" : `vs ${creatorName}`}
              </button>
            ))}
          </div>
        )}
      </div>

      <MatrixPanel
        key={mode}
        items={items}
        myTiers={myTiers}
        compareTiers={activeTiers}
        compareLabel={activeLabel}
      />
    </div>
  );
}
