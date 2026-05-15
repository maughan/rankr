import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { readAnonSession, freshAnonToken, anonSessionCookieAttrs } from "@/lib/anonSession";
import { getClientIp, hashIp } from "@/lib/ipHash";
import { rateLimitKey, checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ token: string }> };

interface SubmittedRanking {
  itemId: number;
  value: number;
}

// POST /api/r/:token/rank — anonymous ranking submission for a shared list
export async function POST(req: Request, { params }: Params) {
  const { token } = await params;

  // Resolve list by share_token
  const list = await (prisma.list as any).findUnique({
    where: { share_token: token },
    select: {
      id: true,
      is_shareable: true,
      anonymous_rankings_enabled: true,
      items: { select: { id: true } },
    },
  });

  if (!list || !list.is_shareable) return new Response(null, { status: 404 });
  if (!list.anonymous_rankings_enabled) {
    return NextResponse.json(
      { error: "Anonymous rankings are disabled for this list." },
      { status: 403 }
    );
  }

  // Anonymous session identity
  const existingSession = await readAnonSession();
  const sessionToken = existingSession ?? freshAnonToken();
  const isNewSession = !existingSession;

  // Rate limiting
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);
  const rlKey = rateLimitKey(ipHash, sessionToken, list.id);
  const { allowed } = checkRateLimit(rlKey);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait before trying again." },
      { status: 429 }
    );
  }

  // Validate request body
  let body: SubmittedRanking[];
  try {
    body = await req.json();
    if (!Array.isArray(body) || body.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const listItemIds = new Set<number>(list.items.map((i: { id: number }) => i.id));

  // All submitted items must belong to this list
  if (!body.every((r) => listItemIds.has(r.itemId) && typeof r.value === "number")) {
    return NextResponse.json({ error: "Invalid items." }, { status: 400 });
  }

  // Replace previous anonymous submission for this session on this list
  await (prisma.ranking as any).deleteMany({
    where: {
      itemId: { in: Array.from(listItemIds) },
      anonymous_session_token: sessionToken,
    },
  });

  await (prisma.ranking as any).createMany({
    data: body.map((r) => ({
      itemId: r.itemId,
      value: r.value,
      listId: list.id,
      is_anonymous: true,
      anonymous_session_token: sessionToken,
      submitter_ip_hash: ipHash,
    })),
  });

  const res = NextResponse.json({ ok: true }, { status: 201 });

  if (isNewSession) {
    res.cookies.set(anonSessionCookieAttrs(sessionToken));
  }

  return res;
}
