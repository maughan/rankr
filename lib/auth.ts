import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface AuthTokenPayload {
  sub: number;
  username: string;
  email: string;
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

export async function getUserFromRequest() {
  const biscuits = await cookies();
  const token = biscuits.get("auth_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;

    if (!isAuthTokenPayload(decoded)) return null;

    return decoded;
  } catch {
    return null;
  }
}
