import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";

export async function POST() {
  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  await prisma.user.update({
    where: { id: viewer.id },
    data: { last_feed_visit_at: new Date() },
  });

  return new Response(null, { status: 204 });
}
