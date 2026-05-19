import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await (prisma.user as any).findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        bio: true,
        username_changed_at: true,
        tokenVersion: true,
      },
    }) as {
      id: number;
      username: string;
      email: string | null;
      display_name: string | null;
      bio: string | null;
      username_changed_at: Date | null;
      tokenVersion: number;
    } | null;

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return new Response(null, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      bio: user.bio,
      username_changed_at: user.username_changed_at?.toISOString() ?? null,
    });
  } catch {
    return new Response(null, { status: 401 });
  }
}
