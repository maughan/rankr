// Daily cron — permanently deletes lists whose 30-day grace period has expired.
//
// A creator soft-deletes a list (deleted_at is set). After 30 days with no
// restore, this job hard-deletes the list and all cascaded children.
// Protected by CRON_SECRET.

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - GRACE_MS);

  const expired = await (prisma.list as any).findMany({
    where: { deleted_at: { not: null, lte: cutoff } },
    select: { id: true },
  });

  const ids = expired.map((l: { id: number }) => l.id);

  if (ids.length === 0) {
    return Response.json({ deleted: 0 });
  }

  await (prisma.list as any).deleteMany({ where: { id: { in: ids } } });

  return Response.json({ deleted: ids.length, ids });
}
