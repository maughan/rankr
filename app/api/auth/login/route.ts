import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { captureServer } from "@/lib/analytics/server";
import { E } from "@/lib/analytics/events";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // const { username, password } = await req.json();

    const user = await prisma.user.findFirst({
      where: {
        email,
        // username,
      },
    });

    if (!user) return new Response("Invalid credentials", { status: 401 });

    const isValidPass = await argon2.verify(user.password, password);

    if (!isValidPass)
      return new Response("Invalid credentials", { status: 401 });

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        email: user.email,
        tokenVersion: user.tokenVersion,
        role: user.role,
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

    await captureServer(String(user.id), E.SIGNIN_COMPLETED, { user_id: user.id });

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
    return new Response("Internal server error", { status: 500 });
  }
}
