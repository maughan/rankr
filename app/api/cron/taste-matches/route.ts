import { prisma } from "@/lib/prisma";
import { computeTasteMatches } from "@/lib/server/tasteMatch";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only non-private users with ranking history are matchable subjects.
   
  const candidates = (await (prisma.user as any).findMany({
    where: { profile_private: false, rankings: { some: { value: { gt: 0 } } } },
    select: { id: true, taste_matches: true },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  })) as { id: number; taste_matches: { twin?: { userId?: number } | null } | null }[];

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id, taste_matches: previous } of candidates) {
    try {
      const previousTwinUserId = previous?.twin?.userId ?? null;
      const result = await computeTasteMatches(id);
       
      await (prisma.user as any).update({
        where: { id },
        data: { taste_matches: result ?? null },
      });
      if (result) {
        computed++;
        if (result.twin && result.twin.userId !== previousTwinUserId) {
          await notify({
            recipientId: id,
            type: "new_taste_twin",
            actorId: result.twin.userId,
            meta: { twinPct: result.twin.pct },
          });
        }
      } else {
        cleared++;
      }
    } catch (err) {
      console.error(`taste-matches cron: failed for user ${id}`, err);
      errors.push(id);
    }
  }

  return Response.json({ computed, cleared, errors });
}
