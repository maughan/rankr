import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: Request) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";
  const type = searchParams.get("type"); // list | item | profile | null (all)
  const cursor = searchParams.get("cursor") ? Number(searchParams.get("cursor")) : undefined;

  const reports = await (prisma.report as any).findMany({
    where: {
      status,
      ...(type ? { reportable_type: type } : {}),
      ...(cursor !== undefined ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      reportable_type: true,
      reportable_id: true,
      reason: true,
      context: true,
      status: true,
      created_at: true,
      // Reporter identity is intentionally excluded — never exposed via API
    },
  });

  const hasMore = reports.length > PAGE_SIZE;
  const page = hasMore ? reports.slice(0, PAGE_SIZE) : reports;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  // Attach a human-readable summary of the reported content for each report
  const enriched = await Promise.all(
    (page as any[]).map(async (r) => {
      const summary = await fetchTargetSummary(r.reportable_type, r.reportable_id);
      return { ...r, target: summary };
    })
  );

  return NextResponse.json({ reports: enriched, nextCursor, hasMore });
}

async function fetchTargetSummary(
  type: string,
  id: number
): Promise<Record<string, unknown> | null> {
  if (type === "list") {
    const list = await (prisma.list as any).findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        visibility: true,
        deleted_at: true,
        taken_down_at: true,
        createdBy: { select: { id: true, username: true } },
      },
    });
    return list;
  }
  if (type === "item") {
    const item = await prisma.item.findUnique({
      where: { id },
      select: { id: true, name: true, taken_down_at: true },
    });
    return item as any;
  }
  if (type === "profile") {
    const user = await (prisma.user as any).findUnique({
      where: { id },
      select: { id: true, username: true, banned_at: true, suspended_until: true },
    });
    return user;
  }
  return null;
}
