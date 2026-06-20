import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { renderCard } from "@/lib/share/renderer";
import { ShareCardError } from "@/lib/share/errors";
import { getClientIp, hashIp } from "@/lib/ipHash";
import { createRateLimiter } from "@/lib/server/rateLimiter";
import {
  FORMATS,
  KNOWN_TEMPLATES,
  Format,
  TemplateName,
} from "@/lib/share/types";

type Params = { params: Promise<{ template: string }> };

// Per-IP rate limit: 60 req / min for share card generation.
const shareRateLimiter = createRateLimiter({ windowMs: 60 * 1_000, max: 60 });

export async function GET(req: NextRequest, { params }: Params) {
  const { template } = await params;

  if (!KNOWN_TEMPLATES.includes(template as TemplateName)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") ?? "square") as Format;

  if (!Object.keys(FORMATS).includes(format)) {
    return NextResponse.json(
      {
        error: `Invalid format — must be one of: ${Object.keys(FORMATS).join(
          ", "
        )}`,
      },
      { status: 400 }
    );
  }

  // Rate limit by IP
  const ip = getClientIp(req);
  if (!shareRateLimiter.check(hashIp(ip))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Resolve viewer identity from cookies (server-side — cannot be spoofed by the client).
  // Auth user takes priority over anon session.
  const enrichedSp = new URLSearchParams(sp);
  const authCookie = req.cookies.get("auth_token")?.value;
  let identitySet = false;

  if (authCookie) {
    try {
      const payload = jwt.verify(
        authCookie,
        process.env.JWT_SECRET!
      ) as unknown as { sub: number };
      if (typeof payload.sub === "number") {
        enrichedSp.set("userId", String(payload.sub));
        enrichedSp.delete("anonSession");
        identitySet = true;
      }
    } catch {
      /* expired or invalid token — fall through to anon */
    }
  }

  if (!identitySet) {
    const anonSession = req.cookies.get("rankr_anon_session")?.value;
    if (anonSession) enrichedSp.set("anonSession", anonSession);
  }

  // Build a deterministic ETag that includes the resolved identity so the CDN
  // serves different images to different viewers even with the same token.
  const paramObj: Record<string, string> = { template, format };
  enrichedSp.forEach((v, k) => {
    paramObj[k] = v;
  });
  const etag = `"${createHash("sha256")
    .update(JSON.stringify(paramObj))
    .digest("hex")
    .slice(0, 16)}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304 });
  }

  try {
    const image = await renderCard(
      template as TemplateName,
      enrichedSp,
      format
    );

    return new Response(image.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        // Private because the image is viewer-specific; short browser cache.
        "Cache-Control": "private, max-age=120",
        ETag: etag,
      },
    });
  } catch (err) {
    if (err instanceof ShareCardError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`[share/${template}]`, err);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
