import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminViewer } from "@/lib/server/adminAuth";

type Params = { params: Promise<{ id: string }> };

const VALID_ACTIONS = new Set([
  "dismiss_report",
  "take_down",
  "restore",
  "warn_user",
  "suspend_user",
  "ban_user",
  "unsuspend_user",
  "unban_user",
]);

export async function POST(req: Request, { params }: Params) {
  const admin = await getAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { id } = await params;
  const reportId = Number(id);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { action_type, reason, suspend_days } = body;

  if (typeof action_type !== "string" || !VALID_ACTIONS.has(action_type)) {
    return NextResponse.json({ error: "Invalid action_type" }, { status: 422 });
  }

  const report = await (prisma.report as any).findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reportable_type: true,
      reportable_id: true,
      status: true,
    },
  });

  if (!report) return new Response(null, { status: 404 });

  await (prisma as any).$transaction(async (tx: any) => {
    // ── Apply action to the reported content ─────────────────────────────
    await applyAction(tx, action_type, report, reason as string | undefined, suspend_days as number | undefined);

    // ── Write audit record (append-only) ──────────────────────────────────
    await tx.moderationAction.create({
      data: {
        admin_user_id: admin.id,
        action_type,
        target_type: report.reportable_type,
        target_id: report.reportable_id,
        reason: typeof reason === "string" ? reason : null,
      },
    });

    // ── Update report status ──────────────────────────────────────────────
    const newStatus =
      action_type === "dismiss_report" ? "dismissed" : "actioned";
    await tx.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewed_by_id: admin.id,
        reviewed_at: new Date(),
        resolution_notes: typeof reason === "string" ? reason : null,
      },
    });
  });

  return NextResponse.json({ success: true });
}

async function applyAction(
  tx: any,
  action: string,
  report: { reportable_type: string; reportable_id: number },
  reason?: string,
  suspend_days?: number
) {
  const { reportable_type: type, reportable_id: targetId } = report;

  switch (action) {
    case "dismiss_report":
      // No content change — just closing the report
      return;

    case "take_down":
      if (type === "list") {
        await tx.list.update({
          where: { id: targetId },
          data: {
            taken_down_at: new Date(),
            taken_down_reason: reason ?? null,
            taken_down_by_id: null, // admin identity not linked to keep it opaque
            is_shareable: false,
            share_token: null,
            share_token_created_at: null,
          },
        });
      } else if (type === "item") {
        await tx.item.update({
          where: { id: targetId },
          data: { taken_down_at: new Date() },
        });
      }
      return;

    case "restore":
      if (type === "list") {
        await tx.list.update({
          where: { id: targetId },
          data: { taken_down_at: null, taken_down_reason: null, taken_down_by_id: null },
        });
      } else if (type === "item") {
        await tx.item.update({
          where: { id: targetId },
          data: { taken_down_at: null },
        });
      }
      return;

    case "warn_user": {
      // Logged in audit trail only — no automated enforcement
      return;
    }

    case "suspend_user": {
      const days = typeof suspend_days === "number" && suspend_days > 0 ? suspend_days : 7;
      const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await tx.user.update({
        where: { id: targetId },
        data: { suspended_until: until },
      });
      return;
    }

    case "ban_user":
      await tx.user.update({
        where: { id: targetId },
        data: { banned_at: new Date(), ban_reason: reason ?? null },
      });
      return;

    case "unsuspend_user":
      await tx.user.update({
        where: { id: targetId },
        data: { suspended_until: null },
      });
      return;

    case "unban_user":
      await tx.user.update({
        where: { id: targetId },
        data: { banned_at: null, ban_reason: null },
      });
      return;
  }
}
