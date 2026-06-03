// Server-only. Collects all exportable data for a given user ID.
import { prisma } from "@/lib/prisma";

export async function collectUserData(
  userId: number
): Promise<Record<string, unknown>> {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: {
      username: true,
      display_name: true,
      bio: true,
      email: true,
      createdAt: true,
      onboarding_state: true,
    },
  });

  const lists = await (prisma.list as any).findMany({
    where: { createdById: userId },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      category: true,
      short_id: true,
      slug: true,
      published_at: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          short_label: true,
          img: true,
          color: true,
          createdAt: true,
        },
      },
    },
  });

  const rankings = await (prisma.ranking as any).findMany({
    where: { userId },
    select: {
      value: true,
      createdAt: true,
      updatedAt: true,
      is_anonymous: true,
      list: { select: { short_id: true, title: true } },
      item: { select: { name: true } },
    },
  });

  const following = await (prisma.follow as any).findMany({
    where: { followerId: userId },
    select: { following: { select: { username: true } }, createdAt: true },
  });

  const followers = await (prisma.follow as any).findMany({
    where: { followingId: userId },
    select: { follower: { select: { username: true } }, createdAt: true },
  });

  // Reports they filed — reportee identity redacted
  const reportsRaw = await (prisma.report as any).findMany({
    where: { reporter_user_id: userId },
    select: {
      reportable_type: true,
      reason: true,
      context: true,
      status: true,
      created_at: true,
    },
  });

  const moderationHistory = await (prisma.moderationAction as any).findMany({
    where: { target_type: "profile", target_id: userId },
    select: { action_type: true, reason: true, created_at: true },
  });

  return {
    exported_at: new Date().toISOString(),
    profile: {
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      email: user.email,
      created_at: user.createdAt,
      onboarding_state: user.onboarding_state,
    },
    lists: lists.map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      visibility: l.visibility,
      category: l.category,
      short_id: l.short_id,
      slug: l.slug,
      published_at: l.published_at,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
      items: l.items,
    })),
    rankings: rankings.map((r: any) => ({
      list_id: r.list?.short_id,
      list_title: r.list?.title,
      item_name: r.item?.name,
      value: r.value,
      submitted_at: r.createdAt,
      updated_at: r.updatedAt,
      is_anonymous: r.is_anonymous,
    })),
    follows: {
      following: following.map((f: any) => ({
        username: f.following.username,
        since: f.createdAt,
      })),
      followers: followers.map((f: any) => ({
        username: f.follower.username,
        since: f.createdAt,
      })),
    },
    reports_filed: reportsRaw.map((r: any) => ({
      reportable_type: r.reportable_type,
      reason: r.reason,
      context: r.context,
      status: r.status,
      filed_at: r.created_at,
    })),
    moderation_history: moderationHistory.map((m: any) => ({
      action: m.action_type,
      reason: m.reason,
      date: m.created_at,
    })),
  };
}
