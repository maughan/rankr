import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isReservedUsername } from "@/lib/reservedUsernames";
import { captureServer, identifyServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;
    const username = (body.username as string).toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return new Response("Username must be 3–20 characters: letters, numbers, underscores only.", { status: 422 });
    }
    if (isReservedUsername(username)) {
      return new Response("That username is reserved.", { status: 422 });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: "insensitive" } as any },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const hashPass = await argon2.hash(password);

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashPass,
      },
    });

    if (!newUser) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const token = jwt.sign(
      {
        sub: newUser.id,
        username: newUser.username,
        email: newUser.email,
        tokenVersion: newUser.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const biscuits = await cookies();

    biscuits.set({
      name: "auth_token",
      value: token,
      httpOnly: false,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    const distinctId = String(newUser.id);
    const phOps: Promise<void>[] = [
      captureServer(distinctId, E.SIGNUP_COMPLETED, {
        user_id: newUser.id,
        username: newUser.username,
      }),
      identifyServer(distinctId, {
        username: newUser.username,
        signed_up_at: newUser.createdAt.toISOString(),
      }),
    ];

    // Attribution: did this signup come via a shared link?
    const shareRefVal = biscuits.get("rankr_share_ref")?.value;
    if (shareRefVal) {
      try {
        const ref = JSON.parse(shareRefVal) as {
          listId: number;
          refUserId: number;
          visitedAt: string;
        };
        const timeToSignup = Math.round(
          (Date.now() - new Date(ref.visitedAt).getTime()) / 1000
        );
        phOps.push(
          captureServer(distinctId, E.SHARED_LINK_VISITOR_SIGNED_UP, {
            ref_list_id: ref.listId,
            ref_user_id: ref.refUserId,
            time_to_first_visit_seconds: timeToSignup,
          })
        );
        biscuits.delete("rankr_share_ref");
      } catch { /* malformed cookie — ignore */ }
    }

    await Promise.all(phOps);

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
  }
}
