// Head-to-head share card — your tier placements vs the list creator's.
// Data fetching lives here so adding a new template is one file.

import { prisma } from "@/lib/prisma";
import { Brand, ShareFoot, TierBadge } from "@/lib/share/brand";
import { ShareCardError } from "@/lib/share/errors";
import { COLORS } from "@/lib/share/tokens";
import {
  Format,
  FORMATS,
  HeadToHeadData,
  TemplateModule,
} from "@/lib/share/types";

// ── Data fetching ─────────────────────────────────────────────────────────────

function buildTierMap(
  rankings: { itemId: number; value: number }[],
  sortedTiers: { value: number }[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const r of rankings) {
    if (r.value === 0) continue;
    const idx = sortedTiers.findIndex((t) => t.value === r.value);
    if (idx !== -1) map.set(r.itemId, idx);
  }
  return map;
}

async function fetchData(params: URLSearchParams): Promise<HeadToHeadData> {
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
      createdById: true,
      createdBy: { select: { username: true } },
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

  // Creator comparing against themselves is trivially 100% — not useful.
  if (userId !== null && userId === list.createdById)
    throw new ShareCardError(
      409,
      "You created this list. Share the link with others first — head-to-head shows how their rankings compare to yours."
    );

  const [viewerRaw, creatorRaw] = await Promise.all([
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
    prisma.ranking.findMany({
      where: { itemId: { in: itemIds }, userId: list.createdById },
      select: { itemId: true, value: true },
    }),
  ]);

  const viewerRankings = viewerRaw as { itemId: number; value: number }[];
  const creatorRankings = creatorRaw as { itemId: number; value: number }[];

  if (!viewerRankings.length)
    throw new ShareCardError(400, "Viewer has not ranked this list");
  if (!creatorRankings.length)
    throw new ShareCardError(400, "Creator has not ranked this list");

  const myMap = buildTierMap(viewerRankings, sortedTiers);
  const theirMap = buildTierMap(creatorRankings, sortedTiers);

  let totalRanked = 0;
  let withinOne = 0;
  let perfectMatches = 0;
  let biggestDist = 0;
  let biggestGapItem: { id: number; name: string | null } | null = null;
  let biggestGapMyTier = "";
  let biggestGapTheirTier = "";

  for (const item of list.items as { id: number; name: string | null }[]) {
    const myIdx = myMap.get(item.id);
    const theirIdx = theirMap.get(item.id);
    if (myIdx === undefined || theirIdx === undefined) continue;

    totalRanked++;
    const d = Math.abs(myIdx - theirIdx);
    if (d <= 1) withinOne++;
    if (d === 0) perfectMatches++;
    if (d > biggestDist) {
      biggestDist = d;
      biggestGapItem = item;
      biggestGapMyTier = sortedTiers[myIdx].title;
      biggestGapTheirTier = sortedTiers[theirIdx].title;
    }
  }

  const alignmentPct =
    totalRanked > 0 ? Math.round((withinOne / totalRanked) * 100) : 0;

  const biggestGap = biggestGapItem
    ? {
        itemName: biggestGapItem.name ?? "Unknown",
        yourTier: biggestGapMyTier,
        theirTier: biggestGapTheirTier,
      }
    : null;

  return {
    alignmentPct,
    creatorHandle: list.createdBy.username
      ? `@${list.createdBy.username}`
      : null,
    listName: list.title,
    biggestGap,
    perfectMatches,
    totalRanked,
    shareUrl: `tierstack.dev/r/${token}`,
  };
}

// ── Typography tokens ─────────────────────────────────────────────────────────

type T = {
  pad: number;
  brandScale: number; // Brand component scale (text = 17 * brandScale)
  footScale: number; // ShareFoot scale (text = 13 * footScale)
  heroNum: number; // alignment % number
  heroSym: number; // "%" symbol
  caption: number; // "aligned with @x"
  listName: number; // list name beneath caption
  heroGap: number; // gap between hero text elements
  sectionGap: number; // between hero block and callout box
  clLabel: number; // "BIGGEST DISAGREEMENT" label
  clItem: number; // item name inside callout
  clArrow: number; // "you → them" arrow/vs
  clBadge: number; // tier badge size inside callout
  clPadH: number;
  clPadV: number;
  clInnerGap: number; // gap between label and item row inside callout
  clRadius: number;
  titleCut: number; // max chars for list name
  itemCut: number; // max chars for callout item name
};

const TOKENS: Record<Format, T> = {
  square: {
    pad: 72,
    brandScale: 1.75, // → 30px text
    footScale: 2.08, // → 27px
    heroNum: 180,
    heroSym: 90,
    caption: 40,
    listName: 48,
    heroGap: 16,
    sectionGap: 56,
    clLabel: 24,
    clItem: 40,
    clArrow: 28,
    clBadge: 64,
    clPadH: 28,
    clPadV: 22,
    clInnerGap: 16,
    clRadius: 14,
    titleCut: 30,
    itemCut: 24,
  },
  wide: {
    pad: 60,
    brandScale: 1.3, // → 22px text
    footScale: 1.62, // → 21px
    heroNum: 130,
    heroSym: 65,
    caption: 28,
    listName: 34,
    heroGap: 12,
    sectionGap: 0, // wide uses side-by-side, no vertical section gap
    clLabel: 19,
    clItem: 30,
    clArrow: 22,
    clBadge: 52,
    clPadH: 22,
    clPadV: 18,
    clInnerGap: 12,
    clRadius: 11,
    titleCut: 28,
    itemCut: 22,
  },
  story: {
    pad: 90,
    brandScale: 2.2, // → 37px text
    footScale: 2.54, // → 33px
    heroNum: 220,
    heroSym: 110,
    caption: 50,
    listName: 58,
    heroGap: 20,
    sectionGap: 72,
    clLabel: 30,
    clItem: 50,
    clArrow: 36,
    clBadge: 80,
    clPadH: 36,
    clPadV: 28,
    clInnerGap: 20,
    clRadius: 18,
    titleCut: 34,
    itemCut: 28,
  },
};

// ── Render components ─────────────────────────────────────────────────────────

function HeroBlock({ data, t }: { data: HeadToHeadData; t: T }) {
  const creatorLabel = data.creatorHandle ?? "the creator";
  const listTruncated =
    data.listName.length > t.titleCut
      ? data.listName.slice(0, t.titleCut - 1) + "…"
      : data.listName;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.heroGap,
      }}
    >
      {/* Big alignment % */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: t.heroNum,
            fontWeight: 700,
            color: COLORS.primary,
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {data.alignmentPct}
        </span>
        <span
          style={{
            fontSize: t.heroSym,
            fontWeight: 700,
            color: COLORS.accent,
            lineHeight: 1,
          }}
        >
          %
        </span>
      </div>

      {/* Caption */}
      <span
        style={{
          fontSize: t.caption,
          color: COLORS.secondary,
          lineHeight: 1.2,
        }}
      >
        aligned with {creatorLabel}
      </span>

      {/* List name */}
      <span
        style={{
          fontSize: t.listName,
          fontWeight: 500,
          color: COLORS.primary,
          lineHeight: 1.2,
        }}
      >
        {listTruncated}
      </span>
    </div>
  );
}

function CalloutBox({ data, t }: { data: HeadToHeadData; t: T }) {
  // 100% alignment
  if (data.alignmentPct === 100) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(74, 138, 232, 0.12)",
          border: "1px solid rgba(74, 138, 232, 0.3)",
          borderRadius: t.clRadius,
          padding: `${t.clPadV}px ${t.clPadH}px`,
        }}
      >
        <span
          style={{
            fontSize: t.clItem,
            color: COLORS.accent,
            fontWeight: 500,
          }}
        >
          You agree on everything
        </span>
      </div>
    );
  }

  // No meaningful gap — show perfect match count
  if (!data.biggestGap) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(30, 44, 68, 0.6)",
          border: `1px solid ${COLORS.stroke}`,
          borderRadius: t.clRadius,
          padding: `${t.clPadV}px ${t.clPadH}px`,
        }}
      >
        <span
          style={{
            fontSize: t.clItem,
            color: COLORS.secondary,
            fontWeight: 500,
          }}
        >
          {data.perfectMatches} / {data.totalRanked} perfect matches
        </span>
      </div>
    );
  }

  // Biggest disagreement
  const { itemName, yourTier, theirTier } = data.biggestGap;
  const itemTruncated =
    itemName.length > t.itemCut
      ? itemName.slice(0, t.itemCut - 1) + "…"
      : itemName;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(127, 29, 29, 0.2)",
        border: "1px solid rgba(127, 29, 29, 0.45)",
        borderRadius: t.clRadius,
        padding: `${t.clPadV}px ${t.clPadH}px`,
        gap: t.clInnerGap,
      }}
    >
      <span
        style={{
          fontSize: t.clLabel,
          fontWeight: 700,
          color: COLORS.muted,
          letterSpacing: "0.10em",
        }}
      >
        BIGGEST DISAGREEMENT
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: t.clPadH,
        }}
      >
        <span
          style={{
            fontSize: t.clItem,
            color: COLORS.primary,
            fontWeight: 500,
            flex: 1,
            lineHeight: 1.2,
          }}
        >
          {itemTruncated}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(t.clBadge * 0.18),
            flexShrink: 0,
          }}
        >
          <TierBadge tier={yourTier} size={t.clBadge} />
          <span
            style={{
              fontSize: t.clArrow,
              color: COLORS.tertiary,
              lineHeight: 1,
            }}
          >
            vs
          </span>
          <TierBadge tier={theirTier} size={t.clBadge} />
        </div>
      </div>
    </div>
  );
}

// ── Format-specific Card layouts ──────────────────────────────────────────────

function SquareOrStoryCard({
  data,
  format,
}: {
  data: HeadToHeadData;
  format: "square" | "story";
}) {
  const t = TOKENS[format];
  const { width, height } = FORMATS[format];

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
      {/* Zone A — brand */}
      <Brand scale={t.brandScale} />

      {/* Zone B — hero + callout, centered vertically */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: t.sectionGap,
        }}
      >
        <HeroBlock data={data} t={t} />
        <CalloutBox data={data} t={t} />
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

function WideCard({ data }: { data: HeadToHeadData }) {
  const t = TOKENS.wide;
  const { width, height } = FORMATS.wide;

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
      {/* Zone A — brand left, tagline+URL right */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Brand scale={t.brandScale} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: Math.round(t.footScale * 5),
          }}
        >
          <ShareFoot url={data.shareUrl} scale={t.footScale} />
        </div>
      </div>

      {/* Zone B — hero left, callout right */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 56,
          alignItems: "center",
          marginTop: 32,
        }}
      >
        <div style={{ display: "flex", flex: 1 }}>
          <HeroBlock data={data} t={t} />
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          <CalloutBox data={data} t={t} />
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export const headToHead: TemplateModule = {
  async handler(params: URLSearchParams, format: Format) {
    const data = await fetchData(params);
    if (format === "wide") return <WideCard data={data} />;
    return <SquareOrStoryCard data={data} format={format} />;
  },
};
