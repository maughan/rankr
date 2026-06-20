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
  // ── Moderation state ──────────────────────────────────────────────────────
  /** Creator soft-deleted the list (30-day grace window). */
  isDeleted: boolean;
  /** Admin took the list down. Creator can view a notice; others cannot. */
  isTakenDown: boolean;
  takenDownReason: string | null;
  /** Creator's account is banned — their public content is hidden to others. */
  creatorIsBanned: boolean;
  // ── Viewer moderation status ──────────────────────────────────────────────
  viewerRole: string;
  /** Viewer is currently banned (read-only; cannot rank/create/follow). */
  viewerIsBanned: boolean;
  /** Viewer is suspended until a future date. */
  viewerIsSuspended: boolean;
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
      deleted_at: true,
      taken_down_at: true,
      taken_down_reason: true,
      createdBy: {
        select: { banned_at: true },
      },
    },
  });
  if (!list) return null;

  // ── Viewer moderation status ──────────────────────────────────────────────
  let viewerRole = "user";
  let viewerIsBanned = false;
  let viewerIsSuspended = false;

  if (viewer.userId !== null) {
    const viewerUser = await (prisma.user as any).findUnique({
      where: { id: viewer.userId },
      select: { role: true, banned_at: true, suspended_until: true },
    });
    if (viewerUser) {
      viewerRole = viewerUser.role;
      viewerIsBanned = viewerUser.banned_at !== null;
      viewerIsSuspended =
        viewerUser.suspended_until !== null &&
        new Date(viewerUser.suspended_until) > new Date();
    }
  }

  // ── Invite token check — only relevant for private lists ──────────────────
  let hasValidInvite = false;
  if (viewer.inviteToken && list.visibility === "private") {
    const invite = await (prisma as any).listInvite.findFirst({
      where: { listId, invite_token: viewer.inviteToken },
    });
    hasValidInvite = !!invite;
  }

  // ── Existing-ranking check — only relevant for hidden lists ───────────────
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
    isDeleted: list.deleted_at !== null,
    isTakenDown: list.taken_down_at !== null,
    takenDownReason: list.taken_down_reason ?? null,
    creatorIsBanned: list.createdBy.banned_at !== null,
    viewerRole,
    viewerIsBanned,
    viewerIsSuspended,
  };
}

function isAdmin(opts: Pick<AccessOpts, "viewerRole">): boolean {
  return opts.viewerRole === "admin" || opts.viewerRole === "super_admin";
}

export function canView(opts: AccessOpts, viewer: ViewerCtx): boolean {
  const admin = isAdmin(opts);
  const owner =
    viewer.userId !== null && viewer.userId === opts.createdById;

  // Admins see everything unconditionally.
  if (admin) return true;

  // Soft-deleted lists: only the creator can see them (shows a deletion notice).
  if (opts.isDeleted) return owner;

  // Admin-taken-down lists: only the creator can see the takedown notice.
  if (opts.isTakenDown) return owner;

  // Content from banned creators is hidden from everyone except themselves.
  if (opts.creatorIsBanned && !owner) return false;

  // Banned viewers can only access their own content.
  if (opts.viewerIsBanned && !owner) return false;

  // ── Standard visibility rules ─────────────────────────────────────────────
  if (owner) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "hidden") return opts.hasExistingRanking;
  if (opts.visibility === "private") return opts.hasValidInvite;
  // draft: owner-only (handled above)
  return false;
}

export function canRank(opts: AccessOpts, viewer: ViewerCtx): boolean {
  // Banned or suspended viewers cannot submit rankings.
  if (opts.viewerIsBanned || opts.viewerIsSuspended) return false;

  // Deleted or taken-down lists are read-only even for the owner.
  if (opts.isDeleted || opts.isTakenDown) return false;

  // Owner can always rank (e.g. test-ranking a draft)
  if (viewer.userId !== null && viewer.userId === opts.createdById) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "private") return opts.hasValidInvite;
  // hidden and draft: no new rankings from non-owners
  return false;
}

export function canEditRanking(opts: AccessOpts, viewer: ViewerCtx): boolean {
  if (opts.viewerIsBanned || opts.viewerIsSuspended) return false;
  if (opts.isDeleted || opts.isTakenDown) return false;
  if (viewer.userId !== null && viewer.userId === opts.createdById) return true;
  if (opts.visibility === "public") return true;
  if (opts.visibility === "hidden") return opts.hasExistingRanking;
  if (opts.visibility === "private") return opts.hasValidInvite;
  return false;
}
