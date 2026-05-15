import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const COOKIE_NAME = "rankr_anon_session";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export async function readAnonSession(): Promise<string | null> {
  const jar = await cookies();
  const val = jar.get(COOKIE_NAME)?.value ?? null;
  return val && TOKEN_RE.test(val) ? val : null;
}

export function freshAnonToken(): string {
  // 24 random bytes → 32-char base64url (no padding)
  return randomBytes(24).toString("base64url");
}

export function anonSessionCookieAttrs(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
  };
}
