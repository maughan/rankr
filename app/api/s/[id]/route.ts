import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { computeETag, checkETagMatch } from "@/lib/server/etag";
import { getAuthedViewer } from "@/lib/server/auth";
import { readViewerCtx, fetchAccessOpts, canView } from "@/lib/server/listAccess";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

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

// DELETE /api/s/:id — soft-delete a list the viewer owns.
// Sets deleted_at, disables the share link, and starts the 30-day grace period.
// A background cron job hard-deletes lists past the grace window.
export async function DELETE(
  _req: Request,
  { params }: Params
) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const list = await (prisma.list as any).findFirst({
    where: { id: listId, createdById: viewer.id, deleted_at: null },
    select: { id: true, category: true },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await (prisma.list as any).update({
    where: { id: listId },
    data: {
      deleted_at: new Date(),
      // Immediately disable the share link so /r/:token returns 410
      is_shareable: false,
      share_token: null,
      share_token_created_at: null,
    },
  });

  await captureServer(String(viewer.id), E.LIST_DELETED, { list_id: listId });

  return NextResponse.json({ success: true });
}
