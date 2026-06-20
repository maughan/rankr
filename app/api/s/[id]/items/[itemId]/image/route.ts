import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { moderateImage } from "@/lib/server/imageModeration";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1_048_576; // 5 MB
// 200×160 display at 2× retina
const TARGET_W = 400;
const TARGET_H = 320;
// #0F1828 — rk-surface, prevents white-bleed on transparent PNGs
const BACKGROUND = { r: 15, g: 24, b: 40 };

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

export async function POST(req: Request, { params }: Params) {
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

  // ── Parse & validate file ────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "File must be JPEG, PNG, or WebP" }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  if (rawBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
  }

  // ── Process: resize → dark-background composite → WebP ───────────────────────
  let processed: Buffer;
  try {
    processed = await sharp(rawBuffer)
      .resize(TARGET_W, TARGET_H, { fit: "cover", position: "center" })
      .flatten({ background: BACKGROUND })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Could not process image" }, { status: 422 });
  }

  // ── Content moderation ────────────────────────────────────────────────────────
  const moderation = await moderateImage(processed);
  if (!moderation.safe) {
    return NextResponse.json(
      { error: moderation.reason ?? "Image did not pass content moderation." },
      { status: 422 }
    );
  }

  // ── Upload to ImageKit (server-side — no client auth handshake needed) ────────
  let url: string;
  try {
    const result = await imagekit.upload({
      file: processed,
      fileName: `item-${itemIdNum}-${Date.now()}.webp`,
      folder: "/items",
    });
    url = result.url;
  } catch {
    return NextResponse.json({ error: "Image upload failed" }, { status: 502 });
  }

  const updated = await prisma.item.update({
    where: { id: itemIdNum },
    data: { img: url, image_uploaded_at: new Date() },
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

  const updated = await prisma.item.update({
    where: { id: itemIdNum },
    data: { img: null, image_uploaded_at: null },
  });

  return NextResponse.json(updated);
}
