// Server-only. Never import from client components.
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const IMP_COOKIE = "rk_imp";
export const IMPERSONATION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const JWT_SECRET = process.env.JWT_SECRET!;

export interface ImpersonationPayload {
  sessionId: number;
  adminId: number;
  targetUserId: number;
  targetUsername: string;
  startedAt: number; // unix ms
  expiresAt: number; // unix ms
}

/**
 * Reads + verifies the rk_imp cookie.
 * Returns null (and deletes the stale cookie) if absent, invalid, or expired.
 */
export async function getImpersonationPayload(): Promise<ImpersonationPayload | null> {
  const biscuits = await cookies();
  const raw = biscuits.get(IMP_COOKIE)?.value;
  if (!raw) return null;

  try {
    const payload = jwt.verify(raw, JWT_SECRET) as unknown as ImpersonationPayload;
    if (payload.expiresAt < Date.now()) {
      biscuits.delete(IMP_COOKIE);
      return null;
    }
    return payload;
  } catch {
    biscuits.delete(IMP_COOKIE);
    return null;
  }
}

export async function setImpersonationCookie(payload: ImpersonationPayload): Promise<void> {
  const biscuits = await cookies();
  const token = jwt.sign(payload, JWT_SECRET);
  const ttlSeconds = Math.ceil((payload.expiresAt - Date.now()) / 1000);
  biscuits.set({
    name: IMP_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  const biscuits = await cookies();
  biscuits.delete(IMP_COOKIE);
}

/**
 * Resolves the effective viewer ID from the auth_token cookie,
 * substituting the impersonation target's ID when active.
 * Use this wherever inline `softAuth` reads decoded.sub directly.
 */
export async function getEffectiveViewerId(): Promise<number | null> {
  const biscuits = await cookies();
  const token = biscuits.get("auth_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
    const adminId = decoded.sub;
    const imp = await getImpersonationPayload();
    if (imp && imp.adminId === adminId) return imp.targetUserId;
    return adminId;
  } catch {
    return null;
  }
}
