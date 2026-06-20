import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const flags = await (prisma as any).featureFlag.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json(flags);
}

export async function POST(req: Request) {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const { key, enabled = true, description } = await req.json();
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const flag = await (prisma as any).featureFlag.upsert({
    where: { key },
    create: { key, enabled, description },
    update: { enabled, description },
  });

  return NextResponse.json(flag);
}
