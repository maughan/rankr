import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return new Response(null, { status: 404 });

  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.message !== undefined) data.message = String(body.message).trim();
  if (body.severity !== undefined) data.severity = body.severity;
  if (body.audience !== undefined) data.audience = body.audience;
  if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);
  if (body.starts_at !== undefined) data.starts_at = body.starts_at ? new Date(body.starts_at) : null;
  if (body.ends_at !== undefined) data.ends_at = body.ends_at ? new Date(body.ends_at) : null;
  if (body.cta_label !== undefined) data.cta_label = body.cta_label?.trim() || null;
  if (body.cta_url !== undefined) data.cta_url = body.cta_url?.trim() || null;

  const result = await (prisma.announcement as any).updateMany({ where: { id }, data });
  if (result.count === 0) return new Response(null, { status: 404 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (isNaN(id)) return new Response(null, { status: 404 });

  try {
    await (prisma.announcement as any).delete({ where: { id } });
  } catch {
    return new Response(null, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
