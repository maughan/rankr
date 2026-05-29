import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";

type Params = { params: Promise<{ id: string }> };

const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(_req: Request, { params }: Params) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const list = await (prisma.list as any).findFirst({
    where: { id: listId, createdById: viewer.id, deleted_at: { not: null } },
    select: { id: true, deleted_at: true },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const graceExpired =
    Date.now() - new Date(list.deleted_at).getTime() > GRACE_MS;
  if (graceExpired) {
    return NextResponse.json({ error: "Grace period expired" }, { status: 410 });
  }

  await (prisma.list as any).update({
    where: { id: listId },
    data: { deleted_at: null },
  });

  return NextResponse.json({ success: true });
}
