// Server-only. Never import from client components.
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export interface AuthedViewer {
  id: number;
}

/**
 * Reads and validates the auth_token cookie.
 * Returns the authenticated user or null for anonymous/invalid sessions.
 * Never throws — invalid tokens are treated as anonymous.
 */
export async function getAuthedViewer(): Promise<AuthedViewer | null> {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      sub: number;
      tokenVersion: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, tokenVersion: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) return null;
    return { id: user.id };
  } catch {
    return null;
  }
}
