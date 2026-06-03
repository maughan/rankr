// Daily cron — hard-deletes accounts whose 30-day grace period has elapsed.
//
// For each account:
//   - Public lists → transferred to the [deleted] sentinel (other users' rankings intact)
//   - Draft/private/hidden lists → hard deleted
//   - Public rankings → userId set to sentinel (preserves list aggregates)
//   - Follows, pins, username history, activity events → deleted
//   - Personal fields (email, password, bio, display_name) → scrubbed
//   - Username → replaced with [deleted-{id}] to block re-registration
//   - Deletion confirmation email sent BEFORE email field is scrubbed
//
// Reminder emails (7-day, 24-hour) are also dispatched here based on
// scheduled_deletion_at proximity.

import { prisma } from "@/lib/prisma";
import { sendDeletionCompleted, sendDeletionReminder } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SENTINEL_ID = parseInt(process.env.DELETED_SENTINEL_USER_ID ?? "0", 10);

function authGuard(req: Request): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

async function hardDeleteUser(userId: number): Promise<void> {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true },
  });
  if (!user) return;

  // 1. Send final email BEFORE scrubbing the email field
  if (user.email) {
    await sendDeletionCompleted({ to: user.email });
  }

  // 2. Transfer public lists to sentinel; hard-delete non-public lists
  const publicLists = await (prisma.list as any).findMany({
    where: { createdById: userId, visibility: "public" },
    select: { id: true },
  });
  const publicListIds = publicLists.map((l: any) => l.id);

  if (publicListIds.length > 0) {
    await (prisma.list as any).updateMany({
      where: { id: { in: publicListIds } },
      data: { createdById: SENTINEL_ID },
    });
  }

  // Hard-delete all remaining (non-public) lists belonging to this user
  await (prisma.list as any).deleteMany({
    where: { createdById: userId },
  });

  // 3. Transfer public rankings to sentinel; delete private-list rankings
  await (prisma.ranking as any).updateMany({
    where: { userId, listId: { in: publicListIds } },
    data: { userId: SENTINEL_ID },
  });
  await (prisma.ranking as any).deleteMany({ where: { userId } });

  // 4. Transfer items in public lists to sentinel
  await (prisma.item as any).updateMany({
    where: { createdById: userId, lists: { some: { id: { in: publicListIds } } } },
    data: { createdById: SENTINEL_ID },
  });
  // Delete remaining items (those in deleted/private lists) — cascade will handle rankings
  await (prisma.item as any).deleteMany({ where: { createdById: userId } });

  // 5. Delete private data (Follow/Block cascade automatically on user delete)
  await (prisma.userListPin as any).deleteMany({ where: { userId } });
  await (prisma.userUsernameHistory as any).deleteMany({ where: { userId } });
  await (prisma.activityEvent as any).deleteMany({ where: { actorId: userId } });

  // 6. Mark deletion request completed; store username before scrub
  await (prisma.accountDeletionRequest as any).updateMany({
    where: { user_id: userId, completed_at: null },
    data: { completed_at: new Date(), deleted_username: user.username },
  });

  // 7. Scrub PII — username becomes [deleted-{id}] to block re-registration
  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      username: `[deleted-${userId}]`,
      password: "",
      email: null,
      display_name: null,
      bio: null,
      deletion_scheduled_at: null,
      tokenVersion: { increment: 1 },
    },
  });
}

async function sendReminders(): Promise<void> {
  const now = Date.now();
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tierstack.dev";
  const cancelUrl = `${SITE_URL}/settings/account/cancel-deletion`;

  // 7-day reminder: scheduled between 7d+1h and 7d-1h from now
  const sevenDayWindow = {
    gte: new Date(now + 6 * 24 * 60 * 60 * 1000),
    lte: new Date(now + 8 * 24 * 60 * 60 * 1000),
  };
  const sevenDayRequests = await (prisma.accountDeletionRequest as any).findMany({
    where: {
      scheduled_deletion_at: sevenDayWindow,
      cancelled_at: null,
      completed_at: null,
    },
    include: { user: { select: { username: true, email: true } } },
  });

  for (const req of sevenDayRequests) {
    if (req.user.email) {
      await sendDeletionReminder({
        to: req.user.email,
        username: req.user.username,
        scheduledAt: req.scheduled_deletion_at,
        cancelUrl,
        hoursLeft: 7 * 24,
      });
    }
  }

  // 24-hour reminder: scheduled between 23h and 25h from now
  const oneDayWindow = {
    gte: new Date(now + 23 * 60 * 60 * 1000),
    lte: new Date(now + 25 * 60 * 60 * 1000),
  };
  const oneDayRequests = await (prisma.accountDeletionRequest as any).findMany({
    where: {
      scheduled_deletion_at: oneDayWindow,
      cancelled_at: null,
      completed_at: null,
    },
    include: { user: { select: { username: true, email: true } } },
  });

  for (const req of oneDayRequests) {
    if (req.user.email) {
      await sendDeletionReminder({
        to: req.user.email,
        username: req.user.username,
        scheduledAt: req.scheduled_deletion_at,
        cancelUrl,
        hoursLeft: 24,
      });
    }
  }
}

export async function GET(req: Request) {
  if (!authGuard(req)) return new Response("Unauthorized", { status: 401 });

  if (!SENTINEL_ID) {
    console.error("hard-delete-users: DELETED_SENTINEL_USER_ID is not set");
    return Response.json({ error: "Sentinel not configured." }, { status: 500 });
  }

  // Send reminders for upcoming deletions
  await sendReminders();

  // Find all accounts past their grace period
  const due = await (prisma.accountDeletionRequest as any).findMany({
    where: {
      scheduled_deletion_at: { lte: new Date() },
      cancelled_at: null,
      completed_at: null,
    },
    select: { user_id: true },
  });

  let deleted = 0;
  for (const { user_id } of due) {
    try {
      await hardDeleteUser(user_id);
      deleted++;
    } catch (err) {
      console.error(`hard-delete-users: failed for user ${user_id}`, err);
    }
  }

  return Response.json({ deleted, reminders: { sevenDay: true, oneDay: true } });
}
