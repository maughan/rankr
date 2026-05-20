import { prisma } from "@/lib/prisma";

export async function resolveUserByUsername(
  username: string
): Promise<{ id: number; username: string } | null> {
  return (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true },
  });
}

export async function getBlockBetween(
  userId: number,
  otherId: number
): Promise<{ blockerId: number } | null> {
  return (prisma as any).block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: otherId },
        { blockerId: otherId, blockedId: userId },
      ],
    },
    select: { blockerId: true },
  });
}
