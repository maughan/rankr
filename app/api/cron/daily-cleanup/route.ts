// Daily cron — hard-deletes expired lists and accounts past their 30-day
// grace period. Consolidates the former /hard-delete-lists and
// /hard-delete-users crons. Protected by CRON_SECRET.

import { runHardDeleteLists, runHardDeleteUsers } from "@/lib/server/cronJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const lists = await runHardDeleteLists();
  const users = await runHardDeleteUsers();

  return Response.json({ lists, users });
}
