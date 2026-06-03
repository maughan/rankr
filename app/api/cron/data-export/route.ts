import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import archiver from "archiver";
import { Readable } from "stream";
import { sendExportReady } from "@/lib/email/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function authGuard(req: Request): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function collectUserData(userId: number): Promise<Record<string, unknown>> {
  const user = await (prisma.user as any).findUnique({
    where: { id: userId },
    select: {
      username: true,
      display_name: true,
      bio: true,
      email: true,
      createdAt: true,
      onboarding_state: true,
    },
  });

  const lists = await (prisma.list as any).findMany({
    where: { createdById: userId },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      category: true,
      short_id: true,
      slug: true,
      published_at: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          name: true,
          short_label: true,
          img: true,
          color: true,
          createdAt: true,
        },
      },
    },
  });

  const rankings = await (prisma.ranking as any).findMany({
    where: { userId },
    select: {
      value: true,
      createdAt: true,
      updatedAt: true,
      is_anonymous: true,
      list: { select: { short_id: true, title: true } },
      item: { select: { name: true } },
    },
  });

  const following = await (prisma.follow as any).findMany({
    where: { followerId: userId },
    select: { following: { select: { username: true } }, createdAt: true },
  });

  const followers = await (prisma.follow as any).findMany({
    where: { followingId: userId },
    select: { follower: { select: { username: true } }, createdAt: true },
  });

  // Reports they filed — reportee identity redacted
  const reportsRaw = await (prisma.report as any).findMany({
    where: { reporter_user_id: userId },
    select: {
      reportable_type: true,
      reason: true,
      context: true,
      status: true,
      created_at: true,
    },
  });

  // Moderation actions taken against them
  const moderationHistory = await (prisma.moderationAction as any).findMany({
    where: { target_type: "profile", target_id: userId },
    select: {
      action_type: true,
      reason: true,
      created_at: true,
    },
  });

  return {
    profile: {
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      email: user.email,
      created_at: user.createdAt,
      onboarding_state: user.onboarding_state,
    },
    lists: lists.map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      visibility: l.visibility,
      category: l.category,
      url: `https://tierstack.dev/s/${l.short_id}/${l.slug}`,
      published_at: l.published_at,
      created_at: l.createdAt,
      updated_at: l.updatedAt,
      items: l.items,
    })),
    rankings: rankings.map((r: any) => ({
      list_id: r.list?.short_id,
      list_title: r.list?.title,
      item_name: r.item?.name,
      value: r.value,
      submitted_at: r.createdAt,
      updated_at: r.updatedAt,
      is_anonymous: r.is_anonymous,
    })),
    follows: {
      following: following.map((f: any) => ({
        username: f.following.username,
        since: f.createdAt,
      })),
      followers: followers.map((f: any) => ({
        username: f.follower.username,
        since: f.createdAt,
      })),
    },
    reports_filed: reportsRaw.map((r: any) => ({
      reportable_type: r.reportable_type,
      // reportable_id intentionally omitted — no re-identification
      reason: r.reason,
      context: r.context,
      status: r.status,
      filed_at: r.created_at,
    })),
    moderation_history: moderationHistory.map((m: any) => ({
      action: m.action_type,
      reason: m.reason,
      date: m.created_at,
    })),
  };
}

function buildReadme(username: string): string {
  return `# tierstack.dev — Data Export for @${username}

Generated: ${new Date().toISOString()}

## Contents

- profile.json         Your public profile and account settings
- lists.json           Every list you created, with their items
- rankings.json        Every ranking you submitted
- follows.json         Who you follow and who follows you
- reports_filed.json   Reports you filed (reportee identities redacted)
- moderation_history.json  Moderation actions taken on your account

## Notes

- Data is exported in JSON format (GDPR Art. 20 portability).
- Derived/computed fields (archetype scores, alignment percentages) are not
  included — these are generated from the underlying data above.
- Reportee identities in reports_filed.json are redacted to protect third parties.
- This export reflects your data at the time of generation.

This link expires 7 days from generation. You can request a new export
from your account settings at any time (once per 14 days).
`;
}

async function buildZip(data: Record<string, unknown>, username: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    const sections: Record<string, unknown> = {
      profile: (data as any).profile,
      lists: (data as any).lists,
      rankings: (data as any).rankings,
      follows: (data as any).follows,
      reports_filed: (data as any).reports_filed,
      moderation_history: (data as any).moderation_history,
    };

    for (const [name, content] of Object.entries(sections)) {
      archive.append(JSON.stringify(content, null, 2), { name: `${name}.json` });
    }
    archive.append(buildReadme(username), { name: "README.md" });
    archive.finalize();
  });
}

export async function POST(req: Request) {
  if (!authGuard(req)) return new Response(null, { status: 401 });

  // Pick the oldest pending request
  const exportReq = await (prisma.dataExportRequest as any).findFirst({
    where: { status: "pending" },
    orderBy: { requested_at: "asc" },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  if (!exportReq) return NextResponse.json({ processed: 0 });

  await (prisma.dataExportRequest as any).update({
    where: { id: exportReq.id },
    data: { status: "processing" },
  });

  try {
    const data = await collectUserData(exportReq.user.id);
    const zip = await buildZip(data, exportReq.user.username);

    const blobName = `exports/${exportReq.user.id}/${exportReq.id}.zip`;
    const { url } = await put(blobName, zip, {
      access: "public",
      contentType: "application/zip",
    });

    const expiresAt = new Date(Date.now() + EXPORT_TTL_MS);

    await (prisma.dataExportRequest as any).update({
      where: { id: exportReq.id },
      data: {
        status: "ready",
        download_url: url,
        expires_at: expiresAt,
        completed_at: new Date(),
      },
    });

    if (exportReq.user.email) {
      await sendExportReady({
        to: exportReq.user.email,
        downloadUrl: url,
        expiresAt,
      });
    }

    return NextResponse.json({ processed: 1, requestId: exportReq.id });
  } catch (err) {
    console.error("data-export cron error", err);
    await (prisma.dataExportRequest as any).update({
      where: { id: exportReq.id },
      data: { status: "failed" },
    });
    return NextResponse.json({ processed: 0, error: "failed" }, { status: 500 });
  }
}
