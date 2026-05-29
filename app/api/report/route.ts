import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthedViewer } from "@/lib/server/auth";

const RATE_LIMIT = 10;        // max reports per rolling hour
const RATE_WINDOW_MS = 60 * 60 * 1000;

const VALID_TYPES = new Set(["list", "item", "profile"]);
const VALID_REASONS = new Set([
  "spam", "harassment", "hateful", "sexual",
  "copyright", "minors", "violence", "other",
]);

function anonHash(ip: string): string {
  const salt = process.env.REPORT_SALT ?? "default-salt-change-in-prod";
  return createHash("sha256").update(ip + salt).digest("hex");
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { reportable_type, reportable_id, reason, context } =
    body as Record<string, unknown>;

  if (
    typeof reportable_type !== "string" || !VALID_TYPES.has(reportable_type) ||
    typeof reportable_id !== "number" || !Number.isInteger(reportable_id) ||
    typeof reason !== "string" || !VALID_REASONS.has(reason) ||
    (context !== undefined && (typeof context !== "string" || context.length > 500))
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const viewer = await getAuthedViewer();
  const reporterUserId = viewer?.id ?? null;
  const sessionHash = reporterUserId === null ? anonHash(clientIp(req)) : null;

  // ── Rate limit ────────────────────────────────────────────────────────────
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentCount = await (prisma.report as any).count({
    where: {
      created_at: { gte: since },
      ...(reporterUserId !== null
        ? { reporter_user_id: reporterUserId }
        : { reporter_session_hash: sessionHash }),
    },
  });
  if (recentCount >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many reports. Please wait before submitting another." },
      { status: 429 }
    );
  }

  // ── Verify the target exists ──────────────────────────────────────────────
  const exists = await targetExists(reportable_type, reportable_id as number);
  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Upsert (idempotent — same user/session can't double-report) ───────────
  try {
    await (prisma.report as any).create({
      data: {
        reporter_user_id: reporterUserId,
        reporter_session_hash: sessionHash,
        reportable_type,
        reportable_id: reportable_id as number,
        reason,
        context: context as string | undefined ?? null,
      },
    });
  } catch (e: any) {
    // Unique constraint violation — reporter already filed this report
    if (e?.code === "P2002") {
      return NextResponse.json({ already_reported: true }, { status: 200 });
    }
    throw e;
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

async function targetExists(
  type: string,
  id: number
): Promise<boolean> {
  if (type === "list") {
    const r = await (prisma.list as any).findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    return !!r;
  }
  if (type === "item") {
    const r = await prisma.item.findFirst({
      where: { id },
      select: { id: true },
    });
    return !!r;
  }
  if (type === "profile") {
    const r = await prisma.user.findFirst({
      where: { id },
      select: { id: true },
    });
    return !!r;
  }
  return false;
}
