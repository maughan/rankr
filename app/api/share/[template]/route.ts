import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { renderCard } from "@/lib/share/renderer";
import {
  FORMATS,
  KNOWN_TEMPLATES,
  Format,
  TemplateName,
} from "@/lib/share/types";

type Params = { params: Promise<{ template: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { template } = await params;

  if (!KNOWN_TEMPLATES.includes(template as TemplateName)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") ?? "square") as Format;

  if (!Object.keys(FORMATS).includes(format)) {
    return NextResponse.json(
      { error: `Invalid format — must be one of: ${Object.keys(FORMATS).join(", ")}` },
      { status: 400 }
    );
  }

  // Build a deterministic ETag from all inputs so the CDN can bust cache when
  // parameters change (e.g. after a re-rank).
  const paramObj: Record<string, string> = { template, format };
  sp.forEach((v, k) => { paramObj[k] = v; });
  const etag = `"${createHash("sha256")
    .update(JSON.stringify(paramObj))
    .digest("hex")
    .slice(0, 16)}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  try {
    const image = await renderCard(template as TemplateName, sp, format);

    return new Response(image.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "ETag": etag,
      },
    });
  } catch (err) {
    console.error(`[share/${template}]`, err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
