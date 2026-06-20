import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getFontConfig } from "@/lib/share/font";
import { ogListCard } from "@/lib/share/templates/og-list";
import { ogVerdictCard } from "@/lib/share/templates/og-verdict";
import { computeCrowdVerdict } from "@/lib/share/crowdVerdict";
import { computePayoff, scoreRankerPair } from "@/lib/server/payoff";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
import { getClientIp, hashIp } from "@/lib/ipHash";
import { createRateLimiter } from "@/lib/server/rateLimiter";

export const runtime = "nodejs";

// Per-IP rate limit: 60 req / min for verdict image generation.
const verdictRateLimiter = createRateLimiter({ windowMs: 60 * 1_000, max: 60 });

const SIZE = { width: 1200, height: 675 } as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  if (!ref) return new Response("Missing ref", { status: 400 });

  if (!verdictRateLimiter.check(hashIp(getClientIp(req)))) {
    return new Response("Too many requests", { status: 429 });
  }

  const payload = verifyVerdictRef(ref);
  if (!payload) return new Response("Invalid ref", { status: 404 });

  const list = (await prisma.list.findUnique({
    where: { id: payload.l },
    select: {
      title: true,
      visibility: true,
      is_shareable: true,
      createdById: true,
      createdBy: { select: { username: true, display_name: true } },
      _count: { select: { items: true, rankings: true } },
      tiers: { select: { title: true, value: true } },
      items: {
        select: { id: true, name: true, color: true, rankings: { select: { value: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })) as unknown as {
    title: string;
    visibility: string;
    is_shareable: boolean;
    createdById: number;
    createdBy: { username: string; display_name: string | null };
    _count: { items: number; rankings: number };
    tiers: { title: string; value: number }[];
    items: { id: number; name: string | null; color: string | null; rankings: { value: number }[] }[];
  } | null;

  if (!list || list.visibility !== "public" || !list.is_shareable) {
    return new Response("Not found", { status: 404 });
  }

  const fonts = await getFontConfig();
  const itemIds = list.items.map((i) => i.id);
  const creatorName = list.createdBy.display_name ?? list.createdBy.username;

  const crowdCard = () =>
    ogListCard({
      title: list.title,
      description: null,
      creator: creatorName,
      itemCount: list._count.items,
      rankerCount: list._count.rankings,
      colors: list.items.map((i) => i.color),
      verdict:
        list._count.rankings > 0
          ? computeCrowdVerdict(list.items, list.tiers)
          : null,
    });

  // The sharer's own rankings, keyed off the signed identity.
  const where =
    payload.i.k === "user"
      ? { userId: payload.i.id, itemId: { in: itemIds }, value: { gt: 0 } }
      : {
          anonymous_session_token: payload.i.sid,
          itemId: { in: itemIds },
          value: { gt: 0 },
        };

  const userRankings = (await prisma.ranking.findMany({
    where,
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];

  const render = (element: React.ReactElement) =>
    new Response(new ImageResponse(element, { ...SIZE, fonts }).body, {
      headers: {
        "Content-Type": "image/png",
        // Public + cacheable: the image is fully determined by the signed ref.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });

  // No personal data (cleared/expired session, or "crowd" template) → crowd card.
  if (payload.t === "crowd" || userRankings.length === 0) {
    return render(crowdCard());
  }

  const payoff = await computePayoff({
    listId: payload.l,
    items: list.items.map((i) => ({ id: i.id, name: i.name })),
    tiers: list.tiers,
    userRankings,
    currentUserId: payload.i.k === "user" ? payload.i.id : null,
    shareToken: null,
  });

  // Creator alignment — same "within one tier" rule as the crowd metric.
  const creatorRows = (await prisma.ranking.findMany({
    where: { userId: list.createdById, itemId: { in: itemIds }, value: { gt: 0 } },
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];

  let creatorPct: number | null = null;
  if (creatorRows.length > 0) {
    const userValueMap = new Map(userRankings.map((r) => [r.itemId, r.value]));
    const creatorValues = new Map(creatorRows.map((r) => [r.itemId, r.value]));
    const { within, both } = scoreRankerPair(userValueMap, creatorValues);
    creatorPct = both > 0 ? Math.round((within / both) * 100) : null;
  }

  return render(
    ogVerdictCard({
      title: list.title,
      crowdPct: payoff.alignment.pct,
      rankerCount: payoff.alignment.rankerCount,
      creatorPct,
      creatorHandle: creatorPct !== null ? creatorName : null,
      hottestTake: payoff.hottestTake
        ? {
            itemName: payoff.hottestTake.itemName,
            yourTier: payoff.hottestTake.yourTier,
            crowdTier: payoff.hottestTake.crowdMeanTier,
          }
        : null,
    })
  );
}
