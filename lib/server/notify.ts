import { prisma } from "@/lib/prisma";

type NotifyArgs = {
  recipientId: number;
  type: "ranked_your_list" | "new_follower" | "new_taste_twin" | "list_milestone" | "hot_take";
  actorId?: number | null;
  listId?: number | null;
  itemId?: number | null;
  meta?: Record<string, unknown>;
};

const AGGREGATING = new Set(["ranked_your_list", "hot_take"]);

export async function notify(a: NotifyArgs): Promise<void> {
  try {
    if (a.actorId && a.actorId === a.recipientId) return; // never self-notify

    if (a.actorId) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: a.recipientId, blockedId: a.actorId },
            { blockerId: a.actorId, blockedId: a.recipientId },
          ],
        },
        select: { blockerId: true },
      });
      if (block) return;
    }

    const db = prisma as any;

    if (AGGREGATING.has(a.type) && a.listId != null) {
      const existing = await db.notification.findFirst({
        where: { recipientId: a.recipientId, type: a.type, listId: a.listId, read_at: null },
        select: { id: true },
      });
      if (existing) {
        await db.notification.update({
          where: { id: existing.id },
          // Atomic increment — avoids a read-modify-write race when two
          // rankers hit the same list concurrently. @updatedAt refreshes the
          // sort timestamp automatically.
          data: {
            count: { increment: 1 },
            actorId: a.actorId ?? null,
            meta: a.meta ?? undefined,
          },
        });
        return;
      }
    }

    if (a.type === "list_milestone" && a.listId != null) {
      const ms = (a.meta?.milestone as number) ?? null;
      if (ms != null) {
        const dupe = await db.notification.findFirst({
          where: { recipientId: a.recipientId, type: "list_milestone", listId: a.listId },
          select: { id: true, meta: true },
        });
        if (dupe && (dupe.meta?.milestone ?? null) === ms) return;
      }
    }

    await db.notification.create({
      data: {
        recipientId: a.recipientId,
        type: a.type,
        actorId: a.actorId ?? null,
        listId: a.listId ?? null,
        itemId: a.itemId ?? null,
        meta: a.meta ?? undefined,
      },
    });
  } catch (err) {
    console.error("notify failed", err);
  }
}
