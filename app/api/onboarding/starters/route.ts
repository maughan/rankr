import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ONBOARDING_TOPICS } from "@/lib/onboardingTopics";

// Returns the ordered topic list, filtered to topics that have at least one
// active starter in the DB. Response is stable — topic order matches the
// display config so the UI can render cards without a separate sort.
export async function GET() {
  try {
    const activeTopics = await prisma.onboardingStarter.findMany({
      where: { is_active: true },
      select: { topic: true },
      distinct: ["topic"],
    });

    const activeSet = new Set(activeTopics.map((r) => r.topic));

    const topics = ONBOARDING_TOPICS.filter((t) => activeSet.has(t.slug));

    return NextResponse.json(topics);
  } catch {
    return NextResponse.json({ error: "Failed to load topics" }, { status: 500 });
  }
}
