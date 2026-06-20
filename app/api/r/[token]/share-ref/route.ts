import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";
import {
  signVerdictRef,
  VerdictIdentity,
  VerdictTemplate,
} from "@/lib/share/verdictRef";
import { getClientIp, hashIp } from "@/lib/ipHash";
import { createRateLimiter } from "@/lib/server/rateLimiter";

type Params = { params: Promise<{ token: string }> };

const TEMPLATES: VerdictTemplate[] = ["verdict", "hot-takes", "crowd"];

const mintRateLimiter = createRateLimiter({ windowMs: 60 * 1_000, max: 60 });

// POST /api/r/:token/share-ref  { template? } → { url }
// Mints a signed verdict link for the *current* viewer. Identity is resolved
// server-side (cookies), never trusted from the client — so nobody can mint a
// verdict link for another person's result.
export async function POST(req: Request, { params }: Params) {
  if (!mintRateLimiter.check(hashIp(getClientIp(req)))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;

  const body = (await req.json().catch(() => ({}))) as { template?: string };
  const template: VerdictTemplate = TEMPLATES.includes(
    body.template as VerdictTemplate
  )
    ? (body.template as VerdictTemplate)
    : "verdict";

  const list = (await prisma.list.findUnique({
    where: { share_token: token },
    select: { id: true, is_shareable: true, items: { select: { id: true } } },
  })) as { id: number; is_shareable: boolean; items: { id: number }[] } | null;

  if (!list || !list.is_shareable) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewer = await getAuthedViewer();
  let identity: VerdictIdentity | null = null;
  if (viewer) {
    identity = { k: "user", id: viewer.id };
  } else {
    const anonSession = (await cookies()).get("rankr_anon_session")?.value;
    if (anonSession) identity = { k: "anon", sid: anonSession };
  }

  if (!identity) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  // Personal templates require an actual ranking; "crowd" never does.
  if (template !== "crowd") {
    const itemIds = list.items.map((i) => i.id);
    const where =
      identity.k === "user"
        ? { userId: identity.id, itemId: { in: itemIds }, value: { gt: 0 } }
        : {
            anonymous_session_token: identity.sid,
            itemId: { in: itemIds },
            value: { gt: 0 },
          };
    const hasRanking = await prisma.ranking.findFirst({
      where,
      select: { id: true },
    });
    if (!hasRanking) {
      return NextResponse.json(
        { error: "No ranking to share" },
        { status: 422 }
      );
    }
  }

  const ref = signVerdictRef({ l: list.id, i: identity, t: template });
  // Canonical share link is the challenge route: it unfurls as the verdict
  // card (reuses /api/og/verdict) and clicking opens the blind-compare flow.
  return NextResponse.json({ url: `/c/${ref}` });
}
