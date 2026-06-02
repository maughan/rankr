import { NextResponse } from "next/server";
import { getProfileData } from "@/lib/server/profileData";
import { computeETag, checkETagMatch } from "@/lib/server/etag";
import { getEffectiveViewerId } from "@/lib/server/impersonation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await params;
  const username = rawUsername.toLowerCase();

  const viewerId = await getEffectiveViewerId();

  const data = await getProfileData(username, viewerId);
  if (!data) return new Response(null, { status: 404 });

  const etag = computeETag(data);
  if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

  return NextResponse.json(data, { headers: { ETag: etag } });
}
