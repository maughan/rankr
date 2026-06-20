import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { deriveShortLabel } from "@/lib/itemColor";

type Params = { params: Promise<{ id: string; itemId: string }> };

async function authorize(listId: number, userId: number, tokenVersion: number) {
  const [dbUser, list] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } }),
    prisma.list.findFirst({ where: { id: listId, createdById: userId }, select: { id: true } }),
  ]);
  if (!dbUser || dbUser.tokenVersion !== tokenVersion) return "unauthorized";
  if (!list) return "forbidden";
  return "ok";
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const listId = Number(id);
  const itemIdNum = Number(itemId);

  const authResult = await authorize(listId, user.sub, user.tokenVersion);
  if (authResult === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult === "forbidden" && !['admin', 'super_admin'].includes(user.role || '')) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await prisma.item.findFirst({
    where: { id: itemIdNum, lists: { some: { id: listId } } },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // ── Name validation ──────────────────────────────────────────────────────────
  let newName = item.name;
  let nameChanged = false;

  if ("name" in body) {
    const trimmed = String(body.name ?? "").trim();
    if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    if (trimmed.length > 60) return NextResponse.json({ error: "Name must be 60 chars or fewer" }, { status: 400 });

    const conflict = await prisma.item.findFirst({
      where: {
        id: { not: itemIdNum },
        lists: { some: { id: listId } },
        name: { equals: trimmed, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (conflict) return NextResponse.json({ error: "An item with this name already exists in this list" }, { status: 409 });

    nameChanged = trimmed.toLowerCase() !== (item.name ?? "").toLowerCase();
    newName = trimmed;
  }

  // ── short_label logic ────────────────────────────────────────────────────────
  let newShortLabel = item.short_label;
  let newShortLabelUserSet = item.short_label_user_set;

  if ("short_label" in body) {
    const sl = String(body.short_label ?? "").trim().toUpperCase();
    if (sl.length > 3) return NextResponse.json({ error: "Short label must be 3 chars or fewer" }, { status: 400 });
    if (sl === "") {
      newShortLabel = deriveShortLabel(newName ?? "");
      newShortLabelUserSet = false;
    } else {
      newShortLabel = sl;
      newShortLabelUserSet = true;
    }
  } else if (nameChanged && !item.short_label_user_set) {
    newShortLabel = deriveShortLabel(newName ?? "");
  }

  const updated = await prisma.item.update({
    where: { id: itemIdNum },
    data: {
      name: newName,
      short_label: newShortLabel,
      short_label_user_set: newShortLabelUserSet,
      ...(nameChanged && { name_updated_at: new Date() }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const listId = Number(id);
  const itemIdNum = Number(itemId);

  const authResult = await authorize(listId, user.sub, user.tokenVersion);
  if (authResult === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authResult === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await prisma.item.findFirst({
    where: { id: itemIdNum, lists: { some: { id: listId } } },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deletedRankingsCount = await prisma.ranking.count({ where: { itemId: itemIdNum } });

  // onDelete: Cascade on Ranking.item handles ranking cleanup automatically
  await prisma.item.delete({ where: { id: itemIdNum } });

  return NextResponse.json({ deleted_rankings_count: deletedRankingsCount });
}
