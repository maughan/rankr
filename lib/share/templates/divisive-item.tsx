// Divisive-item share card — the most polarising item on a list.
// Standard deviation of tier index is used to rank items by spread.

import { prisma } from "@/lib/prisma";
import { Brand, ShareFoot } from "@/lib/share/brand";
import { ShareCardError } from "@/lib/share/errors";
import { COLORS, TIER_COLORS } from "@/lib/share/tokens";
import {
  DivisiveItemData,
  Format,
  FORMATS,
  TemplateModule,
} from "@/lib/share/types";
import {
  MIN_RANKERS_FOR_INSIGHTS,
  MIN_ITEM_RANKERS_FOR_BADGE,
} from "@/lib/insightsConfig";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchData(params: URLSearchParams): Promise<DivisiveItemData> {
  const token = params.get("token");
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

  if (!list || !list.is_shareable) throw new ShareCardError(404, "List not found");

  const itemIds = (list.items as { id: number }[]).map((i) => i.id);

  const sortedTiers = [...(list.tiers as { title: string; value: number }[])]
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value);

  if (sortedTiers.length < 2) throw new ShareCardError(400, "Not enough tiers");

  const tierValueToIdx = new Map(sortedTiers.map((t, i) => [t.value, i]));

  // Per-item per-value counts
  const distRaw = await (prisma.ranking as any).groupBy({
    by: ["itemId", "value"],
    where: { itemId: { in: itemIds }, value: { gt: 0 } },
    _count: { id: true },
  }) as { itemId: number; value: number; _count: { id: number } }[];

  // Per-item total count (for ranker gate)
  const itemTotalMap = new Map<number, number>();
  for (const row of distRaw) {
    itemTotalMap.set(row.itemId, (itemTotalMap.get(row.itemId) ?? 0) + row._count.id);
  }

  // Count distinct list-level rankers for gate
  const [authedCountRaw, anonCountRaw] = await Promise.all([
    (prisma.ranking as any).findMany({
      where: { itemId: { in: itemIds }, userId: { not: null } },
      select: { userId: true },
      distinct: ["userId"],
    }) as Promise<{ userId: number }[]>,
    (prisma.ranking as any).findMany({
      where: { itemId: { in: itemIds }, anonymous_session_token: { not: null } },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }) as Promise<{ anonymous_session_token: string }[]>,
  ]);

  const rankerCount = authedCountRaw.length + anonCountRaw.length;
  if (rankerCount < MIN_RANKERS_FOR_INSIGHTS) {
    throw new ShareCardError(400, "Not enough rankers to identify a divisive item yet");
  }

  // Group distribution by itemId: { value → count }
  const distByItem = new Map<number, Map<number, number>>();
  for (const row of distRaw) {
    if (!distByItem.has(row.itemId)) distByItem.set(row.itemId, new Map());
    distByItem.get(row.itemId)!.set(row.value, row._count.id);
  }

  const itemById = new Map(
    (list.items as { id: number; name: string | null }[]).map((i) => [i.id, i])
  );

  let best: {
    itemId: number;
    itemName: string;
    sd: number;
    valueDist: Map<number, number>;
    totalRankers: number;
  } | null = null;

  for (const [itemId, valueDist] of distByItem) {
    const total = itemTotalMap.get(itemId) ?? 0;
    if (total < MIN_ITEM_RANKERS_FOR_BADGE) continue;

    const indices: number[] = [];
    for (const [value, count] of valueDist) {
      const idx = tierValueToIdx.get(value);
      if (idx === undefined) continue;
      for (let k = 0; k < count; k++) indices.push(idx);
    }
    if (indices.length < 2) continue;

    const mean = indices.reduce((s, v) => s + v, 0) / indices.length;
    const variance = indices.reduce((s, v) => s + (v - mean) ** 2, 0) / indices.length;
    const sd = Math.sqrt(variance);

    if (!best || sd > best.sd) {
      best = {
        itemId,
        itemName: itemById.get(itemId)?.name ?? "Unknown",
        sd,
        valueDist,
        totalRankers: total,
      };
    }
  }

  if (!best) throw new ShareCardError(400, "No divisive item found");

  const distribution = sortedTiers.map((tier) => ({
    tierTitle: tier.title,
    tierValue: tier.value,
    count: best!.valueDist.get(tier.value) ?? 0,
    maxCount: Math.max(...sortedTiers.map((t) => best!.valueDist.get(t.value) ?? 0), 1),
  }));

  return {
    listName: list.title,
    itemName: best.itemName,
    rankerCount: best.totalRankers,
    distribution,
    shareUrl: `tierstack.dev/r/${token}`,
  };
}

// ── Typography tokens ─────────────────────────────────────────────────────────

type T = {
  pad: number;
  brandScale: number;
  footScale: number;
  pillFont: number;
  pillPadH: number;
  pillPadV: number;
  pillRadius: number;
  itemFont: number;
  captionFont: number;
  listNameFont: number;
  barMaxH: number;
  barWidth: number;
  barGap: number;
  barLabelFont: number;
  sectionGap: number;
  titleCut: number;
  itemCut: number;
};

const TOKENS: Record<Format, T> = {
  square: {
    pad: 72,
    brandScale: 1.75,
    footScale: 2.08,
    pillFont: 24,
    pillPadH: 16,
    pillPadV: 9,
    pillRadius: 8,
    itemFont: 68,
    captionFont: 30,
    listNameFont: 28,
    barMaxH: 120,
    barWidth: 68,
    barGap: 14,
    barLabelFont: 30,
    sectionGap: 52,
    titleCut: 30,
    itemCut: 20,
  },
  wide: {
    pad: 60,
    brandScale: 1.3,
    footScale: 1.62,
    pillFont: 18,
    pillPadH: 12,
    pillPadV: 7,
    pillRadius: 6,
    itemFont: 50,
    captionFont: 22,
    listNameFont: 20,
    barMaxH: 90,
    barWidth: 52,
    barGap: 10,
    barLabelFont: 22,
    sectionGap: 28,
    titleCut: 28,
    itemCut: 18,
  },
  story: {
    pad: 90,
    brandScale: 2.2,
    footScale: 2.54,
    pillFont: 30,
    pillPadH: 20,
    pillPadV: 11,
    pillRadius: 10,
    itemFont: 84,
    captionFont: 38,
    listNameFont: 36,
    barMaxH: 150,
    barWidth: 84,
    barGap: 18,
    barLabelFont: 38,
    sectionGap: 64,
    titleCut: 34,
    itemCut: 24,
  },
};

// ── Render components ─────────────────────────────────────────────────────────

function DivisivePill({ t }: { t: T }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "rgba(173,147,250,0.15)",
        border: "1px solid rgba(173,147,250,0.35)",
        borderRadius: t.pillRadius,
        padding: `${t.pillPadV}px ${t.pillPadH}px`,
      }}
    >
      <span
        style={{
          fontSize: t.pillFont,
          fontWeight: 700,
          color: "#C4B5FD",
          letterSpacing: "0.07em",
          lineHeight: 1,
        }}
      >
        ⚡ MOST DIVISIVE
      </span>
    </div>
  );
}

function Histogram({
  distribution,
  t,
}: {
  distribution: DivisiveItemData["distribution"];
  t: T;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: t.barGap,
      }}
    >
      {distribution.map((d) => {
        const colors = TIER_COLORS[d.tierTitle.toUpperCase()] ?? {
          bg: "#334155",
          text: "#fff",
        };
        const barH =
          d.count > 0
            ? Math.max(Math.round((d.count / d.maxCount) * t.barMaxH), 4)
            : 4;

        return (
          <div
            key={d.tierTitle}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: Math.round(t.barLabelFont * 0.35),
            }}
          >
            <div
              style={{
                width: t.barWidth,
                height: barH,
                backgroundColor: d.count > 0 ? colors.bg : "rgba(255,255,255,0.06)",
                borderRadius: `${Math.round(t.barWidth * 0.08)}px ${Math.round(t.barWidth * 0.08)}px 0 0`,
              }}
            />
            <span
              style={{
                fontSize: t.barLabelFont,
                fontWeight: 700,
                color: d.count > 0 ? colors.bg : COLORS.tertiary,
                lineHeight: 1,
              }}
            >
              {d.tierTitle}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Format-specific layouts ───────────────────────────────────────────────────

function SquareOrStoryCard({
  data,
  format,
}: {
  data: DivisiveItemData;
  format: "square" | "story";
}) {
  const t = TOKENS[format];
  const { width, height } = FORMATS[format];
  const itemTruncated =
    data.itemName.length > t.itemCut
      ? data.itemName.slice(0, t.itemCut - 1) + "…"
      : data.itemName;
  const listTruncated =
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
      {/* Zone A — brand + pill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand scale={t.brandScale} />
        <DivisivePill t={t} />
      </div>

      {/* Zone B — item name + histogram, vertically centered */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: t.sectionGap,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(t.captionFont * 0.5) }}>
          <span
            style={{
              fontSize: t.itemFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {itemTruncated}
          </span>
          <span style={{ fontSize: t.captionFont, color: COLORS.muted, lineHeight: 1 }}>
            {data.rankerCount} ranker{data.rankerCount !== 1 ? "s" : ""}. Zero consensus.
          </span>
          <span style={{ fontSize: t.listNameFont, color: COLORS.tertiary, lineHeight: 1 }}>
            on {listTruncated}
          </span>
        </div>

        <Histogram distribution={data.distribution} t={t} />
      </div>

      {/* Zone C — footer */}
      <ShareFoot url={data.shareUrl} scale={t.footScale} />
    </div>
  );
}

function WideCard({ data }: { data: DivisiveItemData }) {
  const t = TOKENS.wide;
  const { width, height } = FORMATS.wide;
  const itemTruncated =
    data.itemName.length > t.itemCut
      ? data.itemName.slice(0, t.itemCut - 1) + "…"
      : data.itemName;
  const listTruncated =
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
      {/* Zone A — brand left, pill + footer right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand scale={t.brandScale} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <DivisivePill t={t} />
          <ShareFoot url={data.shareUrl} scale={t.footScale} />
        </div>
      </div>

      {/* Zone B — left: text; right: histogram */}
      <div style={{ display: "flex", flex: 1, gap: 56, alignItems: "center", marginTop: 28 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: Math.round(t.captionFont * 0.5) }}>
          <span
            style={{
              fontSize: t.itemFont,
              fontWeight: 700,
              color: COLORS.primary,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {itemTruncated}
          </span>
          <span style={{ fontSize: t.captionFont, color: COLORS.muted, lineHeight: 1 }}>
            {data.rankerCount} rankers. Zero consensus.
          </span>
          <span style={{ fontSize: t.listNameFont, color: COLORS.tertiary, lineHeight: 1 }}>
            on {listTruncated}
          </span>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
          <Histogram distribution={data.distribution} t={t} />
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export const divisiveItem: TemplateModule = {
  async handler(params: URLSearchParams, format: Format) {
    const data = await fetchData(params);
    if (format === "wide") return <WideCard data={data} />;
    return <SquareOrStoryCard data={data} format={format} />;
  },
};
