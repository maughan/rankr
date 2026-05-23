import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

type Params = { params: Promise<{ id: string; inviteId: string }> };

// DELETE /api/s/:id/invites/:inviteId
// Soft-revokes the invite: sets revoked_at but keeps the row so existing tokens
// held by users continue to work for access.
export async function DELETE(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return new Response(null, { status: 401 });

  const { id, inviteId } = await params;
  const listId = Number(id);
  const inviteIdNum = Number(inviteId);

  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: { createdById: true },
  });
  if (!list) return new Response(null, { status: 404 });
  if (list.createdById !== user.sub) return new Response(null, { status: 403 });

  const invite = await (prisma as any).listInvite.findFirst({
    where: { id: inviteIdNum, listId },
  });
  if (!invite) return new Response(null, { status: 404 });

  await (prisma as any).listInvite.update({
    where: { id: inviteIdNum },
    data: { revoked_at: new Date() },
  });

  return new Response(null, { status: 204 });
}
