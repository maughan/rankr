import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyVerdictRef } from "@/lib/share/verdictRef";
import { computePayoff, scoreRankerPair } from "@/lib/server/payoff";
import { buildReveal } from "@/lib/server/reveal";
import { getAuthedViewer } from "@/lib/server/auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { ref } = await params;
  const payload = verifyVerdictRef(ref);
  if (!payload) return NextResponse.json({ error: "Invalid ref" }, { status: 404 });

  const list = (await prisma.list.findUnique({
    where: { id: payload.l },
    select: {
      visibility: true,
      is_shareable: true,
      createdById: true,
      createdBy: { select: { username: true, display_name: true } },
      items: { select: { id: true, name: true } },
      tiers: { select: { title: true, value: true } },
    },
  })) as unknown as {
    visibility: string;
    is_shareable: boolean;
    createdById: number;
    createdBy: { username: string; display_name: string | null };
    items: { id: number; name: string | null }[];
    tiers: { title: string; value: number }[];
  } | null;

  if (!list || list.visibility !== "public" || !list.is_shareable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const itemIds = list.items.map((i) => i.id);

  const viewer = await getAuthedViewer();
  const anonSession = (await cookies()).get("rankr_anon_session")?.value ?? null;

  const viewerWhere = viewer
    ? { userId: viewer.id, itemId: { in: itemIds }, value: { gt: 0 } }
    : anonSession
    ? { anonymous_session_token: anonSession, itemId: { in: itemIds }, value: { gt: 0 } }
    : null;
  if (!viewerWhere) return NextResponse.json({ error: "No ranking" }, { status: 404 });

  const viewerRankings = (await prisma.ranking.findMany({
    where: viewerWhere,
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];
  if (viewerRankings.length === 0) {
    return NextResponse.json({ error: "No ranking" }, { status: 404 });
  }

  const payoff = await computePayoff({
    listId: payload.l,
    items: list.items,
    tiers: list.tiers,
    userRankings: viewerRankings,
    currentUserId: viewer?.id ?? null,
    shareToken: null,
  });

  const sharerWhere =
    payload.i.k === "user"
      ? { userId: payload.i.id, itemId: { in: itemIds }, value: { gt: 0 } }
      : { anonymous_session_token: payload.i.sid, itemId: { in: itemIds }, value: { gt: 0 } };

  const sharerRankings = (await prisma.ranking.findMany({
    where: sharerWhere,
    select: { itemId: true, value: true },
  })) as { itemId: number; value: number }[];

  const viewerIsSharer =
    (payload.i.k === "user" && viewer?.id === payload.i.id) ||
    (payload.i.k === "anon" && anonSession !== null && anonSession === payload.i.sid);

  let vsSharer: { within: number; both: number } | null = null;
  if (!viewerIsSharer && sharerRankings.length > 0) {
    const viewerMap = new Map(viewerRankings.map((r) => [r.itemId, r.value]));
    const sharerMap = new Map(sharerRankings.map((r) => [r.itemId, r.value]));
    const { within, both } = scoreRankerPair(viewerMap, sharerMap);
    vsSharer = { within, both };
  }

  let sharerHandle: string | null = null;
  if (payload.i.k === "user") {
    if (payload.i.id === list.createdById) {
      sharerHandle = list.createdBy.display_name ?? list.createdBy.username;
    } else {
      const u = (await prisma.user.findUnique({
        where: { id: payload.i.id },
        select: { username: true, display_name: true },
      })) as { username: string; display_name: string | null } | null;
      sharerHandle = u ? u.display_name ?? u.username : null;
    }
  }

  return NextResponse.json(buildReveal({ payoff, vsSharer, sharerHandle }));
}
