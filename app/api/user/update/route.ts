import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { prisma } from "@/lib/prisma";
import { isReservedUsername } from "@/lib/reservedUsernames";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const RENAME_COOLDOWN_DAYS = 30;

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const biscuits = await cookies();
    const token = biscuits.get("auth_token")?.value;

    if (!token) return new Response(null, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      throw new Error("Token invalid");
    }

    const data = await req.json();
    if (data.username) data.username = (data.username as string).toLowerCase();

    const isRename = data.username && data.username !== user.username;
    if (isRename) {
      if (!USERNAME_RE.test(data.username)) {
        return new Response("Username must be 3–20 characters: letters, numbers, underscores only.", { status: 422 });
      }
      if (isReservedUsername(data.username)) {
        return new Response("That username is reserved.", { status: 422 });
      }
      const lastChanged = (user as any).username_changed_at as Date | null;
      if (lastChanged) {
        const daysSince = (Date.now() - lastChanged.getTime()) / 86_400_000;
        if (daysSince < RENAME_COOLDOWN_DAYS) {
          const daysLeft = Math.ceil(RENAME_COOLDOWN_DAYS - daysSince);
          return new Response(`You can rename again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`, { status: 429 });
        }
      }
      // Record the old username in history before overwriting
      await prisma.userUsernameHistory.create({
        data: { userId: user.id, username: user.username },
      });
    }

    // display_name: null clears it; undefined means "not sent, leave alone"
    const displayNameUpdate =
      "display_name" in data
        ? { display_name: data.display_name?.trim() || null }
        : {};
    const bioUpdate =
      "bio" in data
        ? { bio: data.bio?.trim() || null }
        : {};

    const updatedUser = await (prisma.user as any).update({
      where: {
        id: decoded.sub,
        username: decoded.username,
      },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...displayNameUpdate,
        ...bioUpdate,
        ...(isRename && {
          username: data.username,
          username_changed_at: new Date(),
        }),
      },
    });

    const newToken = jwt.sign(
      {
        sub: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        tokenVersion: updatedUser.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    biscuits.set({
      name: "auth_token",
      value: newToken,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return Response.json({ success: true });
  } catch {
    return Response.error();
  }
}
