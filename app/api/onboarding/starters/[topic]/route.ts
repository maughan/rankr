import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Returns a randomly selected active starter list for the given topic.
// The consumer (topic picker) calls this when the user clicks "Let's go"
// so they get a fresh pick on repeat visits.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topic: string }> }
) {
  try {
    const { topic } = await params;

    const rows = await prisma.onboardingStarter.findMany({
      where: { topic, is_active: true },
      select: {
        listId: true,
        list: { select: { short_id: true, slug: true, title: true } },
      },
      orderBy: { display_order: "asc" },
    });

    if (!rows.length) {
      return NextResponse.json({ error: "No starter for topic" }, { status: 404 });
    }

    // Random pick — more interesting on repeat visits than always returning first.
    const pick = rows[Math.floor(Math.random() * rows.length)];

    return NextResponse.json({
      list_id: pick.listId,
      short_id: pick.list.short_id,
      slug: pick.list.slug,
      title: pick.list.title,
    });
  } catch {
    return NextResponse.json({ error: "Failed to pick starter" }, { status: 500 });
  }
}
