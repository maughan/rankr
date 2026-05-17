import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // always fresh

export async function GET() {
  const [lists, rankings, authedRankers, anonSessions] = await Promise.all([
    prisma.list.count(),
    prisma.ranking.count({ where: { value: { not: 0 } } }),
    prisma.ranking.findMany({
      where: { is_anonymous: false, userId: { not: null }, value: { not: 0 } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.ranking.findMany({
      where: {
        is_anonymous: true,
        anonymous_session_token: { not: null },
        value: { not: 0 },
      },
      select: { anonymous_session_token: true },
      distinct: ["anonymous_session_token"],
    }),
  ]);

  return NextResponse.json({
    lists,
    rankings,
    rankers: authedRankers.length + anonSessions.length,
  });
}
