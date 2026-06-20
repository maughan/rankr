// Server-only. Never import from client components.
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { getImpersonationPayload } from "./impersonation";

export interface AuthedViewer {
  id: number;
  /** True when the caller is an admin viewing as another user. */
  isImpersonating?: boolean;
}

/**
 * Reads and validates the auth_token cookie.
 * During impersonation, returns the target user's id so read-path
 * queries automatically reflect the target's data.
 * Returns null for anonymous/invalid sessions.
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

    // Check for active impersonation — reads run as the target user.
    const imp = await getImpersonationPayload();
    if (imp && imp.adminId === user.id) {
      return { id: imp.targetUserId, isImpersonating: true };
    }

    return { id: user.id, isImpersonating: false };
  } catch {
    return null;
  }
}
