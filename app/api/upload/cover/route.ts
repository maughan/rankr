import { NextResponse } from "next/server";
import ImageKit from "imagekit";
import sharp from "sharp";
import { getUserFromRequest } from "@/lib/auth";
import { moderateImage } from "@/lib/server/imageModeration";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1_048_576; // 8 MB
const TARGET_W = 1280;
const TARGET_H = 720;
const BACKGROUND = { r: 15, g: 24, b: 40 };

// POST /api/upload/cover — moderated server-side upload for list cover images.
// Returns { url } on success. Works for both new list creation and edits.
export async function POST(req: Request) {
  const user = await getUserFromRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    return NextResponse.json({ error: "File must be under 8 MB" }, { status: 400 });
  }

  // ── Process ───────────────────────────────────────────────────────────────────
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

  // ── Upload ────────────────────────────────────────────────────────────────────
  let url: string;
  try {
    const result = await imagekit.upload({
      file: processed,
      fileName: `cover-${user.sub}-${Date.now()}.webp`,
      folder: "/s",
    });
    url = result.url;
  } catch {
    return NextResponse.json({ error: "Image upload failed" }, { status: 502 });
  }

  return NextResponse.json({ url });
}
