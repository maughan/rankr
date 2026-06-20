import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeArchetype } from "@/lib/server/archetype";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 200;

export async function POST() {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const candidates = await prisma.user.findMany({
    where: { rankings: { some: { value: { gt: 0 } } } },
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
    } catch {
      errors.push(id);
    }
  }

  return NextResponse.json({
    processed: candidates.length,
    computed,
    cleared,
    errors,
  });
}
