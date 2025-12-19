import { prisma } from "@/lib/prisma";
import * as argon2 from "argon2";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const existingUser = await prisma.user.findFirst({
      where: {
        username,
      },
    });

    if (existingUser) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const hashPass = await argon2.hash(password);

    const newUser = await prisma.user.create({
      data: {
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
        tokenVersion: newUser.tokenVersion,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
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
