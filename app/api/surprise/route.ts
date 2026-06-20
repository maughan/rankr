import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { listUrl } from "@/lib/listUrl";
import { NextResponse } from "next/server";

const MIN_ITEMS = 3;

export async function GET() {
  let userId: number | null = null;
  try {
    const jar = await cookies();
    const token = jar.get("auth_token")?.value;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, tokenVersion: true },
      });
      if (user && user.tokenVersion === decoded.tokenVersion) {
        userId = user.id;
      }
    }
  } catch {
    // Serve as anonymous
  }

  type Row = { id: number; short_id: string; slug: string };

  const rows = await prisma.$queryRaw<Row[]>(
    userId !== null
      ? Prisma.sql`
          SELECT l.id, l.short_id, l.slug
          FROM "List" l
          WHERE l.visibility = 'public'
            AND l."createdById" != ${userId}
            AND NOT EXISTS (
              SELECT 1 FROM "Ranking" r
              JOIN "_ItemToList" i2l ON r."itemId" = i2l."A"
              WHERE i2l."B" = l.id AND r."userId" = ${userId} AND r.value > 0
            )
            AND (
              SELECT COUNT(*) FROM "_ItemToList" i2l WHERE i2l."B" = l.id
            ) >= ${MIN_ITEMS}
          ORDER BY RANDOM()
          LIMIT 1
        `
      : Prisma.sql`
          SELECT l.id, l.short_id, l.slug
          FROM "List" l
          WHERE l.visibility = 'public'
            AND (
              SELECT COUNT(*) FROM "_ItemToList" i2l WHERE i2l."B" = l.id
            ) >= ${MIN_ITEMS}
          ORDER BY RANDOM()
          LIMIT 1
        `
  );

  if (rows.length === 0) {
    return NextResponse.json({ url: null }, { status: 404 });
  }

  const list = rows[0];
  return NextResponse.json({ url: `${listUrl(list)}/s` });
}
