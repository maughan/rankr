import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  username: string;
}

function isAuthTokenPayload(
  payload: JwtPayload | string
): payload is AuthTokenPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof payload.sub === "number" &&
    typeof (payload as any).username === "string"
  );
}

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUserFromRequest() {
  const biscuits = await cookies();
  const token = biscuits.get("auth_token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!isAuthTokenPayload(decoded)) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
