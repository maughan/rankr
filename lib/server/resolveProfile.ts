// Server-only. Never import from client components.
import { prisma } from "@/lib/prisma";

export interface ResolvedProfile {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  createdAt: Date;
}

export type ProfileResolveResult =
  | { kind: "found"; profile: ResolvedProfile }
  | { kind: "redirect"; canonicalUsername: string }
  | { kind: "notfound" };

export async function resolveProfileParam(
  username: string
): Promise<ProfileResolveResult> {
  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      createdAt: true,
    },
  }) as ResolvedProfile | null;

  if (user) return { kind: "found", profile: user };

  // Check if the username was previously used — redirect to current handle
  const history = await (prisma.userUsernameHistory as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    orderBy: { changedAt: "desc" },
    include: { user: { select: { username: true } } },
  }) as { user: { username: string } } | null;

  if (history) return { kind: "redirect", canonicalUsername: history.user.username };

  return { kind: "notfound" };
}
