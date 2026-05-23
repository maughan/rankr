import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { SITE_URL } from "@/app/siteConfig";
import { listUrl } from "@/lib/listUrl";

type Params = { params: Promise<{ id: string }> };

function freshInviteToken(): string {
  return randomBytes(18).toString("base64url");
}

async function resolveOwner(listId: number, userId: number) {
  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: { id: true, createdById: true, visibility: true, short_id: true, slug: true },
  });
  if (!list) return { list: null, forbidden: false };
  if (list.createdById !== userId) return { list: null, forbidden: true };
  return { list, forbidden: false };
}

// GET /api/s/:id/invites — list active (non-revoked) invites
export async function GET(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const { list, forbidden } = await resolveOwner(listId, user.sub);
  if (forbidden) return new Response(null, { status: 403 });
  if (!list) return new Response(null, { status: 404 });

  const invites = await (prisma as any).listInvite.findMany({
    where: { listId, revoked_at: null },
    select: { id: true, invite_token: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const base = `${SITE_URL}${listUrl(list)}`;
  const result = invites.map((inv: { id: number; invite_token: string; createdAt: Date }) => ({
    id: inv.id,
    invite_url: `${base}?invite=${inv.invite_token}`,
    created_at: inv.createdAt,
  }));

  return NextResponse.json(result);
}

// POST /api/s/:id/invites — create a new invite link
export async function POST(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const { list, forbidden } = await resolveOwner(listId, user.sub);
  if (forbidden) return new Response(null, { status: 403 });
  if (!list) return new Response(null, { status: 404 });
  if (list.visibility !== "private") {
    return NextResponse.json(
      { error: "Invites are only available for private lists." },
      { status: 422 }
    );
  }

  const token = freshInviteToken();

  const invite = await (prisma as any).listInvite.create({
    data: {
      listId,
      invite_token: token,
      invitedById: user.sub,
    },
    select: { id: true, invite_token: true, createdAt: true },
  });

  const invite_url = `${SITE_URL}${listUrl(list)}?invite=${token}`;

  return NextResponse.json(
    { id: invite.id, invite_url, created_at: invite.createdAt },
    { status: 201 }
  );
}
