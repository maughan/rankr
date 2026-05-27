import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { computeETag, checkETagMatch } from "@/lib/server/etag";
import { getAuthedViewer } from "@/lib/server/auth";
import { readViewerCtx, fetchAccessOpts, canView } from "@/lib/server/listAccess";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  { params }: Params
) {
  try {
    const { id } = await params;
    const listId = Number(id);

    const viewer = await getAuthedViewer();
    const viewerCtx = await readViewerCtx(viewer?.id ?? null, listId);
    const access = await fetchAccessOpts(listId, viewerCtx);

    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canView(access, viewerCtx)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        items: {
          include: {
            rankings: {
              include: {
                user: { select: { id: true, username: true } },
              },
            },
          },
        },
        createdBy: { select: { id: true, username: true } },
        tiers: true,
      },
    });

    if (!list) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const etag = computeETag(list);
    if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

    return NextResponse.json(list, { headers: { ETag: etag } });
  } catch (e) {
    console.log('EEE', e)
    return NextResponse.json({ error: e }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: Params
) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const list = await prisma.list.findFirst({
    where: { id: listId, createdById: viewer.id },
    select: {
      id: true,
      visibility: true,
      items: { select: { id: true } },
    },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (list.visibility !== "draft") {
    return NextResponse.json(
      { error: "Only draft lists can be deleted." },
      { status: 409 }
    );
  }

  const itemIds = list.items.map((i) => i.id);

  await prisma.$transaction(async (tx) => {
    // Delete items that belong only to this list (rankings cascade via onDelete: Cascade).
    // Items shared across lists are left intact — just disconnected when the list is removed.
    if (itemIds.length > 0) {
      const sharedItems = await tx.item.findMany({
        where: {
          id: { in: itemIds },
          lists: { some: { id: { not: listId } } },
        },
        select: { id: true },
      });
      const sharedIds = new Set(sharedItems.map((i) => i.id));
      const soloIds = itemIds.filter((id) => !sharedIds.has(id));

      if (soloIds.length > 0) {
        await tx.item.deleteMany({ where: { id: { in: soloIds } } });
      }
    }

    await tx.list.delete({ where: { id: listId } });
  });

  return NextResponse.json({ success: true });
}
