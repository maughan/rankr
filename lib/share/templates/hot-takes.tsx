// Hot-takes share card — your most contrarian picks vs the community average.
// Data fetching lives here so adding a new template is one file.

import { prisma } from "@/lib/prisma";
import { Brand, ShareFoot, TierBadge } from "@/lib/share/brand";
import { ShareCardError } from "@/lib/share/errors";
import { COLORS } from "@/lib/share/tokens";
import {
  Format,
  FORMATS,
  HotTakesData,
  TemplateModule,
} from "@/lib/share/types";
import { Flame } from "lucide-react";

// ── Data fetching ─────────────────────────────────────────────────────────────

function closestTierIdx(
  avgValue: number,
  sortedTiers: { value: number; title: string }[]
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < sortedTiers.length; i++) {
    const d = Math.abs(sortedTiers[i].value - avgValue);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

async function fetchData(params: URLSearchParams): Promise<HotTakesData> {
  const token = params.get("token");
  const userIdRaw = params.get("userId");
  const anonSession = params.get("anonSession");

  if (!token) throw new ShareCardError(400, "Missing token");

  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: {
      id: true,
      title: true,
      is_shareable: true,
      tiers: { select: { id: true, title: true, value: true } },
      items: { select: { id: true, name: true } },
    },
  });

  if (!list || !list.is_shareable)
    throw new ShareCardError(404, "List not found");

  const itemIds = (list.items as { id: number }[]).map((i) => i.id);
  const sortedTiers = [...(list.tiers as { title: string; value: number }[])]
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value);

  const userId = userIdRaw ? Number(userIdRaw) : null;

  const [viewerRaw, grouped, authedCountRaw, anonCountRaw] = await Promise.all([
    userId
      ? prisma.ranking.findMany({
          where: { itemId: { in: itemIds }, userId },
          select: { itemId: true, value: true },
        })
      : anonSession
      ? (prisma.ranking as any).findMany({
          where: {
            itemId: { in: itemIds },
            anonymous_session_token: anonSession,
          },
          select: { itemId: true, value: true },
        })
      : Promise.resolve([]),
    (prisma.ranking as any).groupBy({
      by: ["itemId"],
      where: { itemId: { in: itemIds }, value: { not: 0 } },
      _avg: { value: true },
    }),
    (prisma.ranking as any).findMany({
      where: { itemId: { in: itemIds }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    (prisma.ranking as any).findMany({
      where: {
        itemId: { in: itemIds },
        anonymous_session_token: { not: null },
      },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }),
  ]);

  const viewerRankings = viewerRaw as { itemId: number; value: number }[];
  if (!viewerRankings.length)
    throw new ShareCardError(400, "Viewer has not ranked this list");

  const avgByItemId = new Map<number, number>(
    (grouped as { itemId: number; _avg: { value: number | null } }[]).map(
      (r) => [r.itemId, r._avg.value ?? 0]
    )
  );

  const rankerCount =
    (authedCountRaw as { userId: number }[]).length +
    (anonCountRaw as { anonymous_session_token: string }[]).length;

  const viewerMap = new Map<number, number>();
  for (const r of viewerRankings) {
    if (r.value === 0) continue;
    const idx = sortedTiers.findIndex((t) => t.value === r.value);
    if (idx !== -1) viewerMap.set(r.itemId, idx);
  }

  const itemById = new Map(
    (list.items as { id: number; name: string | null }[]).map((i) => [i.id, i])
  );

  const takes: Array<{
    itemName: string;
    yourTier: string;
    crowdTier: string;
    delta: number;
    absDelta: number;
  }> = [];

  for (const [itemId, viewerIdx] of viewerMap) {
    const avgVal = avgByItemId.get(itemId);
    if (avgVal === undefined) continue;

    const crowdIdx = closestTierIdx(avgVal, sortedTiers);
    const delta = crowdIdx - viewerIdx;
    const absDelta = Math.abs(delta);
    if (absDelta === 0) continue;

    const item = itemById.get(itemId);
    takes.push({
      itemName: item?.name ?? "Unknown",
      yourTier: sortedTiers[viewerIdx].title,
      crowdTier: sortedTiers[crowdIdx].title,
      delta,
      absDelta,
    });
  }

  takes.sort((a, b) => b.absDelta - a.absDelta);

  const topTakes = takes.slice(0, 3).map(({ absDelta: _, ...rest }) => rest);

  if (!topTakes.length)
    throw new ShareCardError(400, "No contrarian picks found");

  return {
    listName: list.title,
    rankerCount,
    takes: topTakes,
    shareUrl: `tierstack.dev/r/${token}`,
  };
}

// ── Typography tokens — all values are absolute px on the final canvas ─────────

type T = {
  pad: number;
  brandScale: number; // Brand component scale (text = 17 * brandScale)
  footScale: number; // ShareFoot component scale (text = 13 * footScale)
  pillFont: number; // "HOT TAKES" pill text
  pillPadH: number;
  pillPadV: number;
  pillRadius: number;
  titleFont: number; // list name
  thinFont: number; // context/subtitle text
  labelFont: number; // "Me" / "Crowd" column headers above badges
  itemFont: number; // item name inside each take row
  badge: number; // tier badge box size (letter = badge * 0.52)
  vsFont: number; // "vs" separator
  deltaFont: number; // delta pill text
  deltaPadH: number;
  deltaPadV: number;
  deltaRadius: number;
  rowPadH: number;
  rowPadV: number;
  rowGap: number;
  rowRadius: number;
  sectionGap: number; // between title block and takes block
  titleCut: number; // max chars before truncation in title
};

const TOKENS: Record<Format, T> = {
  square: {
    pad: 72,
    brandScale: 1.75, // → 30px text, 21px square
    footScale: 2.08, // → 27px
    pillFont: 27,
    pillPadH: 18,
    pillPadV: 10,
    pillRadius: 8,
    titleFont: 56,
    thinFont: 24,
    labelFont: 22,
    itemFont: 48,
    badge: 72,
    vsFont: 32,
    deltaFont: 30,
    deltaPadH: 16,
    deltaPadV: 6,
    deltaRadius: 6,
    rowPadH: 36,
    rowPadV: 32,
    rowGap: 22,
    rowRadius: 14,
    sectionGap: 52,
    titleCut: 30,
  },
  wide: {
    pad: 60,
    brandScale: 1.3, // → 22px text
    footScale: 1.62, // → 21px
    pillFont: 21,
    pillPadH: 14,
    pillPadV: 8,
    pillRadius: 7,
    titleFont: 40,
    thinFont: 17,
    labelFont: 15,
    itemFont: 33,
    badge: 52,
    vsFont: 24,
    deltaFont: 22,
    deltaPadH: 12,
    deltaPadV: 5,
    deltaRadius: 5,
    rowPadH: 22,
    rowPadV: 20,
    rowGap: 10,
    rowRadius: 10,
    sectionGap: 28,
    titleCut: 28,
  },
  story: {
    pad: 90,
    brandScale: 2.2, // → 37px text
    footScale: 2.54, // → 33px
    pillFont: 34,
    pillPadH: 22,
    pillPadV: 12,
    pillRadius: 10,
    titleFont: 68,
    thinFont: 30,
    labelFont: 28,
    itemFont: 58,
    badge: 88,
    vsFont: 40,
    deltaFont: 38,
    deltaPadH: 20,
    deltaPadV: 9,
    deltaRadius: 8,
    rowPadH: 44,
    rowPadV: 38,
    rowGap: 28,
    rowRadius: 18,
    sectionGap: 64,
    titleCut: 34,
  },
};

// ── Card rendering ────────────────────────────────────────────────────────────

function HotTakesPill({ t }: { t: T }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgba(127, 29, 29, 0.5)",
        border: "1px solid rgba(196, 69, 69, 0.4)",
        borderRadius: t.pillRadius,
        padding: `${t.pillPadV}px ${t.pillPadH}px`,
      }}
    >
      <span
        style={{
          fontSize: t.pillFont,
          fontWeight: 700,
          color: "#FCA5A5",
          letterSpacing: "0.08em",
          lineHeight: 1,
        }}
      >
        <Flame size={t.pillFont} />
        HOT TAKES
      </span>
    </div>
  );
}

function DeltaPill({ delta, t }: { delta: number; t: T }) {
  const positive = delta > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: positive
          ? "rgba(74, 138, 232, 0.18)"
          : "rgba(127, 29, 29, 0.30)",
        borderRadius: t.deltaRadius,
        padding: `${t.deltaPadV}px ${t.deltaPadH}px`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: t.deltaFont,
          fontWeight: 700,
          color: positive ? COLORS.accent : "#FCA5A5",
          lineHeight: 1,
        }}
      >
        {positive ? "+" : ""}
        {delta}
      </span>
    </div>
  );
}

function BadgeWithLabel({
  tier,
  label,
  labelColor,
  size,
  labelFont,
  showLabel,
}: {
  tier: string;
  label: string;
  labelColor: string;
  size: number;
  labelFont: number;
  showLabel: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: Math.round(labelFont * 0.35),
      }}
    >
      {showLabel ? (
        <span
          style={{
            fontSize: labelFont,
            fontWeight: 600,
            color: labelColor,
            lineHeight: 1,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      ) : (
        <span style={{ fontSize: labelFont, lineHeight: 1 }}>{" "}</span>
      )}
      <TierBadge tier={tier} size={size} />
    </div>
  );
}

function TakeRow({
  take,
  t,
  showLabels,
}: {
  take: HotTakesData["takes"][number];
  t: T;
  showLabels?: boolean;
}) {
  // Cap at 2 lines — overflow:hidden clips anything beyond
  const twoLineHeight = Math.ceil(t.itemFont * 1.15 * 2);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.stroke}`,
        borderRadius: t.rowRadius,
        padding: `${t.rowPadV}px ${t.rowPadH}px`,
        gap: t.rowPadH,
      }}
    >
      <span
        style={{
          fontSize: t.itemFont,
          fontWeight: 500,
          color: COLORS.primary,
          flex: 1,
          lineHeight: 1.15,
          overflow: "hidden",
          maxHeight: twoLineHeight,
        }}
      >
        {take.itemName}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(t.badge * 0.18),
          flexShrink: 0,
        }}
      >
        <BadgeWithLabel
          tier={take.yourTier}
          label="Me"
          labelColor={COLORS.accent}
          size={t.badge}
          labelFont={t.labelFont}
          showLabel={!!showLabels}
        />
        <span
          style={{
            fontSize: t.vsFont,
            color: COLORS.tertiary,
            lineHeight: 1,
            alignSelf: "flex-end",
            paddingBottom: Math.round(t.badge * 0.1),
          }}
        >
          vs
        </span>
        <BadgeWithLabel
          tier={take.crowdTier}
          label="Crowd"
          labelColor={COLORS.muted}
          size={t.badge}
          labelFont={t.labelFont}
          showLabel={!!showLabels}
        />
        <DeltaPill delta={take.delta} t={t} />
      </div>
    </div>
  );
}

// ── Format-specific Card layouts ──────────────────────────────────────────────

function SquareOrStoryCard({
  data,
  format,
}: {
  data: HotTakesData;
  format: "square" | "story";
}) {
  const t = TOKENS[format];
  const { width, height } = FORMATS[format];
  const otherRankers = Math.max(data.rankerCount - 1, 0);
  const title =
    data.listName.length > t.titleCut
      ? data.listName.slice(0, t.titleCut - 1) + "…"
      : data.listName;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: COLORS.page,
        padding: t.pad,
        fontFamily: "Geist",
      }}
    >
      {/* Zone A — brand row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={t.brandScale} />
        <HotTakesPill t={t} />
      </div>

      {/* Zone B — title + takes, vertically centered in remaining space */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: t.sectionGap,
        }}
      >
        {/* Title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: Math.round(t.thinFont * 0.5),
          }}
        >
          <span
            style={{
              fontSize: t.titleFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Me vs the crowd on
          </span>
          <span
            style={{
              fontSize: t.titleFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: t.thinFont,
              color: COLORS.muted,
              lineHeight: 1,
            }}
          >
            where I most disagree with {otherRankers} stacker
            {otherRankers === 1 ? "" : "s"}
          </span>
        </div>

        {/* Take rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: t.rowGap,
          }}
        >
          {data.takes.map((take, i) => (
            <TakeRow key={i} take={take} t={t} showLabels={i === 0} />
          ))}
        </div>
      </div>

      {/* Zone C — footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(t.footScale * 5),
        }}
      >
        <ShareFoot url={data.shareUrl} scale={t.footScale} />
      </div>
    </div>
  );
}

function WideCard({ data }: { data: HotTakesData }) {
  const t = TOKENS.wide;
  const { width, height } = FORMATS.wide;
  const otherRankers = Math.max(data.rankerCount - 1, 0);
  const title =
    data.listName.length > t.titleCut
      ? data.listName.slice(0, t.titleCut - 1) + "…"
      : data.listName;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        backgroundColor: COLORS.page,
        padding: t.pad,
        fontFamily: "Geist",
      }}
    >
      {/* Zone A — brand row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={t.brandScale} />
        <HotTakesPill t={t} />
      </div>

      {/* Zone B — two columns */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 48,
          marginTop: 28,
        }}
      >
        {/* Left: title */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            gap: Math.round(t.thinFont * 0.5),
          }}
        >
          <span
            style={{
              fontSize: t.titleFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Me vs the crowd on
          </span>
          <span
            style={{
              fontSize: t.titleFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.2,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: t.thinFont,
              color: COLORS.muted,
              lineHeight: 1,
            }}
          >
            where I most disagree with {otherRankers} stacker
            {otherRankers === 1 ? "" : "s"}
          </span>
        </div>

        {/* Right: take rows — centered with even gap */}
        <div
          style={{
            display: "flex",
            flex: 1.3,
            flexDirection: "column",
            justifyContent: "center",
            gap: t.rowGap,
          }}
        >
          {data.takes.map((take, i) => (
            <TakeRow key={i} take={take} t={t} showLabels={i === 0} />
          ))}
        </div>
      </div>

      {/* Zone C — footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(t.footScale * 5),
          marginTop: 20,
        }}
      >
        <ShareFoot url={data.shareUrl} scale={t.footScale} />
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export const hotTakes: TemplateModule = {
  async handler(params: URLSearchParams, format: Format) {
    const data = await fetchData(params);
    if (format === "wide") return <WideCard data={data} />;
    return <SquareOrStoryCard data={data} format={format} />;
  },
};
