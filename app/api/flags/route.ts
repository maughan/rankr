import { NextResponse } from "next/server";
import { getAllFlags } from "@/lib/server/featureFlags";

// Cached for 30 s at the CDN so middleware can fetch this without per-request DB hits.
export const dynamic = "force-dynamic";

export async function GET() {
  const flags = await getAllFlags();
  return NextResponse.json(flags, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
