import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getFontConfig } from "@/lib/share/font";
import { ogProfileCard } from "@/lib/share/templates/og-profile";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  if (!username) return new Response("Missing username", { status: 400 });

  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, display_name: true, bio: true },
  }) as {
    id: number;
    username: string;
    display_name: string | null;
    bio: string | null;
  } | null;

  if (!user) return new Response("Not found", { status: 404 });

  const publicListCount = await (prisma.list as any).count({
    where: { createdById: user.id, visibility: "public" },
  }) as number;

  const fonts = await getFontConfig();
  const element = ogProfileCard({
    username: user.username,
    displayName: user.display_name,
    bio: user.bio,
    publicListCount,
  });

  const image = new ImageResponse(element, { width: 1200, height: 675, fonts });

  return new Response(image.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
