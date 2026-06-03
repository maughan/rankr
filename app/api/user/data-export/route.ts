import { NextResponse } from "next/server";
import { getAuthedViewer } from "@/lib/server/auth";
import { collectUserData } from "@/lib/server/collectUserData";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// GET — stream the user's own data as a JSON download
export async function GET() {
  const viewer = await getAuthedViewer();
  if (!viewer) return new Response(null, { status: 401 });

  const data = await collectUserData(viewer.id);

  const filename = `my-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
