// Consolidated cron job logic.
//
// Each exported function contains the body of a former cron GET handler,
// minus the auth check and the Response.json(...) wrapper — it returns the
// plain result object instead. The two consolidated routes
// (daily-insights, daily-cleanup) call these sequentially.

import { prisma } from "@/lib/prisma";
import { computeArchetype } from "@/lib/server/archetype";
import { computeTasteMatches } from "@/lib/server/tasteMatch";
import { notify } from "@/lib/server/notify";
import { sendDeletionCompleted, sendDeletionReminder } from "@/lib/email/send";

const ARCHETYPES_BATCH_SIZE = 200;
const TASTE_MATCHES_BATCH_SIZE = 200;

// Daily — recomputes taste archetypes for all eligible users.
//
// The job paginates users in batches of BATCH_SIZE. On Vercel Hobby the
// function timeout is 10 s; on Pro it's 300 s. If the user-base grows
// past what one invocation can handle, add cursor-based pagination using
// the `cursor` query param (future work — flag here, not in this PR).
export async function runArchetypes(): Promise<{
  processed: number;
  computed: number;
  cleared: number;
  errors: number[];
}> {
  // Pre-filter to users who have ranked at least one item — avoids loading
  // users who have never interacted, which will always return null.
  const candidates = await prisma.user.findMany({
    where: {
      rankings: { some: { value: { gt: 0 } } },
    },
    select: { id: true },
    take: ARCHETYPES_BATCH_SIZE,
    orderBy: { id: "asc" },
  });

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id } of candidates) {
    try {
      const result = await computeArchetype(id);
       
      await (prisma.user as any).update({
        where: { id },
        data: result
          ? {
              archetype: result.archetype,
              archetype_stats: result.stats,
              archetype_computed_at: new Date(),
            }
          : {
              archetype: null,
              archetype_stats: null,
              archetype_computed_at: new Date(),
            },
      });
      result ? computed++ : cleared++;
    } catch (err) {
      console.error(`archetype cron: failed for user ${id}`, err);
      errors.push(id);
    }
  }

  return {
    processed: candidates.length,
    computed,
    cleared,
    errors,
  };
}

// Daily — recomputes taste matches for all eligible users.
export async function runTasteMatches(): Promise<{
  computed: number;
  cleared: number;
  errors: number[];
}> {
  // Only non-private users with ranking history are matchable subjects.
   
  const candidates = (await (prisma.user as any).findMany({
    where: { profile_private: false, rankings: { some: { value: { gt: 0 } } } },
    select: { id: true, taste_matches: true },
    take: TASTE_MATCHES_BATCH_SIZE,
    orderBy: { id: "asc" },
  })) as { id: number; taste_matches: { twin?: { userId?: number } | null } | null }[];

  let computed = 0;
  let cleared = 0;
  const errors: number[] = [];

  for (const { id, taste_matches: previous } of candidates) {
    try {
      const previousTwinUserId = previous?.twin?.userId ?? null;
      const result = await computeTasteMatches(id);
       
      await (prisma.user as any).update({
        where: { id },
        data: { taste_matches: result ?? null },
      });
      if (result) {
        computed++;
        if (result.twin && result.twin.userId !== previousTwinUserId) {
          await notify({
            recipientId: id,
            type: "new_taste_twin",
            actorId: result.twin.userId,
            meta: { twinPct: result.twin.pct },
          });
        }
      } else {
        cleared++;
      }
    } catch (err) {
      console.error(`taste-matches cron: failed for user ${id}`, err);
      errors.push(id);
    }
  }

  return { computed, cleared, errors };
}

// Daily — permanently deletes lists whose 30-day grace period has expired.
//
// A creator soft-deletes a list (deleted_at is set). After 30 days with no
// restore, this job hard-deletes the list and all cascaded children.
const LISTS_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export async function runHardDeleteLists(): Promise<{ deleted: number; ids?: number[] }> {
  const cutoff = new Date(Date.now() - LISTS_GRACE_MS);

   
  const expired = await (prisma.list as any).findMany({
    where: { deleted_at: { not: null, lte: cutoff } },
    select: { id: true },
  });

  const ids = expired.map((l: { id: number }) => l.id);

  if (ids.length === 0) {
    return { deleted: 0 };
  }

   
  await (prisma.list as any).deleteMany({ where: { id: { in: ids } } });

  return { deleted: ids.length, ids };
}

// Daily — hard-deletes accounts whose 30-day grace period has elapsed.
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

const SENTINEL_ID = parseInt(process.env.DELETED_SENTINEL_USER_ID ?? "0", 10);

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

export async function runHardDeleteUsers(): Promise<{
  deleted: number;
  reminders?: { sevenDay: boolean; oneDay: boolean };
  error?: string;
}> {
  if (!SENTINEL_ID) {
    console.error("hard-delete-users: DELETED_SENTINEL_USER_ID is not set");
    return { deleted: 0, error: "Sentinel not configured." };
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

  return { deleted, reminders: { sevenDay: true, oneDay: true } };
}
