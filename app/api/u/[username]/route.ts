import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getProfileData } from "@/lib/server/profileData";
import { computeETag, checkETagMatch } from "@/lib/server/etag";

function softAuth(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  const biscuits = await cookies();
  const viewerId = softAuth(biscuits.get("auth_token")?.value);

  const data = await getProfileData(username, viewerId);
  if (!data) return new Response(null, { status: 404 });

  const etag = computeETag(data);
  if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

  return NextResponse.json(data, { headers: { ETag: etag } });
}
