import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const announcements = await (prisma.announcement as any).findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      message: true,
      severity: true,
      audience: true,
      is_active: true,
      starts_at: true,
      ends_at: true,
      cta_label: true,
      cta_url: true,
      created_at: true,
    },
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const body = await req.json();
  const { message, severity, audience, starts_at, ends_at, cta_label, cta_url } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const validSeverities = ["info", "warning", "critical"];
  const validAudiences = ["all", "authed", "anon"];

  if (severity && !validSeverities.includes(severity)) {
    return NextResponse.json({ error: "Invalid severity." }, { status: 400 });
  }
  if (audience && !validAudiences.includes(audience)) {
    return NextResponse.json({ error: "Invalid audience." }, { status: 400 });
  }

  const announcement = await (prisma.announcement as any).create({
    data: {
      message: message.trim(),
      severity: severity ?? "info",
      audience: audience ?? "all",
      starts_at: starts_at ? new Date(starts_at) : null,
      ends_at: ends_at ? new Date(ends_at) : null,
      cta_label: cta_label?.trim() || null,
      cta_url: cta_url?.trim() || null,
      created_by_id: admin.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: announcement.id }, { status: 201 });
}
