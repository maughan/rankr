import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";
import { readViewerCtx, fetchAccessOpts, canView } from "@/lib/server/listAccess";
import { generateShortId, cloneTitle } from "@/lib/listUrl";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = (await _req.json().catch(() => ({}))) as { asTemplate?: boolean };

  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  const { id } = await params;
  const listId = Number(id);
  if (isNaN(listId)) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

  const viewerCtx = await readViewerCtx(viewer.id, listId);
  const accessOpts = await fetchAccessOpts(listId, viewerCtx);
  if (!accessOpts || !canView(accessOpts, viewerCtx)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const source = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      title: true,
      description: true,
      img: true,
      category: true,
      items: {
        select: {
          name: true,
          color: true,
          short_label: true,
          short_label_user_set: true,
          img: true,
        },
      },
    },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title: newTitle, slug: newSlug } = cloneTitle(source.title, !!body.asTemplate);

  const newList = await prisma.list.create({
    data: {
      title: newTitle,
      description: source.description,
      img: source.img,
      category: source.category,
      visibility: "draft",
      createdById: viewer.id,
      short_id: generateShortId(),
      slug: newSlug,
      tiers: {
        connect: [
          { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
          { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 },
        ],
      },
      items: {
        create: source.items.map((item) => ({
          name: item.name,
          color: item.color,
          short_label: item.short_label,
          short_label_user_set: item.short_label_user_set,
          img: item.img,
          createdById: viewer.id,
        })),
      },
    },
    select: { id: true, short_id: true, slug: true },
  });

  return NextResponse.json(newList);
}
