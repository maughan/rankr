// Daily cron job — recomputes taste archetypes for all eligible users.
//
// Called by Vercel Cron (see vercel.json). Protected by CRON_SECRET so
// it cannot be triggered by arbitrary HTTP requests.
//
// The job paginates users in batches of BATCH_SIZE. On Vercel Hobby the
// function timeout is 10 s; on Pro it's 300 s. If the user-base grows
// past what one invocation can handle, add cursor-based pagination using
// the `cursor` query param (future work — flag here, not in this PR).

import { prisma } from "@/lib/prisma";
import { computeArchetype } from "@/lib/server/archetype";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Pre-filter to users who have ranked at least one item — avoids loading
  // users who have never interacted, which will always return null.
  const candidates = await prisma.user.findMany({
    where: {
      rankings: { some: { value: { gt: 0 } } },
    },
    select: { id: true },
    take: BATCH_SIZE,
    orderBy: { id: "asc" },
  });

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id } of candidates) {
    try {
      const result = await computeArchetype(id);
      await (prisma.user as any).update({
        where: { id },
        data: result
          ? {
              archetype: result.archetype,
              archetype_stats: result.stats,
              archetype_computed_at: new Date(),
            }
          : {
              archetype: null,
              archetype_stats: null,
              archetype_computed_at: new Date(),
            },
      });
      result ? computed++ : cleared++;
    } catch (err) {
      console.error(`archetype cron: failed for user ${id}`, err);
      errors.push(id);
    }
  }

  return Response.json({
    processed: candidates.length,
    computed,
    cleared,
    errors,
  });
}
