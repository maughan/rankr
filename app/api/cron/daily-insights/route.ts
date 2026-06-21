// Daily cron — recomputes taste archetypes and taste matches for all
// eligible users. Consolidates the former /archetypes and /taste-matches
// crons. Protected by CRON_SECRET.

import { runArchetypes, runTasteMatches } from "@/lib/server/cronJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const archetypes = await runArchetypes();
  const tasteMatches = await runTasteMatches();

  return Response.json({ archetypes, tasteMatches });
}
