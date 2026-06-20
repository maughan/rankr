// Closest-match share card — the ranker who agrees with the viewer the most.
// Green-themed mirror of taste-nemesis; same data-fetch pattern.

import { prisma } from "@/lib/prisma";
import { Brand, ShareFoot } from "@/lib/share/brand";
import { ShareCardError } from "@/lib/share/errors";
import { COLORS } from "@/lib/share/tokens";
import {
  Format,
  FORMATS,
  ClosestMatchData,
  TemplateModule,
} from "@/lib/share/types";
import { nameToColor } from "@/lib/itemColor";
import { MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS } from "@/lib/insightsConfig";

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchData(params: URLSearchParams): Promise<ClosestMatchData> {
  const token = params.get("token");
  const listIdRaw = params.get("listId");
  const userIdRaw = params.get("userId");

  if (!userIdRaw) throw new ShareCardError(400, "Sign in to see your closest match");
  const userId = Number(userIdRaw);

  let list: { id: number; title: string; items: { id: number }[] } | null = null;
  let shareUrl: string;

  if (token) {
    const found = await (prisma.list as any).findUnique({
      where: { share_token: token },
      select: { id: true, title: true, is_shareable: true, items: { select: { id: true } } },
    });
    if (!found || !found.is_shareable) throw new ShareCardError(404, "List not found");
    list = found;
    shareUrl = `tierstack.dev/r/${token}`;
  } else if (listIdRaw) {
    const found = await (prisma.list as any).findUnique({
      where: { id: Number(listIdRaw) },
      select: { id: true, title: true, items: { select: { id: true } } },
    });
    if (!found) throw new ShareCardError(404, "List not found");
    list = found;
    shareUrl = "tierstack.dev";
  } else {
    throw new ShareCardError(400, "Missing token or listId");
  }

  if (!list) throw new ShareCardError(500, "List not resolved");

  const itemIds = (list.items as { id: number }[]).map((i) => i.id);

  const [viewerRaw, otherRankings] = await Promise.all([
    prisma.ranking.findMany({
      where: { itemId: { in: itemIds }, userId, value: { gt: 0 } },
      select: { itemId: true, value: true },
    }),
    prisma.ranking.findMany({
      where: { itemId: { in: itemIds }, userId: { not: null }, value: { gt: 0 }, NOT: { userId } },
      select: { userId: true, itemId: true, value: true, user: { select: { username: true } } },
    }),
  ]);

  if (!viewerRaw.length) throw new ShareCardError(400, "You haven't ranked this list yet");

  const userValueMap = new Map<number, number>(viewerRaw.map((r) => [r.itemId, r.value]));

  const rankerMap = new Map<number, { username: string; values: Map<number, number> }>();
  for (const row of otherRankings) {
    if (row.userId === null) continue;
    const uid = row.userId as number;
    if (!rankerMap.has(uid)) {
      rankerMap.set(uid, { username: row.user?.username ?? "?", values: new Map() });
    }
    rankerMap.get(uid)!.values.set(row.itemId, row.value);
  }

  const rankerEntries = [...rankerMap.entries()]
    .sort((a, b) => b[1].values.size - a[1].values.size)
    .slice(0, 500);

  if (rankerEntries.length < MIN_OTHER_AUTHED_RANKERS_FOR_NEMESIS) {
    throw new ShareCardError(400, "Not enough rankers to identify a closest match yet");
  }

  let bestPct = -1;
  let match: { uid: number; username: string; pct: number; agreed: number; both: number } | null = null;

  for (const [uid, { username, values: theirValues }] of rankerEntries) {
    let within = 0, agreed = 0, both = 0;
    for (const [itemId, myValue] of userValueMap) {
      const theirValue = theirValues.get(itemId);
      if (theirValue === undefined) continue;
      both++;
      if (Math.abs(myValue - theirValue) <= 1) within++;
      if (myValue === theirValue) agreed++;
    }
    if (both === 0) continue;
    const pct = Math.round((within / both) * 100);
    if (pct > bestPct) {
      bestPct = pct;
      match = { uid, username, pct, agreed, both };
    }
  }

  if (!match) throw new ShareCardError(400, "Could not find a closest match");

  return {
    listName: list.title,
    matchHandle: match.username,
    matchAvatarColor: nameToColor(match.username),
    alignmentPct: match.pct,
    agreedCount: match.agreed,
    totalCount: match.both,
    shareUrl,
  };
}

// ── Typography tokens ─────────────────────────────────────────────────────────

type T = {
  pad: number;
  brandScale: number;
  footScale: number;
  heroNum: number;
  heroSym: number;
  caption: number;
  listName: number;
  heroGap: number;
  sectionGap: number;
  clLabel: number;
  clItem: number;
  clPadH: number;
  clPadV: number;
  clRadius: number;
  avatarSize: number;
  avatarFont: number;
  sepSize: number;
  titleCut: number;
};

const TOKENS: Record<Format, T> = {
  square: {
    pad: 72,
    brandScale: 1.75,
    footScale: 2.08,
    heroNum: 180,
    heroSym: 90,
    caption: 40,
    listName: 48,
    heroGap: 16,
    sectionGap: 56,
    clLabel: 24,
    clItem: 40,
    clPadH: 28,
    clPadV: 22,
    clRadius: 14,
    avatarSize: 80,
    avatarFont: 32,
    sepSize: 36,
    titleCut: 30,
  },
  wide: {
    pad: 60,
    brandScale: 1.3,
    footScale: 1.62,
    heroNum: 130,
    heroSym: 65,
    caption: 28,
    listName: 34,
    heroGap: 12,
    sectionGap: 0,
    clLabel: 19,
    clItem: 30,
    clPadH: 22,
    clPadV: 18,
    clRadius: 11,
    avatarSize: 60,
    avatarFont: 24,
    sepSize: 26,
    titleCut: 28,
  },
  story: {
    pad: 90,
    brandScale: 2.2,
    footScale: 2.54,
    heroNum: 220,
    heroSym: 110,
    caption: 50,
    listName: 58,
    heroGap: 20,
    sectionGap: 72,
    clLabel: 30,
    clItem: 50,
    clPadH: 36,
    clPadV: 28,
    clRadius: 18,
    avatarSize: 100,
    avatarFont: 40,
    sepSize: 44,
    titleCut: 34,
  },
};

const GREEN = "#5DCAA5";
const GREEN_DIM = "rgba(93,202,165,0.18)";
const GREEN_BORDER = "rgba(93,202,165,0.35)";

// ── Render components ─────────────────────────────────────────────────────────

function AvatarRow({ data, t }: { data: ClosestMatchData; t: T }) {
  const initial = (data.matchHandle[0] ?? "?").toUpperCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(t.avatarSize * 0.35) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: t.avatarSize,
          height: t.avatarSize,
          borderRadius: "50%",
          backgroundColor: COLORS.accent,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: Math.round(t.avatarFont * 0.65), fontWeight: 600, color: "#fff", lineHeight: 1 }}>
          me
        </span>
      </div>

      <span style={{ fontSize: t.sepSize, color: GREEN, lineHeight: 1, flexShrink: 0 }}>♥</span>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: t.avatarSize,
          height: t.avatarSize,
          borderRadius: "50%",
          backgroundColor: data.matchAvatarColor,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: t.avatarFont, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
          {initial}
        </span>
      </div>
    </div>
  );
}

function HeroBlock({ data, t }: { data: ClosestMatchData; t: T }) {
  const listTruncated =
    data.listName.length > t.titleCut
      ? data.listName.slice(0, t.titleCut - 1) + "…"
      : data.listName;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.heroGap }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: t.heroNum,
            fontWeight: 700,
            color: GREEN,
            lineHeight: 1,
            letterSpacing: "-3px",
          }}
        >
          {data.alignmentPct}
        </span>
        <span style={{ fontSize: t.heroSym, fontWeight: 700, color: GREEN, lineHeight: 1 }}>
          %
        </span>
      </div>

      <span style={{ fontSize: t.caption, color: COLORS.secondary, lineHeight: 1.2 }}>
        aligned with @{data.matchHandle}
      </span>

      <span style={{ fontSize: t.listName, fontWeight: 500, color: COLORS.primary, lineHeight: 1.2 }}>
        {listTruncated}
      </span>
    </div>
  );
}

function AgreementBox({ data, t }: { data: ClosestMatchData; t: T }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: GREEN_DIM,
        border: `1px solid ${GREEN_BORDER}`,
        borderRadius: t.clRadius,
        padding: `${t.clPadV}px ${t.clPadH}px`,
        gap: Math.round(t.clPadV * 0.5),
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
        BIGGEST OVERLAP
      </span>
      <span style={{ fontSize: t.clItem, color: GREEN, fontWeight: 600, lineHeight: 1.2 }}>
        Agree on {data.agreedCount} of {data.totalCount} items exactly
      </span>
    </div>
  );
}

// ── Format-specific Card layouts ──────────────────────────────────────────────

function SquareOrStoryCard({ data, format }: { data: ClosestMatchData; format: "square" | "story" }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand scale={t.brandScale} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: GREEN_DIM,
            border: `1px solid ${GREEN_BORDER}`,
            borderRadius: 8,
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: Math.round(t.brandScale * 14), fontWeight: 700, color: GREEN, letterSpacing: "0.06em", lineHeight: 1 }}>
            ✨ CLOSEST MATCH
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: t.sectionGap || 40,
        }}
      >
        <AvatarRow data={data} t={t} />
        <HeroBlock data={data} t={t} />
        <AgreementBox data={data} t={t} />
      </div>

      <ShareFoot url={data.shareUrl} scale={t.footScale} />
    </div>
  );
}

function WideCard({ data }: { data: ClosestMatchData }) {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand scale={t.brandScale} />
        <ShareFoot url={data.shareUrl} scale={t.footScale} />
      </div>

      <div style={{ display: "flex", flex: 1, gap: 56, alignItems: "center", marginTop: 32 }}>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: 24 }}>
          <AvatarRow data={data} t={t} />
          <HeroBlock data={data} t={t} />
        </div>
        <div style={{ display: "flex", flex: 1 }}>
          <AgreementBox data={data} t={t} />
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export const closestMatch: TemplateModule = {
  async handler(params: URLSearchParams, format: Format) {
    const data = await fetchData(params);
    if (format === "wide") return <WideCard data={data} />;
    return <SquareOrStoryCard data={data} format={format} />;
  },
};
