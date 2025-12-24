import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;

    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const lists = await prisma.list.findMany({
      where: {
        createdById: user.id,
      },
      include: {
        items: {
          include: {
            rankings: true,
          },
        },
      },
    });

    return NextResponse.json({ lists });
  } catch (e) {
    return NextResponse.error();
  }
}
