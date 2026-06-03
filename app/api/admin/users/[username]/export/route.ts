import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminViewer } from "@/lib/server/adminAuth";
import { collectUserData } from "@/lib/server/collectUserData";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const admin = await getSuperAdminViewer();
  if (!admin) return new Response(null, { status: 404 });

  const { username } = await params;

  const user = await (prisma.user as any).findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true },
  });

  if (!user) return new Response(null, { status: 404 });

  const data = await collectUserData(user.id);

  const filename = `export-${user.username}-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
