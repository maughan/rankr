"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { TierList, TierItem } from "@/app/types";
import { getUserFromToken, ImageKitLoader } from "@/lib/helpers";

function ItemTile({ item }: { item: TierItem }) {
  if (item.img) {
    return (
      <div className="w-16 h-16 relative flex-shrink-0">
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

interface Props {
  list: TierList;
  compareUserId: number;
  compareUsername: string;
}

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

function cellBg(distance: number): string {
  return DISTANCE_COLORS[Math.min(distance, DISTANCE_COLORS.length - 1)];
}

interface DetailItem {
  item: TierItem;
  myTierIdx: number;
  theirTierIdx: number;
  distance: number;
}

export default function TierComparison({
  list,
  compareUserId,
  compareUsername,
}: Props) {
  const { id: currentUserId } = getUserFromToken();
  const [disagreementsOnly, setDisagreementsOnly] = useState(false);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(
    null
  );

  // Tiers sorted high→low by value, N/A (value=0) excluded
  const sortedTiers = useMemo(
    () =>
      [...list.tiers]
        .filter((t) => t.value !== 0)
        .sort((a, b) => b.value - a.value),
    [list.tiers]
  );
  const n = sortedTiers.length;

  const tierValueToIdx = useMemo(
    () => new Map(sortedTiers.map((t, i) => [t.value, i])),
    [sortedTiers]
  );

  // Build the N×N matrix and count items missing from one ranking
  const { matrix, missingFromMe, missingFromThem } = useMemo(() => {
    const myMap = new Map<number, number>(); // itemId → tierIdx
    const theirMap = new Map<number, number>();

    for (const item of list.items) {
      const my = item.rankings.find((r) => r.userId === currentUserId);
      const their = item.rankings.find((r) => r.userId === compareUserId);
      const myIdx =
        my && my.value !== 0 ? tierValueToIdx.get(my.value) : undefined;
      const theirIdx =
        their && their.value !== 0
          ? tierValueToIdx.get(their.value)
          : undefined;
      if (myIdx !== undefined) myMap.set(item.id, myIdx);
      if (theirIdx !== undefined) theirMap.set(item.id, theirIdx);
    }

    const mat: number[][][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => [] as number[])
    );
    let missingMe = 0;
    let missingThem = 0;

    for (const item of list.items) {
      const myIdx = myMap.get(item.id);
      const theirIdx = theirMap.get(item.id);
      if (myIdx !== undefined && theirIdx !== undefined) {
        mat[myIdx][theirIdx].push(item.id);
      } else if (myIdx !== undefined) {
        missingThem++;
      } else if (theirIdx !== undefined) {
        missingMe++;
      }
    }

    return {
      matrix: mat,
      missingFromMe: missingMe,
      missingFromThem: missingThem,
    };
  }, [list.items, currentUserId, compareUserId, tierValueToIdx, n]);

  // Aggregate stats across all cells
  const { withinOne, perfectMatches, biggestGap, totalBoth } = useMemo(() => {
    let withinOne = 0;
    let perfectMatches = 0;
    let biggestGap = 0;
    let totalBoth = 0;
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const count = matrix[ri][ci].length;
        if (!count) continue;
        const d = Math.abs(ri - ci);
        totalBoth += count;
        if (d <= 1) withinOne += count;
        if (d === 0) perfectMatches += count;
        if (d > biggestGap) biggestGap = d;
      }
    }
    return { withinOne, perfectMatches, biggestGap, totalBoth };
  }, [matrix, n]);

  // Items shown in the detail panel
  const detailItems = useMemo<DetailItem[]>(() => {
    if (selectedCell) {
      const [ri, ci] = selectedCell;
      return matrix[ri][ci].map((id) => ({
        item: list.items.find((i) => i.id === id)!,
        myTierIdx: ri,
        theirTierIdx: ci,
        distance: Math.abs(ri - ci),
      }));
    }
    // Default: all items ≥2 tiers apart, sorted by distance desc
    const result: DetailItem[] = [];
    for (let ri = 0; ri < n; ri++) {
      for (let ci = 0; ci < n; ci++) {
        const d = Math.abs(ri - ci);
        if (d < 2) continue;
        for (const id of matrix[ri][ci]) {
          const item = list.items.find((i) => i.id === id);
          if (item)
            result.push({ item, myTierIdx: ri, theirTierIdx: ci, distance: d });
        }
      }
    }
    result.sort((a, b) => b.distance - a.distance);
    return result;
  }, [matrix, selectedCell, list.items, n]);

  const handleCellClick = (ri: number, ci: number) => {
    if (!matrix[ri][ci].length) return;
    setSelectedCell((prev) =>
      prev?.[0] === ri && prev?.[1] === ci ? null : [ri, ci]
    );
  };

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Header */}
      <div>
        <p className="text-2xl font-bold">{list.title}</p>
        <p className="text-sm text-gray-400">
          {list.items.length} items · You vs @{compareUsername}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setDisagreementsOnly(false)}
          className={`px-4 py-2 rounded-sm font-bold ${
            !disagreementsOnly ? "bg-white text-black" : "bg-gray-700"
          }`}
        >
          All cells
        </button>
        <button
          onClick={() => setDisagreementsOnly(true)}
          className={`px-4 py-2 rounded-sm font-bold ${
            disagreementsOnly ? "bg-white text-black" : "bg-gray-700"
          }`}
        >
          Disagreements only
        </button>
      </div>

      {/* Stat tiles */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-28 bg-gray-900 rounded-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Within one tier</p>
          <p className="text-2xl font-bold">
            {totalBoth > 0 ? Math.round((withinOne / totalBoth) * 100) : 0}%
          </p>
        </div>
        <div className="flex-1 min-w-28 bg-gray-900 rounded-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Perfect matches</p>
          <p className="text-2xl font-bold">
            {perfectMatches} / {totalBoth}
          </p>
        </div>
        <div className="flex-1 min-w-28 bg-gray-900 rounded-sm p-4">
          <p className="text-xs text-gray-400 mb-1">Biggest gap</p>
          <p className="text-2xl font-bold">
            {biggestGap} {biggestGap === 1 ? "tier" : "tiers"}
          </p>
        </div>
      </div>

      {/* Matrix */}
      <div className="mx-auto">
        <div className="inline-flex flex-col md:gap-1">
          {/* Their rank axis label */}
          <p className="text-xs text-gray-400 ml-16 mb-1">Their stack →</p>

          <div className="flex md:gap-1">
            {/* Your rank axis label (rotated) */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{ width: 16 }}
            >
              <span
                className="text-xs text-gray-400 whitespace-nowrap"
                style={{ writingMode: "vertical-lr" }}
              >
                Your stack
              </span>
            </div>

            <div className="flex flex-col md:gap-1">
              {/* Their tier header badges */}
              <div className="flex md:gap-1">
                <div className="w-10 flex-shrink-0" />{" "}
                {/* spacer over row badges */}
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
                <div key={myTier.id} className="flex md:gap-1">
                  {/* My tier badge */}
                  <div
                    className="w-10 h-10 flex items-center justify-center rounded-sm text-xs font-bold text-black flex-shrink-0"
                    style={{ backgroundColor: myTier.color }}
                  >
                    {myTier.title}
                  </div>

                  {/* Cells */}
                  {sortedTiers.map((theirTier, ci) => {
                    const count = matrix[ri][ci].length;
                    const distance = Math.abs(ri - ci);
                    const isSelected =
                      selectedCell?.[0] === ri && selectedCell?.[1] === ci;
                    const faded = disagreementsOnly && distance < 2;

                    if (!count) {
                      return (
                        <div
                          key={theirTier.id}
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                        >
                          <span className="text-gray-700 select-none">·</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={theirTier.id}
                        onClick={() => handleCellClick(ri, ci)}
                        className={`w-10 h-10 flex items-center justify-center rounded-sm text-sm font-bold text-black flex-shrink-0 transition-opacity ${cellBg(
                          distance
                        )} ${faded ? "opacity-20" : ""} ${
                          isSelected ? "ring-2 ring-white" : ""
                        }`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Color legend */}
          <div className="flex gap-4 mt-2 pl-11 flex-wrap">
            {LEGEND.map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <p className="font-bold text-sm">
            {selectedCell
              ? `You: ${sortedTiers[selectedCell[0]].title} · Them: ${
                  sortedTiers[selectedCell[1]].title
                }`
              : "Biggest disagreements"}
          </p>
          {selectedCell && (
            <button
              onClick={() => setSelectedCell(null)}
              className="px-3 py-1 bg-gray-700 rounded-sm text-xs cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {detailItems.length === 0 ? (
          <p className="text-gray-500 text-sm italic">
            {selectedCell ? "No items in this cell" : "No major disagreements"}
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
            {detailItems.map(({ item, myTierIdx, theirTierIdx }) => (
              <div
                key={item.id}
                className="flex items-center justify-between sm:gap-10 sm:mx-auto bg-rk-row border-rk-stroke p-3 rounded-[8px] sm:w-[45%]"
              >
                <div className="flex items-center gap-2">
                  <ItemTile item={item} />
                  <p className="text-sm">{item.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold text-black"
                    style={{ backgroundColor: sortedTiers[myTierIdx].color }}
                  >
                    {sortedTiers[myTierIdx].title}
                  </div>
                  <span className="text-gray-400 text-sm">→</span>
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-sm text-xs font-bold text-black"
                    style={{ backgroundColor: sortedTiers[theirTierIdx].color }}
                  >
                    {sortedTiers[theirTierIdx].title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer notes for partially-ranked lists */}
      {(missingFromMe > 0 || missingFromThem > 0) && (
        <div className="text-xs text-gray-500 italic flex flex-col gap-1">
          {missingFromMe > 0 && (
            <p>
              {missingFromMe} item{missingFromMe !== 1 ? "s" : ""} not yet
              stacked by you
            </p>
          )}
          {missingFromThem > 0 && (
            <p>
              {missingFromThem} item{missingFromThem !== 1 ? "s" : ""} not yet
              stacked by @{compareUsername}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
