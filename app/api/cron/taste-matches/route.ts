import { prisma } from "@/lib/prisma";
import { computeTasteMatches } from "@/lib/server/tasteMatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only non-private users with ranking history are matchable subjects.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = (await (prisma.user as any).findMany({
    where: { profile_private: false, rankings: { some: { value: { gt: 0 } } } },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  })) as { id: number }[];

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id } of candidates) {
    try {
      const result = await computeTasteMatches(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.user as any).update({
        where: { id },
        data: { taste_matches: result ?? null },
      });
      if (result) {
        computed++;
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
