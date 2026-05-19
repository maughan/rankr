import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { isReservedUsername } from "@/lib/reservedUsernames";

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

    return Response.json({ success: true });
  } catch (e) {
    console.error(e);
  }
}
