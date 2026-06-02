import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET() {
  const now = new Date();

  const announcement = await (prisma.announcement as any).findFirst({
    where: {
      is_active: true,
      OR: [{ starts_at: null }, { starts_at: { lte: now } }],
      AND: [{ OR: [{ ends_at: null }, { ends_at: { gte: now } }] }],
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      message: true,
      severity: true,
      audience: true,
      cta_label: true,
      cta_url: true,
    },
  });

  return NextResponse.json(
    { announcement: announcement ?? null },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
  );
}
