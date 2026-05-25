import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";
import { readViewerCtx, fetchAccessOpts, canRank } from "@/lib/server/listAccess";

interface RankingInput {
  itemId: number;
  userId: number;
  value: number;
  listId: number;
}

export async function PUT(req: Request) {
  try {
    const body: RankingInput[] = await req.json();

    const viewer = await getAuthedViewer();
    if (!viewer) return new Response(null, { status: 401 });

    const listId = body[0]?.listId;
    if (!listId) return new Response(null, { status: 400 });

    const viewerCtx = await readViewerCtx(viewer.id, listId);
    const access = await fetchAccessOpts(listId, viewerCtx);
    if (!access) return new Response(null, { status: 404 });
    if (!canRank(access, viewerCtx)) return new Response(null, { status: 403 });

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: { items: { select: { id: true } } },
    });

    const listItemIds = list?.items.map((i) => i.id) ?? [];

    // Detect first submission (before delete)
    const prevCount = await prisma.ranking.count({
      where: { itemId: { in: listItemIds }, userId: viewer.id },
    });
    const isFirstSubmit = prevCount === 0;

    await prisma.ranking.deleteMany({
      where: { itemId: { in: listItemIds }, userId: viewer.id },
    });

    await Promise.all(
      body.map((d) =>
        prisma.ranking.create({
          data: { itemId: d.itemId, userId: d.userId, value: d.value, listId: d.listId },
        })
      )
    );

    // ── Activity events ───────────────────────────────────────────────────
    const eventOps: Promise<unknown>[] = [];

    if (isFirstSubmit) {
      eventOps.push(
        prisma.activityEvent.create({
          data: { actorId: viewer.id, type: "ranked", listId },
        })
      );
    }

    // Hot-take detection: find the user's item furthest from crowd mean (≥2 tiers)
    const allRankings = await prisma.ranking.findMany({
      where: { itemId: { in: listItemIds }, value: { gt: 0 } },
      select: { itemId: true, value: true },
    });

    const crowdVals = new Map<number, number[]>();
    for (const r of allRankings) {
      const arr = crowdVals.get(r.itemId) ?? [];
      arr.push(r.value);
      crowdVals.set(r.itemId, arr);
    }

    let maxDelta = 0;
    let hotItemId: number | null = null;
    let hotUserVal = 0;
    let hotCrowdMean = 0;

    for (const d of body) {
      if (d.value === 0) continue;
      const vals = crowdVals.get(d.itemId) ?? [];
      if (vals.length < 3) continue;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const delta = Math.abs(d.value - mean);
      if (delta > maxDelta) {
        maxDelta = delta;
        hotItemId = d.itemId;
        hotUserVal = d.value;
        hotCrowdMean = mean;
      }
    }

    // Replace any previous hot_take for this user+list with the current one
    eventOps.push(
      prisma.activityEvent.deleteMany({
        where: { actorId: viewer.id, listId, type: "hot_take" },
      })
    );
    if (hotItemId !== null && maxDelta >= 2) {
      eventOps.push(
        prisma.activityEvent.create({
          data: {
            actorId: viewer.id,
            type: "hot_take",
            listId,
            itemId: hotItemId,
            meta: { userVal: hotUserVal, crowdMean: hotCrowdMean, delta: maxDelta },
          },
        })
      );
    }

    // ── Milestone check ───────────────────────────────────────────────────
    // Only relevant on first submission by an authed ranker; fires for the
    // list creator when the logged ranker count crosses a threshold.
    if (isFirstSubmit && list) {
      const creatorId = list.createdById;
      const MILESTONES = [10, 50, 100, 500, 1000];

      // Count distinct authed first-time rankers logged so far (before this
      // submission's ranked event is committed — so prevCount = length, newCount = length+1)
      const existingRankers = await prisma.activityEvent.findMany({
        where: { listId, type: "ranked" },
        select: { actorId: true },
        distinct: ["actorId"],
      });
      const prevCount = existingRankers.length;
      const newCount = prevCount + 1;

      for (const threshold of MILESTONES) {
        if (prevCount < threshold && newCount >= threshold) {
          // Idempotency guard — concurrent submissions may both reach here, but
          // only one will succeed creating the event due to this check.
          const alreadyFired = await prisma.activityEvent.findFirst({
            where: {
              actorId: creatorId,
              listId,
              type: "milestone",
              meta: { path: ["threshold"], equals: threshold },
            },
          });
          if (!alreadyFired) {
            eventOps.push(
              prisma.activityEvent.create({
                data: {
                  actorId: creatorId,
                  type: "milestone",
                  listId,
                  meta: { threshold, ranker_count: newCount },
                },
              })
            );
          }
        }
      }
    }

    await Promise.all(eventOps);

    return Response.json({ isFirstSubmit });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
