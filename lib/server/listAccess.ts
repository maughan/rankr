// Server-only. Never import from client components.
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface ViewerCtx {
  userId: number | null;
  /** Cookie value for rankr_invite_{listId}, if present. */
  inviteToken: string | null;
}

export interface AccessOpts {
  visibility: string;
  createdById: number;
  is_shareable: boolean;
  anonymous_rankings_enabled: boolean;
  /** True when the viewer's invite_token matches a ListInvite row for this list. */
  hasValidInvite: boolean;
  /** True when the viewer has at least one ranking for this list (authed only). */
  hasExistingRanking: boolean;
}

/** Read cookie-derived viewer context. No DB queries. */
export async function readViewerCtx(
  userId: number | null,
  listId: number
): Promise<ViewerCtx> {
  const biscuits = await cookies();
  const inviteToken = biscuits.get(`rankr_invite_${listId}`)?.value ?? null;
  return { userId, inviteToken };
}

/**
 * Fetch the access options for a list given the viewer's identity.
 * Returns null if the list does not exist.
 */
export async function fetchAccessOpts(
  listId: number,
  viewer: ViewerCtx
): Promise<AccessOpts | null> {
  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: {
      visibility: true,
      createdById: true,
      is_shareable: true,
      anonymous_rankings_enabled: true,
    },
  });
  if (!list) return null;

  // Invite token check — only relevant for private lists
  let hasValidInvite = false;
  if (viewer.inviteToken && list.visibility === "private") {
    const invite = await (prisma as any).listInvite.findFirst({
      where: { listId, invite_token: viewer.inviteToken },
    });
    hasValidInvite = !!invite;
  }

  // Existing-ranking check — only relevant for hidden lists (prior rankers can still view)
  let hasExistingRanking = false;
  if (viewer.userId && list.visibility === "hidden") {
    const listWithItems = await prisma.list.findUnique({
      where: { id: listId },
      select: { items: { select: { id: true } } },
    });
    const itemIds = listWithItems?.items.map((i) => i.id) ?? [];
    if (itemIds.length > 0) {
      const count = await prisma.ranking.count({
        where: { itemId: { in: itemIds }, userId: viewer.userId },
      });
      hasExistingRanking = count > 0;
    }
  }

  return {
    visibility: list.visibility,
    createdById: list.createdById,
    is_shareable: list.is_shareable,
    anonymous_rankings_enabled: list.anonymous_rankings_enabled,
    hasValidInvite,
    hasExistingRanking,
  };
}

export function canView(opts: AccessOpts, viewer: ViewerCtx): boolean {
  if (viewer.userId !== null && viewer.userId === opts.createdById) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "hidden") return opts.hasExistingRanking;
  if (opts.visibility === "private") return opts.hasValidInvite;
  // draft: owner-only (already handled above)
  return false;
}

export function canRank(opts: AccessOpts, viewer: ViewerCtx): boolean {
  // Owner can always rank (e.g. test-ranking a draft)
  if (viewer.userId !== null && viewer.userId === opts.createdById) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "private") return opts.hasValidInvite;
  // hidden and draft: no new rankings from non-owners
  return false;
}

export function canEditRanking(opts: AccessOpts, viewer: ViewerCtx): boolean {
  if (viewer.userId !== null && viewer.userId === opts.createdById) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "hidden") return opts.hasExistingRanking;
  if (opts.visibility === "private") return opts.hasValidInvite;
  return false;
}
