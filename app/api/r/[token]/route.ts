import { NextResponse } from "next/server";
import { computeListAggregatesByToken } from "@/lib/server/aggregation";
import { computeETag, checkETagMatch } from "@/lib/server/etag";

type Params = { params: Promise<{ token: string }> };

// GET /api/r/:token — public aggregate view for a shared list
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const data = await computeListAggregatesByToken(token);

  if (!data) return new Response(null, { status: 404 });

  // Deleted by creator — share link is permanently gone.
  if (data.deleted_at) {
    return NextResponse.json({ gone: true, reason: "deleted" }, { status: 410 });
  }

  // Taken down by admin — distinguish from "never existed" (404) for the creator's benefit.
  if (data.taken_down_at) {
    return NextResponse.json(
      { gone: true, reason: "taken_down", taken_down_reason: data.taken_down_reason },
      { status: 410 }
    );
  }

  if (!data.is_shareable) return new Response(null, { status: 404 });
  // Share links only work on public lists — leaving public disables is_shareable atomically,
  // but guard here too in case of any data inconsistency.
  if (data.visibility !== "public") return new Response(null, { status: 404 });

  const etag = computeETag(data);
  if (checkETagMatch(_req, etag)) return new Response(null, { status: 304 });

  return NextResponse.json(data, { headers: { ETag: etag } });
}
