import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { computeETag, checkETagMatch } from "@/lib/server/etag";
import { getAuthedViewer } from "@/lib/server/auth";
import { readViewerCtx, fetchAccessOpts, canView } from "@/lib/server/listAccess";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
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
    return NextResponse.json({ error: e }, { status: 500 });
  }
}
