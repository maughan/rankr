import { NextResponse } from "next/server";
import { computeListAggregatesByToken } from "@/lib/server/aggregation";
import { computeETag, checkETagMatch } from "@/lib/server/etag";

type Params = { params: Promise<{ token: string }> };

// GET /api/r/:token — public aggregate view for a shared list
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const data = await computeListAggregatesByToken(token);

  if (!data) return new Response(null, { status: 404 });
  if (!data.is_shareable) return new Response(null, { status: 404 });

  const etag = computeETag(data);
  if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

  return NextResponse.json(data, { headers: { ETag: etag } });
}
