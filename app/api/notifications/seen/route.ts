import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";

export async function POST(req: Request) {
  const viewer = await getAuthedViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { ids?: number[] };
  const db = prisma as any;

  await db.notification.updateMany({
    where: {
      recipientId: viewer.id,
      read_at: null,
      ...(Array.isArray(body.ids) && body.ids.length > 0 ? { id: { in: body.ids } } : {}),
    },
    data: { read_at: new Date() },
  });

  return NextResponse.json({ ok: true });
}
