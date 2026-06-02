import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getImpersonationPayload } from "./server/impersonation";

export interface AuthTokenPayload {
  sub: number;
  username: string;
  email: string;
  role?: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

function isAuthTokenPayload(decoded: unknown): decoded is AuthTokenPayload {
  return (
    typeof decoded === "object" &&
    decoded !== null &&
    typeof (decoded as AuthTokenPayload).sub === "number" &&
    typeof (decoded as AuthTokenPayload).username === "string"
  );
}

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Returns the authenticated user's token payload.
 * During impersonation, substitutes sub/username with the target user's
 * values so read-path routes reflect the target's identity.
 */
export async function getUserFromRequest() {
  const biscuits = await cookies();
  const token = biscuits.get("auth_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;
    if (!isAuthTokenPayload(decoded)) return null;

    // Substitute effective identity during impersonation.
    const imp = await getImpersonationPayload();
    if (imp && imp.adminId === decoded.sub) {
      return {
        ...decoded,
        sub: imp.targetUserId,
        username: imp.targetUsername,
        // role stays as admin's role — permission checks remain on the real user
        isImpersonating: true as const,
      };
    }

    return { ...decoded, isImpersonating: false as const };
  } catch {
    return null;
  }
}
