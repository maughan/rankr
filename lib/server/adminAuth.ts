// Server-only. Never import from client components.
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

export interface AdminViewer {
  id: number;
  role: "admin" | "super_admin";
}

/**
 * Returns the authed admin viewer, or null if the caller is not admin.
 * All admin routes must call this and return 404 on null —
 * never 401/403, which would reveal that an admin surface exists.
 */
export async function getAdminViewer(): Promise<AdminViewer | null> {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      sub: number;
      tokenVersion: number;
    };

    const user = await (prisma.user as any).findUnique({
      where: { id: decoded.sub },
      select: { id: true, tokenVersion: true, role: true },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) return null;
    if (user.role !== "admin" && user.role !== "super_admin") return null;

    return { id: user.id, role: user.role };
  } catch {
    return null;
  }
}

/** Like getAdminViewer but restricted to super_admin only. */
export async function getSuperAdminViewer(): Promise<{ id: number } | null> {
  const viewer = await getAdminViewer();
  if (!viewer || viewer.role !== "super_admin") return null;
  return { id: viewer.id };
}
