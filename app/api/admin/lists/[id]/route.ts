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

  const { id } = await params;
  const listId = Number(id);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { is_template, is_featured } = body;

  if (is_template !== undefined && typeof is_template !== "boolean") {
    return NextResponse.json(
      { error: "is_template must be a boolean" },
      { status: 400 }
    );
  }
  if (is_featured !== undefined && typeof is_featured !== "boolean") {
    return NextResponse.json(
      { error: "is_featured must be a boolean" },
      { status: 400 }
    );
  }

  const list = await (prisma.list as any).findUnique({
    where: { id: listId },
    select: { id: true, visibility: true },
  });

  if (!list) return new Response(null, { status: 404 });

  // Only public lists may be flagged as templates.
  if (is_template === true && list.visibility !== "public") {
    return NextResponse.json(
      { error: "Only public lists can be flagged as templates" },
      { status: 400 }
    );
  }

  const data: Record<string, boolean> = {};
  if (typeof is_template === "boolean") data.is_template = is_template;
  if (typeof is_featured === "boolean") data.is_featured = is_featured;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No editorial flags provided" },
      { status: 400 }
    );
  }

  const updated = await (prisma.list as any).update({
    where: { id: listId },
    data,
    select: {
      id: true,
      title: true,
      visibility: true,
      is_template: true,
      is_featured: true,
    },
  });

  return NextResponse.json(updated);
}
