import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function freshShareToken(): string {
  // 12 bytes → 16-char base64url
  return randomBytes(12).toString("base64url");
}

function shareUrl(req: Request, token: string): string {
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}/r/${token}`;
}

async function resolveOwner(listId: number, userId: number) {
  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: {
      createdById: true,
      is_shareable: true,
      share_token: true,
      share_token_created_at: true,
      anonymous_rankings_enabled: true,
    },
  });
  if (!list) return { list: null, forbidden: false };
  if (list.createdById !== userId) return { list: null, forbidden: true };
  return { list, forbidden: false };
}

// POST /api/lists/:id/share — enable sharing, return share_token
export async function POST(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const { list, forbidden } = await resolveOwner(listId, user.sub);
  if (forbidden) return new Response(null, { status: 403 });
  if (!list) return new Response(null, { status: 404 });

  const token = list.share_token ?? freshShareToken();

  await (prisma.list as any).update({
    where: { id: listId },
    data: {
      is_shareable: true,
      share_token: token,
      share_token_created_at: list.share_token ? list.share_token_created_at : new Date(),
    },
  });

  return NextResponse.json({ share_token: token, share_url: shareUrl(req, token) });
}

// DELETE /api/lists/:id/share — disable sharing (keeps token for re-enable)
export async function DELETE(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const { list, forbidden } = await resolveOwner(listId, user.sub);
  if (forbidden) return new Response(null, { status: 403 });
  if (!list) return new Response(null, { status: 404 });

  await (prisma.list as any).update({
    where: { id: listId },
    data: { is_shareable: false },
  });

  return new Response(null, { status: 204 });
}

// PATCH /api/lists/:id/share — rotate token or toggle anonymous_rankings_enabled
export async function PATCH(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);

  const { list, forbidden } = await resolveOwner(listId, user.sub);
  if (forbidden) return new Response(null, { status: 403 });
  if (!list) return new Response(null, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.rotate === true) {
    update.share_token = freshShareToken();
    update.share_token_created_at = new Date();
  }

  if (typeof body.anonymous_rankings_enabled === "boolean") {
    update.anonymous_rankings_enabled = body.anonymous_rankings_enabled;
  }

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await (prisma.list as any).update({
    where: { id: listId },
    data: update,
    select: {
      share_token: true,
      anonymous_rankings_enabled: true,
    },
  });

  return NextResponse.json({
    share_token: updated.share_token,
    share_url: updated.share_token ? shareUrl(req, updated.share_token) : null,
    anonymous_rankings_enabled: updated.anonymous_rankings_enabled,
  });
}
