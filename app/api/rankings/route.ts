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

    return Response.json({ isFirstSubmit });
  } catch (e) {
    console.error(e);
    return new Response(null, { status: 500 });
  }
}
