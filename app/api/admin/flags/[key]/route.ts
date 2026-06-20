import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const { key } = await params;
  const { enabled } = await req.json();

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const flag = await (prisma as any).featureFlag.upsert({
    where: { key },
    create: { key, enabled },
    update: { enabled },
  });

  return NextResponse.json(flag);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const viewer = await getSuperAdminViewer();
  if (!viewer) return new Response(null, { status: 404 });

  const { key } = await params;

  await (prisma as any).featureFlag.delete({ where: { key } });
  return new Response(null, { status: 204 });
}
